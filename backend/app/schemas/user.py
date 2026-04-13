from datetime import datetime
from typing import Annotated, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator


class UserBase(BaseModel):
    badge_id: str
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    role: str
    department: Optional[str] = None
    clearance_level: int
    is_active: bool = True
    pin_hash: Optional[str] = None
    last_seen_at: Optional[datetime] = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        """Validate email format, allowing reserved domains like .local"""
        if not v or "@" not in v:
            raise ValueError("Invalid email format")
        local, domain = v.rsplit("@", 1)
        if not local or not domain or "." not in domain:
            raise ValueError("Invalid email format")
        return v


class UserCreate(UserBase):
    pass


class UserUpdate(BaseModel):
    badge_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    clearance_level: Optional[int] = None
    is_active: Optional[bool] = None
    pin_hash: Optional[str] = None
    last_seen_at: Optional[datetime] = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        """Validate email format, allowing reserved domains like .local"""
        if v is None:
            return v
        if "@" not in v:
            raise ValueError("Invalid email format")
        local, domain = v.rsplit("@", 1)
        if not local or not domain or "." not in domain:
            raise ValueError("Invalid email format")
        return v


class UserResponse(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
