from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.orm import relationship

from ..database import Base


class AccessPoint(Base):
    __tablename__ = "access_points"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)
    building = Column(String, nullable=True)
    floor = Column(String, nullable=True)
    room = Column(String, nullable=True)
    zone = Column(String, nullable=True)
    status = Column(String, nullable=False, default="active")
    required_clearance = Column(Integer, nullable=False, default=1)
    is_restricted = Column(Boolean, nullable=False, default=False)
    ip_address = Column(String, nullable=True)
    installed_at = Column(DateTime(timezone=True), nullable=True)
    description = Column(String, nullable=True)

    access_logs = relationship("AccessLog", back_populates="access_point")
    access_rules = relationship("AccessRule", back_populates="access_point")
