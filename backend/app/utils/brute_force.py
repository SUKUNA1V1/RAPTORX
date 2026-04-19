"""Brute-force protection utilities."""
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from ..models import LoginAttempt
from ..config import settings


def record_login_attempt(
    db: Session,
    email: str,
    ip_address: str,
    success: bool,
) -> LoginAttempt:
    """Record a login attempt."""
    attempt = LoginAttempt(
        email=email.lower(),
        ip_address=ip_address,
        success=1 if success else 0,
        failed_count=0,
    )

    if success:
        # Clear failed attempts on success
        db.query(LoginAttempt).filter(
            LoginAttempt.email == email.lower(),
            LoginAttempt.ip_address == ip_address,
            LoginAttempt.created_at >= datetime.now(timezone.utc) - timedelta(
                minutes=settings.LOGIN_ATTEMPT_WINDOW_MINUTES
            ),
        ).delete()
    else:
        # Increment failed count
        recent_attempts = db.query(LoginAttempt).filter(
            LoginAttempt.email == email.lower(),
            LoginAttempt.ip_address == ip_address,
            LoginAttempt.created_at >= datetime.now(timezone.utc) - timedelta(
                minutes=settings.LOGIN_ATTEMPT_WINDOW_MINUTES
            ),
        ).all()

        failed_count = sum(1 for a in recent_attempts if not a.success)
        attempt.failed_count = failed_count + 1

        # Check if we should lock out
        if attempt.failed_count >= settings.MAX_LOGIN_ATTEMPTS:
            attempt.lockout_until = datetime.now(timezone.utc) + timedelta(
                minutes=settings.LOCKOUT_DURATION_MINUTES
            )

    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    return attempt


def is_account_locked(db: Session, email: str, ip_address: str) -> bool:
    """Check if account is currently locked due to brute-force."""
    recent_attempt = (
        db.query(LoginAttempt)
        .filter(
            LoginAttempt.email == email.lower(),
            LoginAttempt.ip_address == ip_address,
            LoginAttempt.lockout_until.isnot(None),
            LoginAttempt.lockout_until > datetime.now(timezone.utc),
        )
        .order_by(LoginAttempt.created_at.desc())
        .first()
    )

    return recent_attempt is not None


def get_failed_login_count(db: Session, email: str, ip_address: str) -> int:
    """Get number of failed login attempts in window."""
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(minutes=settings.LOGIN_ATTEMPT_WINDOW_MINUTES)

    attempts = (
        db.query(LoginAttempt)
        .filter(
            LoginAttempt.email == email.lower(),
            LoginAttempt.ip_address == ip_address,
            LoginAttempt.success == 0,
            LoginAttempt.created_at >= window_start,
        )
        .all()
    )

    return len(attempts)


def get_lockout_remaining_seconds(db: Session, email: str, ip_address: str) -> int:
    """Get remaining lockout time in seconds, or 0 if not locked."""
    recent_attempt = (
        db.query(LoginAttempt)
        .filter(
            LoginAttempt.email == email.lower(),
            LoginAttempt.ip_address == ip_address,
            LoginAttempt.lockout_until.isnot(None),
        )
        .order_by(LoginAttempt.created_at.desc())
        .first()
    )

    if not recent_attempt or not recent_attempt.lockout_until:
        return 0

    if recent_attempt.lockout_until <= datetime.now(timezone.utc):
        return 0

    remaining = (recent_attempt.lockout_until - datetime.now(timezone.utc)).total_seconds()
    return max(0, int(remaining))
