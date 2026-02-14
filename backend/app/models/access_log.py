from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from ..database import Base


class AccessLog(Base):
    __tablename__ = "access_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    access_point_id = Column(Integer, ForeignKey("access_points.id"), nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False)
    decision = Column(String, nullable=False)
    risk_score = Column(Float, nullable=False, default=0.0)
    method = Column(String, nullable=True)
    hour = Column(Integer, nullable=True)
    day_of_week = Column(Integer, nullable=True)
    is_weekend = Column(Boolean, nullable=True)
    access_frequency_24h = Column(Integer, nullable=True)
    time_since_last_access_min = Column(Integer, nullable=True)
    location_match = Column(Boolean, nullable=True)
    role_level = Column(Integer, nullable=True)
    is_restricted_area = Column(Boolean, nullable=True)
    is_first_access_today = Column(Boolean, nullable=True)
    sequential_zone_violation = Column(Boolean, nullable=True)
    access_attempt_count = Column(Integer, nullable=True)
    time_of_week = Column(Integer, nullable=True)
    hour_deviation_from_norm = Column(Float, nullable=True)
    badge_id_used = Column(String, nullable=True)
    context = Column(JSONB, nullable=True)

    user = relationship("User", back_populates="access_logs")
    access_point = relationship("AccessPoint", back_populates="access_logs")
    anomaly_alert = relationship("AnomalyAlert", back_populates="access_log", uselist=False)
