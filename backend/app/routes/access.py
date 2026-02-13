from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..models import AccessLog
from ..services import AccessService


router = APIRouter(prefix="/access", tags=["access"])


class AccessRequest(BaseModel):
    badge_id: str
    access_point_id: int
    timestamp: datetime


class AccessDecisionResponse(BaseModel):
    decision: str
    risk_score: float
    log_id: Optional[int]
    reason: str


@router.post("/request", response_model=AccessDecisionResponse, status_code=status.HTTP_200_OK)
def request_access(payload: AccessRequest, db: Session = Depends(get_db)):
    """Process an access request and return a decision."""
    try:
        service = AccessService(db)
        decision, risk_score, log_id, reason = service.process_access_request(
            badge_id=payload.badge_id,
            access_point_id=payload.access_point_id,
            timestamp=payload.timestamp,
        )
        return AccessDecisionResponse(
            decision=decision,
            risk_score=risk_score,
            log_id=log_id,
            reason=reason,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/logs", status_code=status.HTTP_200_OK)
def list_access_logs(
    user_id: Optional[int] = None,
    access_point_id: Optional[int] = None,
    decision: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List access logs with optional filters."""
    try:
        query = db.query(AccessLog).options(
            joinedload(AccessLog.user), joinedload(AccessLog.access_point)
        )
        if user_id:
            query = query.filter(AccessLog.user_id == user_id)
        if access_point_id:
            query = query.filter(AccessLog.access_point_id == access_point_id)
        if decision:
            query = query.filter(AccessLog.decision == decision)
        if date_from:
            query = query.filter(AccessLog.timestamp >= date_from)
        if date_to:
            query = query.filter(AccessLog.timestamp <= date_to)

        logs = query.order_by(AccessLog.timestamp.desc()).offset(skip).limit(limit).all()
        results = []
        for log in logs:
            results.append(
                {
                    "id": log.id,
                    "timestamp": log.timestamp,
                    "decision": log.decision,
                    "risk_score": log.risk_score,
                    "user_id": log.user_id,
                    "access_point_id": log.access_point_id,
                    "user_name": f"{log.user.first_name} {log.user.last_name}" if log.user else None,
                    "access_point_name": log.access_point.name if log.access_point else None,
                }
            )
        return results
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/logs/{log_id}", status_code=status.HTTP_200_OK)
def get_access_log(log_id: int, db: Session = Depends(get_db)):
    """Get a single access log with full details."""
    try:
        log = (
            db.query(AccessLog)
            .options(joinedload(AccessLog.user), joinedload(AccessLog.access_point))
            .filter(AccessLog.id == log_id)
            .first()
        )
        if not log:
            raise HTTPException(status_code=404, detail="Access log not found")

        return {
            "id": log.id,
            "timestamp": log.timestamp,
            "decision": log.decision,
            "risk_score": log.risk_score,
            "method": log.method,
            "hour": log.hour,
            "day_of_week": log.day_of_week,
            "is_weekend": log.is_weekend,
            "access_frequency_24h": log.access_frequency_24h,
            "time_since_last_access_min": log.time_since_last_access_min,
            "location_match": log.location_match,
            "role_level": log.role_level,
            "is_restricted_area": log.is_restricted_area,
            "badge_id_used": log.badge_id_used,
            "context": log.context,
            "user": {
                "id": log.user.id,
                "name": f"{log.user.first_name} {log.user.last_name}",
                "role": log.user.role,
                "department": log.user.department,
            }
            if log.user
            else None,
            "access_point": {
                "id": log.access_point.id,
                "name": log.access_point.name,
                "building": log.access_point.building,
                "zone": log.access_point.zone,
            }
            if log.access_point
            else None,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
