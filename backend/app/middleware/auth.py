"""
Authentication Middleware
Handles JWT token validation for HTTP and WebSocket connections
"""

from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from typing import Optional, Any
import logging

from app.config import settings
from app.database import get_db
from app.models import User

logger = logging.getLogger(__name__)

security = HTTPBearer()


async def get_current_user(
    credentials: Any = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Validate JWT token and return current user.
    Used for HTTP endpoints.
    """
    token = credentials.credentials

    try:
        # Decode JWT token using python-jose (matches token creation)
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id: int = int(payload.get("sub", 0))

        if user_id == 0:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )

    except JWTError as e:
        logger.error(f"JWT decode error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    # Get user from database
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    return user


async def get_current_user_ws(token: str, db: Session) -> Optional[User]:
    """
    Validate JWT token and return current user.
    Used for WebSocket connections.
    """
    try:
        # Decode JWT token using python-jose
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id: int = int(payload.get("sub", 0))

        if user_id == 0:
            return None

    except JWTError:
        logger.warning("WebSocket token invalid")
        return None

    # Get user from database
    user = db.query(User).filter(User.id == user_id).first()

    if not user or not user.is_active:
        return None

    return user


# Note: Token creation functions are in app/utils/auth_token.py (uses python-jose)
# This file only handles token verification for middleware
