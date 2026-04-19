from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, timedelta

from ..database import Base


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    industry = Column(String, nullable=True)
    country = Column(String, nullable=True)
    timezone = Column(String, nullable=True)
    contact_email = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)
    decision_mode = Column(String, default="hard_rules", nullable=False)  # "hard_rules" or "ml_models"
    
    # ML Training tracking
    last_training_date = Column(DateTime(timezone=True), nullable=True)  # When was the last training completed
    next_retrain_date = Column(DateTime(timezone=True), nullable=True)  # When should the next auto-retrain happen (40 days from last training)
    auto_retrain_enabled = Column(Boolean, default=True, nullable=False)  # Enable/disable auto-retrain
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    buildings = relationship("Building", back_populates="organization", cascade="all, delete-orphan")
    access_policies = relationship("AccessPolicy", back_populates="organization", cascade="all, delete-orphan")
    onboarding_drafts = relationship("OnboardingDraft", back_populates="organization", cascade="all, delete-orphan")
    org_data_settings = relationship("OrgDataSetting", back_populates="organization", cascade="all, delete-orphan", uselist=False)
