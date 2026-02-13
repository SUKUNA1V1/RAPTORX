from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class AccessPointBase(BaseModel):
    name: str
    type: str
    building: Optional[str] = None
    floor: Optional[str] = None
    room: Optional[str] = None
    zone: Optional[str] = None
    status: str = "active"
    required_clearance: int = 1
    is_restricted: bool = False
    ip_address: Optional[str] = None
    installed_at: Optional[datetime] = None
    description: Optional[str] = None


class AccessPointCreate(AccessPointBase):
    pass


class AccessPointUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    building: Optional[str] = None
    floor: Optional[str] = None
    room: Optional[str] = None
    zone: Optional[str] = None
    status: Optional[str] = None
    required_clearance: Optional[int] = None
    is_restricted: Optional[bool] = None
    ip_address: Optional[str] = None
    installed_at: Optional[datetime] = None
    description: Optional[str] = None


class AccessPointResponse(AccessPointBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
