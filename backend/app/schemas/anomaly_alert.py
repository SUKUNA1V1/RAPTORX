from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class AnomalyAlertBase(BaseModel):
    log_id: int
    alert_type: str
    severity: str
    status: str = "open"
    is_resolved: bool = False
    description: Optional[str] = None
    confidence: Optional[float] = None
    triggered_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[int] = None
    notes: Optional[str] = None


class AnomalyAlertCreate(AnomalyAlertBase):
    pass


class AnomalyAlertUpdate(BaseModel):
    alert_type: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    is_resolved: Optional[bool] = None
    description: Optional[str] = None
    confidence: Optional[float] = None
    triggered_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[int] = None
    notes: Optional[str] = None


class AnomalyAlertResponse(AnomalyAlertBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
