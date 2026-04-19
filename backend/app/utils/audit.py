"""Audit logging utilities with tamper-evident hash chaining."""
import json
import hashlib
from datetime import datetime, timezone
from typing import Any, Optional
from sqlalchemy.orm import Session

from ..models import AuditLog, User


def canonical_json(obj: Any) -> str:
    """Serialize to canonical JSON (sorted keys, no whitespace)."""
    return json.dumps(obj, sort_keys=True, separators=(',', ':'), default=str)


def compute_entry_hash(prev_hash: Optional[str], payload: Any) -> str:
    """Compute SHA256 hash for audit entry: sha256(prev_hash + canonical_json(payload))."""
    canonical = canonical_json(payload)
    if prev_hash:
        combined = prev_hash + canonical
    else:
        combined = canonical
    return hashlib.sha256(combined.encode()).hexdigest()


def log_admin_action(
    db: Session,
    admin_id: Optional[int],
    action: str,
    resource_type: Optional[str] = None,
    resource_id: Optional[int] = None,
    details: Optional[dict] = None,
    status: str = "success",
    error_message: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> AuditLog:
    """Log an admin action with tamper-evident hash chaining."""
    if details is None:
        details = {}

    # Get previous entry's hash for chain
    last_entry = db.query(AuditLog).order_by(AuditLog.id.desc()).first()
    prev_hash = last_entry.entry_hash if last_entry else None

    payload = {
        "action": action,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "details": details,
        "status": status,
    }

    entry_hash = compute_entry_hash(prev_hash, payload)

    audit_entry = AuditLog(
        admin_id=admin_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details,
        status=status,
        error_message=error_message,
        ip_address=ip_address,
        user_agent=user_agent,
        entry_hash=entry_hash,
        prev_entry_hash=prev_hash,
        tamper_flag=False,
    )

    db.add(audit_entry)
    db.commit()
    db.refresh(audit_entry)
    return audit_entry


def verify_audit_log_integrity(db: Session) -> tuple[bool, Optional[int]]:
    """
    Verify audit log integrity by checking hash chain.
    Returns (is_valid, first_broken_entry_id).
    """
    entries = db.query(AuditLog).order_by(AuditLog.id.asc()).all()

    if not entries:
        return True, None

    for i, entry in enumerate(entries):
        payload = {
            "action": entry.action,
            "resource_type": entry.resource_type,
            "resource_id": entry.resource_id,
            "details": entry.details,
            "status": entry.status,
        }

        expected_hash = compute_entry_hash(entry.prev_entry_hash, payload)

        if expected_hash != entry.entry_hash:
            # Mark as tampered
            entry.tamper_flag = True
            db.commit()
            return False, entry.id

    return True, None


def get_audit_log_chain(db: Session, entry_id: int, depth: int = 5) -> list:
    """Get chain of audit entries leading up to given entry."""
    entries = []
    current_id = entry_id

    for _ in range(depth):
        entry = db.query(AuditLog).filter(AuditLog.id == current_id).first()
        if not entry:
            break
        entries.insert(0, entry)
        if entry.prev_entry_hash is None:
            break
        # Find entry with this hash
        prev_entry = (
            db.query(AuditLog)
            .filter(AuditLog.entry_hash == entry.prev_entry_hash)
            .first()
        )
        if not prev_entry:
            break
        current_id = prev_entry.id

    return entries
