"""Device certificate endpoints for mTLS authentication."""
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from ..database import get_db
from ..models import User, AccessPoint, DeviceCertificate
from ..routes.auth import get_current_user

router = APIRouter(prefix="/api/devices", tags=["devices"])


class DeviceCertificateRegisterRequest(BaseModel):
    """Request to register a device certificate."""
    access_point_id: int
    device_name: str
    cert_fingerprint: str  # SHA256 fingerprint
    subject_dn: str  # Subject Distinguished Name


class DeviceCertificateResponse(BaseModel):
    """Device certificate response."""
    id: int
    access_point_id: int
    device_name: str
    cert_fingerprint: str
    subject_dn: str
    status: str
    issued_at: datetime
    expires_at: datetime | None
    last_seen_at: datetime | None

    class Config:
        from_attributes = True


@router.post(
    "/register",
    response_model=DeviceCertificateResponse,
    status_code=status.HTTP_201_CREATED
)
def register_device_certificate(
    request: DeviceCertificateRegisterRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Register a new device certificate for mTLS authentication.
    
    Admin users can register device certificates for access points.
    Each certificate is identified by its SHA256 fingerprint.
    """
    try:
        # Check access point exists
        access_point = db.query(AccessPoint).filter(
            AccessPoint.id == request.access_point_id
        ).first()
        if not access_point:
            raise HTTPException(
                status_code=404,
                detail="Access point not found"
            )

        # Check if certificate already registered
        existing = db.query(DeviceCertificate).filter(
            DeviceCertificate.cert_fingerprint == request.cert_fingerprint
        ).first()
        if existing:
            raise HTTPException(
                status_code=422,
                detail="Certificate fingerprint already registered"
            )

        # Create new device certificate
        device_cert = DeviceCertificate(
            access_point_id=request.access_point_id,
            device_name=request.device_name,
            cert_fingerprint=request.cert_fingerprint,
            subject_dn=request.subject_dn,
            status="active",
            issued_at=datetime.utcnow(),
        )
        db.add(device_cert)
        db.commit()
        db.refresh(device_cert)

        return device_cert

    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=str(exc)
        ) from exc


@router.get(
    "/list",
    response_model=list[DeviceCertificateResponse],
    status_code=status.HTTP_200_OK
)
def list_device_certificates(
    access_point_id: int | None = None,
    status_filter: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List device certificates with optional filters.
    Requires authentication.
    """
    try:
        query = db.query(DeviceCertificate)

        if access_point_id:
            query = query.filter(DeviceCertificate.access_point_id == access_point_id)

        if status_filter:
            query = query.filter(DeviceCertificate.status == status_filter)

        return query.all()

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get(
    "/validate",
    response_model=dict,
    status_code=status.HTTP_200_OK
)
def validate_device_certificate(
    fingerprint: str,
    db: Session = Depends(get_db),
):
    """
    Validate a device certificate by fingerprint.
    Public endpoint (used by reverse proxy).
    """
    try:
        cert = db.query(DeviceCertificate).filter(
            DeviceCertificate.cert_fingerprint == fingerprint,
            DeviceCertificate.status == "active"
        ).first()

        if not cert:
            return {
                "valid": False,
                "reason": "Certificate not found or revoked"
            }

        # Update last seen
        cert.last_seen_at = datetime.utcnow()
        db.commit()

        return {
            "valid": True,
            "device_name": cert.device_name,
            "access_point_id": cert.access_point_id,
            "access_point_name": cert.access_point.name if cert.access_point else None,
            "last_seen_at": cert.last_seen_at
        }

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.put(
    "/{cert_id}/revoke",
    response_model=DeviceCertificateResponse,
    status_code=status.HTTP_200_OK
)
def revoke_device_certificate(
    cert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Revoke a device certificate (mark as revoked).
    Requires authentication.
    """
    try:
        cert = db.query(DeviceCertificate).filter(
            DeviceCertificate.id == cert_id
        ).first()

        if not cert:
            raise HTTPException(status_code=404, detail="Certificate not found")

        cert.status = "revoked"
        cert.revoked_at = datetime.utcnow()
        db.commit()
        db.refresh(cert)

        return cert

    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get(
    "/{cert_id}",
    response_model=DeviceCertificateResponse,
    status_code=status.HTTP_200_OK
)
def get_device_certificate(
    cert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get details of a specific device certificate.
    Requires authentication.
    """
    try:
        cert = db.query(DeviceCertificate).filter(
            DeviceCertificate.id == cert_id
        ).first()

        if not cert:
            raise HTTPException(status_code=404, detail="Certificate not found")

        return cert

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
