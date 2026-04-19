"""MFA (Multi-Factor Authentication) service."""
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple
from jose import jwt
from sqlalchemy.orm import Session

from ..models import User, MFASecret
from ..utils.password import verify_password
from ..utils.mfa import (
    generate_totp_secret,
    get_totp_uri,
    verify_totp_token,
    generate_backup_codes,
    hash_backup_code,
    verify_backup_code,
)
from ..utils.auth_token import create_access_token
from ..utils.audit import log_admin_action
from ..config import settings


class MFAService:
    """MFA service."""

    @staticmethod
    def create_mfa_token(user_id: int, email: str) -> str:
        """Create short-lived MFA token for step-up auth."""
        payload = {
            "sub": user_id,
            "email": email,
            "type": "mfa",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
            "iat": datetime.now(timezone.utc),
        }
        return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    @staticmethod
    def verify_mfa_token(token: str) -> Optional[dict]:
        """Verify MFA token."""
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            if payload.get("type") == "mfa":
                return payload
        except Exception:
            pass
        return None

    @staticmethod
    def enroll_mfa(
        db: Session,
        user_id: int,
        ip_address: str,
        user_agent: str,
    ) -> Tuple[str, str, list]:
        """
        Enroll user in MFA (TOTP).
        Returns (secret, qr_code_uri, backup_codes).
        """
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")

        # Check if already enrolled
        existing = db.query(MFASecret).filter(MFASecret.user_id == user_id).first()
        if existing and existing.enabled_at:
            raise ValueError("MFA already enrolled for this user")

        # Generate secret and backup codes
        secret = generate_totp_secret()
        backup_codes = generate_backup_codes()

        # Create or update MFA secret record
        if existing:
            existing.secret = secret
            existing.backup_codes_hash = [hash_backup_code(code) for code in backup_codes]
            existing.enabled_at = None
            existing.disabled_at = None
        else:
            mfa_secret = MFASecret(
                user_id=user_id,
                secret=secret,
                backup_codes_hash=[hash_backup_code(code) for code in backup_codes],
            )
            db.add(mfa_secret)

        db.commit()

        # Generate QR code URI
        qr_uri = get_totp_uri(secret, user.email)

        # Log MFA enrollment started
        log_admin_action(
            db,
            admin_id=user_id,
            action="mfa_enroll_start",
            status="success",
            ip_address=ip_address,
            user_agent=user_agent,
        )

        return secret, qr_uri, backup_codes

    @staticmethod
    def verify_mfa_enrollment(
        db: Session,
        user_id: int,
        mfa_token: str,
        totp_code: str,
        ip_address: str,
        user_agent: str,
    ) -> str:
        """
        Verify TOTP code during MFA enrollment.
        Returns access token on success.
        """
        # Verify MFA token is valid
        mfa_payload = MFAService.verify_mfa_token(mfa_token)
        if not mfa_payload or int(mfa_payload.get("sub", 0)) != user_id:
            raise ValueError("Invalid MFA token")

        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")

        mfa_secret = db.query(MFASecret).filter(MFASecret.user_id == user_id).first()
        if not mfa_secret:
            raise ValueError("MFA secret not found")

        # Verify TOTP code
        if not verify_totp_token(mfa_secret.secret, totp_code):
            raise ValueError("Invalid TOTP code")

        # Enable MFA
        mfa_secret.enabled_at = datetime.now(timezone.utc)
        user.mfa_enabled = True
        db.commit()

        # Log MFA enrollment complete
        log_admin_action(
            db,
            admin_id=user_id,
            action="mfa_enroll_verify",
            status="success",
            ip_address=ip_address,
            user_agent=user_agent,
        )

        # Return access token
        access_token = create_access_token(
            user_id=user.id,
            email=user.email,
            role=user.role,
            mfa_verified=True,
        )
        return access_token

    @staticmethod
    def verify_mfa_login(
        db: Session,
        user_id: int,
        mfa_token: str,
        totp_code: Optional[str] = None,
        backup_code: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Tuple[str, str]:
        """
        Verify TOTP or backup code during login.
        Returns (access_token, refresh_token).
        """
        # Verify MFA token is valid
        mfa_payload = MFAService.verify_mfa_token(mfa_token)
        if not mfa_payload or int(mfa_payload.get("sub", 0)) != user_id:
            raise ValueError("Invalid MFA token")

        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active:
            raise ValueError("User not found or inactive")

        mfa_secret = db.query(MFASecret).filter(MFASecret.user_id == user_id).first()
        if not mfa_secret or not mfa_secret.enabled_at:
            raise ValueError("MFA not enabled")

        verified = False

        # Try TOTP
        if totp_code:
            if verify_totp_token(mfa_secret.secret, totp_code):
                verified = True
        # Try backup code
        elif backup_code:
            # Check if backup code matches any hash
            for i, code_hash in enumerate(mfa_secret.backup_codes_hash):
                if verify_backup_code(code_hash, backup_code):
                    verified = True
                    # Remove used backup code by replacing with None or marking
                    mfa_secret.backup_codes_hash[i] = None
                    db.commit()
                    break

        if not verified:
            raise ValueError("Invalid TOTP or backup code")

        # Create tokens
        from .auth import AuthService
        
        access_token = create_access_token(
            user_id=user.id,
            email=user.email,
            role=user.role,
            mfa_verified=True,
        )
        
        _, token_hash, expires_at = create_token_payload = (lambda: (
            __import__('secrets').token_urlsafe(32),
            __import__('hashlib').sha256(__import__('secrets').token_urlsafe(32).encode()).hexdigest(),
            datetime.now(timezone.utc) + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
        ))()
        
        # Import here to avoid circular dependency
        from ..utils.auth_token import create_refresh_token_payload, hash_token
        
        refresh_token, token_hash, expires_at = create_refresh_token_payload(
            user_id=user.id,
            email=user.email,
        )

        # Store refresh token
        from ..models import RefreshToken
        db_refresh_token = RefreshToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        db.add(db_refresh_token)
        db.commit()

        # Log successful MFA verification
        log_admin_action(
            db,
            admin_id=user_id,
            action="mfa_verify_login",
            status="success",
            ip_address=ip_address,
            user_agent=user_agent,
        )

        return access_token, refresh_token

    @staticmethod
    def disable_mfa(
        db: Session,
        user_id: int,
        password: str,
        mfa_code: str,
        ip_address: str,
        user_agent: str,
    ) -> None:
        """Disable MFA for user."""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")

        # Verify password
        from ..utils.password import verify_password
        if not verify_password(password, user.pin_hash):
            raise ValueError("Invalid password")

        # Verify MFA code
        mfa_secret = db.query(MFASecret).filter(MFASecret.user_id == user_id).first()
        if not mfa_secret or not verify_totp_token(mfa_secret.secret, mfa_code):
            raise ValueError("Invalid MFA code")

        # Disable MFA
        mfa_secret.disabled_at = datetime.now(timezone.utc)
        user.mfa_enabled = False
        db.commit()

        # Log MFA disable
        log_admin_action(
            db,
            admin_id=user_id,
            action="mfa_disable",
            status="success",
            ip_address=ip_address,
            user_agent=user_agent,
        )
