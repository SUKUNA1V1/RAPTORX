from pydantic import BaseModel, EmailStr, field_validator
from typing import List, Optional, Dict, Any
from datetime import datetime


# Organization Schemas
class OrganizationCreate(BaseModel):
    name: str
    industry: Optional[str] = None
    country: Optional[str] = None
    timezone: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None


class OrganizationResponse(BaseModel):
    id: int
    name: str
    industry: Optional[str]
    country: Optional[str]
    timezone: Optional[str]
    contact_email: Optional[str]
    contact_phone: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# Building Schemas
class BuildingCreate(BaseModel):
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    zip: Optional[str] = None


class BuildingResponse(BaseModel):
    id: int
    org_id: int
    name: str
    address: Optional[str]
    city: Optional[str]
    state: Optional[str]
    country: Optional[str]
    zip: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# Floor Schemas
class FloorCreate(BaseModel):
    floor_number: int
    name: Optional[str] = None
    total_rooms: Optional[int] = None


class FloorResponse(BaseModel):
    id: int
    building_id: int
    floor_number: int
    name: Optional[str]
    total_rooms: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}


# Zone Schemas
class ZoneCreate(BaseModel):
    name: str
    security_level: int = 1
    description: Optional[str] = None

    @field_validator('security_level')
    @classmethod
    def validate_security_level(cls, v: int) -> int:
        if v not in [1, 2, 3]:
            raise ValueError('security_level must be 1, 2, or 3')
        return v


class ZoneResponse(BaseModel):
    id: int
    floor_id: int
    name: str
    security_level: int
    description: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# Room Schemas
class RoomCreate(BaseModel):
    name: str
    room_number: Optional[str] = None
    capacity: Optional[int] = None


class RoomResponse(BaseModel):
    id: int
    zone_id: int
    name: str
    room_number: Optional[str]
    capacity: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}


# AccessPolicy Schemas
class AccessPolicyCreate(BaseModel):
    name: str
    description: Optional[str] = None
    base_clearance: int = 1
    deny_overrides_allow: bool = False
    two_person_required: bool = False
    step_up_required_risk: Optional[float] = None

    @field_validator('base_clearance')
    @classmethod
    def validate_clearance(cls, v: int) -> int:
        if v not in [1, 2, 3]:
            raise ValueError('base_clearance must be 1, 2, or 3')
        return v

    @field_validator('step_up_required_risk')
    @classmethod
    def validate_risk_score(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and (v < 0.0 or v > 1.0):
            raise ValueError('step_up_required_risk must be between 0.0 and 1.0')
        return v


class AccessPolicyResponse(BaseModel):
    id: int
    org_id: int
    name: str
    description: Optional[str]
    base_clearance: int
    deny_overrides_allow: bool
    two_person_required: bool
    step_up_required_risk: Optional[float]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# Onboarding Step Schemas
class OnboardingStep1Payload(BaseModel):
    """Company Profile Step"""
    company_name: str
    industry: Optional[str] = None
    country: Optional[str] = None
    timezone: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None


class OnboardingStep2Payload(BaseModel):
    """Identity & Roles Step"""
    initial_admins: List[Dict[str, str]]  # [{email, password, first_name, last_name}, ...]

    @field_validator('initial_admins')
    @classmethod
    def validate_admins(cls, v: List[Dict[str, str]]) -> List[Dict[str, str]]:
        if len(v) == 0:
            raise ValueError('At least one admin must be specified')
        for admin in v:
            if not admin.get('email') or not admin.get('password'):
                raise ValueError('Each admin must have email and password')
        return v


class OnboardingStep3Payload(BaseModel):
    """Buildings & Zones Step"""
    buildings: List[Dict[str, Any]]  # [{name, address, floors: [{floor_number, zones: [...]}]}, ...]


class OnboardingStep4Payload(BaseModel):
    """Access Points Step"""
    access_points: List[Dict[str, Any]]  # [{name, type, building, floor, room, zone, required_clearance, is_restricted}, ...]


class OnboardingStep5Payload(BaseModel):
    """Policies Step"""
    access_policies: List[AccessPolicyCreate]


class OnboardingStep6Payload(BaseModel):
    """Data & Baseline Step"""
    pii_masking_enabled: bool = False
    retention_days: int = 90


class OnboardingStep7Payload(BaseModel):
    """Review & Apply Step"""
    confirm_apply: bool


class OnboardingDraftRequest(BaseModel):
    """Save draft request"""
    step_number: int
    draft_data: Dict[str, Any]

    @field_validator('step_number')
    @classmethod
    def validate_step(cls, v: int) -> int:
        if v not in range(1, 8):
            raise ValueError('step_number must be between 1 and 7')
        return v


class OnboardingDraftResponse(BaseModel):
    """Draft response"""
    id: int
    org_id: Optional[int]
    step_number: int
    draft_data: Dict[str, Any]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class OnboardingStatusResponse(BaseModel):
    """Onboarding status"""
    current_step: int
    has_draft: bool
    completion_percentage: float
    errors: List[str] = []


class CSVImportPreview(BaseModel):
    """CSV import preview before confirmation"""
    total_rows: int
    valid_rows: int
    invalid_rows: int
    validation_errors: List[Dict[str, Any]]
    preview_data: List[Dict[str, Any]]


class CSVImportResult(BaseModel):
    """CSV import result after confirmation"""
    success: bool
    imported_count: int
    failed_count: int
    errors: List[str] = []
    message: str
