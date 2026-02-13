from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr


class UserBase(BaseModel):
    badge_id: str
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    role: str
    department: Optional[str] = None
    clearance_level: int
    is_active: bool = True
    pin_hash: Optional[str] = None
    last_seen_at: Optional[datetime] = None


class UserCreate(UserBase):
    pass


class UserUpdate(BaseModel):
    badge_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    clearance_level: Optional[int] = None
    is_active: Optional[bool] = None
    pin_hash: Optional[str] = None
    last_seen_at: Optional[datetime] = None


class UserResponse(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
