from sqlalchemy import Boolean, Column, DateTime, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base


class DeviceCertificate(Base):
    __tablename__ = "device_certificates"

    id = Column(Integer, primary_key=True, index=True)
    access_point_id = Column(Integer, ForeignKey("access_points.id", ondelete="CASCADE"), nullable=False, index=True)
    device_name = Column(String, nullable=False)
    cert_fingerprint = Column(String, nullable=False, unique=True, index=True)  # SHA256
    subject_dn = Column(String, nullable=True)
    status = Column(String, nullable=False, default="active")  # active, revoked, expired
    issued_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    last_seen_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    access_point = relationship("AccessPoint", backref="device_certificates")
