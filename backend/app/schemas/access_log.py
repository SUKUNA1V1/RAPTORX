from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class AccessLogBase(BaseModel):
    user_id: Optional[int] = None
    access_point_id: Optional[int] = None
    timestamp: datetime
    decision: str
    risk_score: float
    method: Optional[str] = None
    hour: Optional[int] = None
    day_of_week: Optional[int] = None
    is_weekend: Optional[bool] = None
    access_frequency_24h: Optional[int] = None
    time_since_last_access_min: Optional[int] = None
    location_match: Optional[bool] = None
    role_level: Optional[int] = None
    is_restricted_area: Optional[bool] = None
    badge_id_used: Optional[str] = None
    context: Optional[Any] = None


class AccessLogCreate(AccessLogBase):
    pass


class AccessLogUpdate(BaseModel):
    decision: Optional[str] = None
    risk_score: Optional[float] = None
    method: Optional[str] = None
    context: Optional[Any] = None


class AccessLogResponse(AccessLogBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
