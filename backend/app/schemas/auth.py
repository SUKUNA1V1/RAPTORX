"""Authentication schemas."""
from typing import Optional
from pydantic import BaseModel


# Login schemas
class LoginRequest(BaseModel):
    email: str  # Use str instead of EmailStr to allow .local domains
    pin: str


class MFAVerifyRequest(BaseModel):
    mfa_token: str
    totp_code: Optional[str] = None
    backup_code: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str
    expires_in: int
    mfa_required: bool = False
    mfa_token: Optional[str] = None
    user: Optional[dict] = None


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: Optional[str] = None


class MFAEnrollRequest(BaseModel):
    password: str


class MFAEnrollResponse(BaseModel):
    secret: str
    qr_code_url: str
    backup_codes: list[str]
    mfa_token: str


class MFAVerifyEnrollRequest(BaseModel):
    mfa_token: str
    totp_code: str


class MFADisableRequest(BaseModel):
    password: str
    mfa_code: str


# User profile schema
class UserProfileResponse(BaseModel):
    id: int
    badge_id: str
    first_name: str
    last_name: str
    email: str
    role: str
    department: Optional[str]
    clearance_level: int
    mfa_enabled: bool

    class Config:
        from_attributes = True


# Device certificate schemas
class DeviceCertificateRegisterRequest(BaseModel):
    access_point_id: int
    device_name: str
    cert_fingerprint: str
    subject_dn: Optional[str] = None


class DeviceCertificateResponse(BaseModel):
    id: int
    access_point_id: int
    device_name: str
    cert_fingerprint: str
    subject_dn: Optional[str]
    status: str
    issued_at: str
    revoked_at: Optional[str]
    last_seen_at: Optional[str]

    class Config:
        from_attributes = True


# Audit log schemas
class AuditLogResponse(BaseModel):
    id: int
    admin_id: Optional[int]
    action: str
    resource_type: Optional[str]
    resource_id: Optional[int]
    details: dict
    status: str
    ip_address: Optional[str]
    created_at: str
    tamper_flag: bool

    class Config:
        from_attributes = True
