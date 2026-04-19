"""Authentication endpoints with JWT, MFA, and security hardening."""
from fastapi import APIRouter, Depends, HTTPException, status, Header, Request
from sqlalchemy.orm import Session
from io import BytesIO
import base64
import qrcode

from ..database import get_db
from ..models import User, RefreshToken
from ..schemas.auth import (
    LoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    LogoutRequest,
    MFAEnrollRequest,
    MFAEnrollResponse,
    MFAVerifyEnrollRequest,
    MFADisableRequest,
    MFAVerifyRequest,
    UserProfileResponse,
)
from ..services.auth import AuthService, AuthenticationError
from ..services.mfa import MFAService
from ..utils.auth_token import verify_access_token, verify_token, hash_token
from ..config import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])


def get_client_info(request: Request) -> tuple[str, str]:
    """Extract client IP and user agent from request."""
    ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    return ip, user_agent


def get_current_user(
    authorization: str = Header(None),
    db: Session = Depends(get_db),
) -> User:
    """Get current authenticated user from JWT token."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")

    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise ValueError()
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    payload = verify_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.query(User).filter(User.id == int(payload.sub)).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    return user


@router.post("/login", response_model=TokenResponse)
def login(
    request: Request,
    credentials: LoginRequest,
    db: Session = Depends(get_db),
):
    """
    Login with email and PIN.
    
    Returns:
    - If MFA not enabled: access_token, refresh_token, user profile
    - If MFA enabled: mfa_token, mfa_required=true (user must call /api/auth/mfa/verify)
    """
    ip, user_agent = get_client_info(request)

    try:
        user, access_token, token_or_mfa = AuthService.authenticate_user(
            db=db,
            email=credentials.email,
            pin=credentials.pin,
            ip_address=ip,
            user_agent=user_agent,
        )
    except AuthenticationError as e:
        raise HTTPException(status_code=401, detail=str(e))

    if user.mfa_enabled and not access_token:
        # MFA required - token_or_mfa contains mfa_token
        return TokenResponse(
            access_token="",
            token_type="Bearer",
            expires_in=0,
            mfa_required=True,
            mfa_token=token_or_mfa,
        )
    else:
        # Success - token_or_mfa contains refresh_token
        return TokenResponse(
            access_token=access_token,
            refresh_token=token_or_mfa,
            token_type="Bearer",
            expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user={
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role,
                "mfa_enabled": user.mfa_enabled,
            },
        )


@router.post("/mfa/verify", response_model=TokenResponse)
def verify_mfa(
    request: Request,
    mfa_data: MFAVerifyRequest,
    db: Session = Depends(get_db),
):
    """
    Verify MFA code during login (TOTP or backup code).
    
    Requires: mfa_token from login response, and either totp_code or backup_code.
    Returns: access_token, refresh_token, user profile.
    """
    ip, user_agent = get_client_info(request)

    # Verify MFA token
    mfa_payload = MFAService.verify_mfa_token(mfa_data.mfa_token)
    if not mfa_payload:
        raise HTTPException(status_code=401, detail="Invalid or expired MFA token")

    user_id = int(mfa_payload.get("sub", 0))

    try:
        access_token, refresh_token = MFAService.verify_mfa_login(
            db=db,
            user_id=user_id,
            mfa_token=mfa_data.mfa_token,
            totp_code=mfa_data.totp_code,
            backup_code=mfa_data.backup_code,
            ip_address=ip,
            user_agent=user_agent,
        )
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    user = db.query(User).filter(User.id == user_id).first()

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="Bearer",
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user={
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role,
            "mfa_enabled": user.mfa_enabled,
        },
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh_token_endpoint(
    request: Request,
    refresh_data: RefreshTokenRequest,
    db: Session = Depends(get_db),
):
    """
    Refresh access token using refresh token.
    
    Implements rotating refresh tokens:
    - Old refresh token is marked as rotated
    - New refresh token is issued
    - Token reuse is detected and triggers security alert
    """
    ip, user_agent = get_client_info(request)

    try:
        access_token, new_refresh_token = AuthService.refresh_access_token(
            db=db,
            refresh_token=refresh_data.refresh_token,
            ip_address=ip,
            user_agent=user_agent,
        )
    except AuthenticationError as e:
        raise HTTPException(status_code=401, detail=str(e))

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="Bearer",
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/logout")
def logout(
    request: Request,
    logout_data: LogoutRequest,
    db: Session = Depends(get_db),
):
    """Logout by revoking refresh token."""
    ip, user_agent = get_client_info(request)

    if logout_data.refresh_token:
        AuthService.logout(
            db=db,
            refresh_token=logout_data.refresh_token,
            ip_address=ip,
            user_agent=user_agent,
        )

    return {"message": "Logout successful"}


@router.post("/logout-all")
def logout_all_sessions(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Logout all sessions by revoking all refresh tokens."""
    ip, user_agent = get_client_info(request)

    AuthService.logout_all_sessions(
        db=db,
        user_id=current_user.id,
        ip_address=ip,
        user_agent=user_agent,
    )

    return {"message": "All sessions logged out"}


@router.get("/profile", response_model=UserProfileResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    """Get current user profile."""
    return UserProfileResponse.model_validate(current_user)


@router.post("/mfa/enroll", response_model=MFAEnrollResponse)
def enroll_mfa(
    request: Request,
    mfa_request: MFAEnrollRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Enroll in MFA (TOTP).
    
    Returns:
    - secret: TOTP secret (for manual entry if needed)
    - qr_code_url: Data URI for QR code (for scanning with authenticator app)
    - backup_codes: List of backup codes (for recovery)
    - mfa_token: Token needed for MFA verification
    """
    from ..utils.password import verify_password

    # Verify password before allowing MFA enrollment
    if not verify_password(mfa_request.password, current_user.pin_hash):
        raise HTTPException(status_code=401, detail="Invalid password")

    ip, user_agent = get_client_info(request)

    try:
        secret, qr_uri, backup_codes = MFAService.enroll_mfa(
            db=db,
            user_id=current_user.id,
            ip_address=ip,
            user_agent=user_agent,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Generate QR code image
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(qr_uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    # Convert to base64 data URI
    buf = BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    qr_code_url = f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode()}"

    # Create MFA token for verification
    mfa_token = MFAService.create_mfa_token(current_user.id, current_user.email)

    return MFAEnrollResponse(
        secret=secret,
        qr_code_url=qr_code_url,
        backup_codes=backup_codes,
        mfa_token=mfa_token,
    )


@router.post("/mfa/verify-enroll")
def verify_mfa_enrollment(
    request: Request,
    mfa_verify: MFAVerifyEnrollRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Verify TOTP code during MFA enrollment."""
    ip, user_agent = get_client_info(request)

    try:
        access_token = MFAService.verify_mfa_enrollment(
            db=db,
            user_id=current_user.id,
            mfa_token=mfa_verify.mfa_token,
            totp_code=mfa_verify.totp_code,
            ip_address=ip,
            user_agent=user_agent,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "message": "MFA enrollment verified",
        "access_token": access_token,
        "token_type": "Bearer",
    }


@router.post("/mfa/disable")
def disable_mfa(
    request: Request,
    mfa_disable: MFADisableRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Disable MFA for current user (requires password + MFA code)."""
    ip, user_agent = get_client_info(request)

    try:
        MFAService.disable_mfa(
            db=db,
            user_id=current_user.id,
            password=mfa_disable.password,
            mfa_code=mfa_disable.mfa_code,
            ip_address=ip,
            user_agent=user_agent,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"message": "MFA disabled"}
