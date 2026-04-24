"""CSRF protection middleware for FastAPI.

Provides token-based CSRF protection for state-changing requests (POST, PUT, DELETE, PATCH).
Tokens are validated on the X-CSRF-Token header.
"""
import secrets
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

# Store of active CSRF tokens (in production, use Redis or session storage)
_CSRF_TOKENS = set()
_CSRF_TOKEN_SEED = secrets.token_hex(32)

# Protected methods that require CSRF token
PROTECTED_METHODS = {"POST", "PUT", "DELETE", "PATCH"}

# Endpoints that bypass CSRF check (login, token refresh, etc.)
CSRF_BYPASS_PATHS = {
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/refresh",
    "/api/auth/logout",
    "/api/auth/csrf-token",
    "/health",
    "/docs",
    "/openapi.json",
    "/redoc",
}


class CSRFMiddleware(BaseHTTPMiddleware):
    """Middleware to enforce CSRF token validation on state-changing requests."""
    
    async def dispatch(self, request: Request, call_next):
        """
        Validate CSRF token for protected methods.
        
        Logic:
        1. Check if method is protected (POST, PUT, DELETE, PATCH)
        2. Check if path is in bypass list
        3. If protected and not bypassed, require X-CSRF-Token header
        4. Validate token matches session or issuer
        """
        method = request.method
        path = request.url.path
        
        # Skip CSRF check for safe methods
        if method not in PROTECTED_METHODS:
            return await call_next(request)
        
        # Skip CSRF check for bypass paths
        if any(path.startswith(bypass) for bypass in CSRF_BYPASS_PATHS):
            return await call_next(request)
        
        # Require CSRF token for protected methods
        csrf_token = request.headers.get("X-CSRF-Token")
        
        if not csrf_token:
            logger.warning(
                f"CSRF token missing for {method} {path} from {request.client.host}"
            )
            return JSONResponse(
                status_code=403,
                content={"error": "CSRF token required", "detail": "X-CSRF-Token header missing"},
            )
        
        # Validate token (in production, check against session store or validate signature)
        if not _validate_csrf_token(csrf_token):
            logger.warning(
                f"CSRF token invalid for {method} {path} from {request.client.host}"
            )
            return JSONResponse(
                status_code=403,
                content={"error": "CSRF token invalid", "detail": "Invalid or expired token"},
            )
        
        # Token is valid, proceed with request
        response = await call_next(request)
        return response


def generate_csrf_token() -> str:
    """Generate a new CSRF token."""
    token = secrets.token_urlsafe(32)
    _CSRF_TOKENS.add(token)
    return token


def _validate_csrf_token(token: str) -> bool:
    """
    Validate a CSRF token.
    
    In production, this should:
    1. Check against session store
    2. Verify token signature/timestamp
    3. Handle token rotation
    
    For now, we accept recently generated tokens.
    """
    if not token:
        return False
    
    # Accept token if in store (simple validation)
    is_valid = token in _CSRF_TOKENS
    
    if is_valid:
        # Remove token after use (one-time use)
        _CSRF_TOKENS.discard(token)
    
    return is_valid
