from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Time
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base


class AccessRule(Base):
    __tablename__ = "access_rules"

    id = Column(Integer, primary_key=True, index=True)
    access_point_id = Column(Integer, ForeignKey("access_points.id"), nullable=False)
    role = Column(String, nullable=True)
    department = Column(String, nullable=True)
    min_clearance = Column(Integer, nullable=True)
    allowed_days = Column(String, nullable=True)
    time_start = Column(Time, nullable=True)
    time_end = Column(Time, nullable=True)
    max_daily_accesses = Column(Integer, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    access_point = relationship("AccessPoint", back_populates="access_rules")
