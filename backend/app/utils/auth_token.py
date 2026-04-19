"""JWT token utilities for auth."""
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, Any
from jose import JWTError, jwt
from pydantic import BaseModel

from ..config import settings


class TokenPayload(BaseModel):
    """JWT token payload."""
    sub: str  # User ID as string (JWT spec)
    email: str
    role: str
    type: str  # "access" or "refresh"
    exp: datetime
    iat: datetime
    mfa_verified: bool = False
    mfa_token: Optional[str] = None  # For MFA-pending sessions


def create_access_token(
    user_id: int,
    email: str,
    role: str,
    expires_delta: Optional[timedelta] = None,
    mfa_verified: bool = False,
) -> str:
    """Create JWT access token."""
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)

    expire = datetime.now(timezone.utc) + expires_delta
    payload = {
        "sub": str(user_id),  # JWT spec requires 'sub' to be a string
        "email": email,
        "role": role,
        "type": "access",
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "mfa_verified": mfa_verified,
    }
    encoded = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded


def create_refresh_token() -> str:
    """Generate a secure refresh token (high-entropy random)."""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    """Hash a refresh token for DB storage."""
    return hashlib.sha256(token.encode()).hexdigest()


def create_refresh_token_payload(
    user_id: int,
    email: str,
    expires_delta: Optional[timedelta] = None,
) -> tuple[str, str, datetime]:
    """Create refresh token and return (token_plain, token_hash, expiry)."""
    if expires_delta is None:
        expires_delta = timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)

    token = create_refresh_token()
    token_hash = hash_token(token)
    expires_at = datetime.now(timezone.utc) + expires_delta

    return token, token_hash, expires_at


def verify_token(token: str) -> Optional[TokenPayload]:
    """Verify and decode JWT token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return TokenPayload(**payload)
    except JWTError:
        return None


def verify_access_token(token: str) -> Optional[TokenPayload]:
    """Verify access token and ensure it's not a refresh token."""
    payload = verify_token(token)
    if payload and payload.type == "access":
        return payload
    return None


def verify_refresh_token(token: str) -> Optional[TokenPayload]:
    """Verify refresh token and ensure it's not an access token."""
    payload = verify_token(token)
    if payload and payload.type == "refresh":
        return payload
    return None
