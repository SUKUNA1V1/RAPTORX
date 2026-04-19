"""MFA utilities for TOTP and backup codes."""
import secrets
import hashlib
from typing import Tuple, List
import pyotp

from .password import hash_password, verify_password


def generate_totp_secret() -> str:
    """Generate a new TOTP secret."""
    return pyotp.random_base32()


def get_totp_uri(secret: str, email: str, issuer: str = "RaptorX") -> str:
    """Get OTPAuth URI for QR code generation."""
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=email, issuer_name=issuer)


def verify_totp_token(secret: str, token: str) -> bool:
    """Verify TOTP token. Allows ±1 time window for clock skew."""
    try:
        totp = pyotp.TOTP(secret)
        return totp.verify(token, valid_window=1)
    except Exception:
        return False


def generate_backup_codes(count: int = 10) -> List[str]:
    """Generate backup codes (8-character alphanumeric)."""
    codes = []
    for _ in range(count):
        code = secrets.token_hex(4).upper()
        codes.append(code)
    return codes


def hash_backup_code(code: str) -> str:
    """Hash a backup code for DB storage."""
    return hash_password(code)


def verify_backup_code(stored_hash: str, code: str) -> bool:
    """Verify a backup code against stored hash."""
    return verify_password(code, stored_hash)


def format_backup_codes_for_display(codes: List[str]) -> str:
    """Format backup codes for user display."""
    formatted = "\n".join([f"{i+1}. {code}" for i, code in enumerate(codes)])
    return formatted
