from datetime import datetime, time
from typing import Optional

from pydantic import BaseModel, ConfigDict


class AccessRuleBase(BaseModel):
    access_point_id: int
    role: Optional[str] = None
    department: Optional[str] = None
    min_clearance: Optional[int] = None
    allowed_days: Optional[str] = None
    time_start: Optional[time] = None
    time_end: Optional[time] = None
    max_daily_accesses: Optional[int] = None
    is_active: bool = True
    description: Optional[str] = None


class AccessRuleCreate(AccessRuleBase):
    pass


class AccessRuleUpdate(BaseModel):
    role: Optional[str] = None
    department: Optional[str] = None
    min_clearance: Optional[int] = None
    allowed_days: Optional[str] = None
    time_start: Optional[time] = None
    time_end: Optional[time] = None
    max_daily_accesses: Optional[int] = None
    is_active: Optional[bool] = None
    description: Optional[str] = None


class AccessRuleResponse(AccessRuleBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
