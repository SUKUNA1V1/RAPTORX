from sqlalchemy import Boolean, Column, DateTime, Integer, String, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String, nullable=False)  # login, token_refresh, logout, user_create, user_update, role_change, password_change, rule_change, model_change, threshold_change, export
    resource_type = Column(String, nullable=True)  # user, admin, rule, model, etc.
    resource_id = Column(Integer, nullable=True)
    details = Column(JSON, nullable=False)  # Canonical JSON payload
    status = Column(String, nullable=False, default="success")  # success, failure
    error_message = Column(Text, nullable=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    entry_hash = Column(String, nullable=False, index=True)  # SHA256(prev_hash + canonical_json(payload))
    prev_entry_hash = Column(String, nullable=True)  # Reference to previous entry for chain
    tamper_flag = Column(Boolean, nullable=False, default=False)  # Set if hash chain is broken
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    admin = relationship("User", backref="audit_logs")
