from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..models import AccessLog, AnomalyAlert
from ..services import AlertService


router = APIRouter(prefix="/alerts", tags=["alerts"])


class AlertResolveRequest(BaseModel):
    resolved_by: int


@router.get("", status_code=status.HTTP_200_OK)
def list_alerts(
    severity: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List alerts with optional filters."""
    try:
        query = db.query(AnomalyAlert).options(
            joinedload(AnomalyAlert.access_log).joinedload(AccessLog.access_point),
            joinedload(AnomalyAlert.access_log).joinedload(AccessLog.user),
        )
        if severity:
            query = query.filter(AnomalyAlert.severity == severity)
        if status_filter:
            query = query.filter(AnomalyAlert.status == status_filter)
        if date_from:
            query = query.filter(AnomalyAlert.created_at >= date_from)
        if date_to:
            query = query.filter(AnomalyAlert.created_at <= date_to)

        alerts = query.order_by(AnomalyAlert.created_at.desc()).offset(skip).limit(limit).all()
        results = []
        for alert in alerts:
            log = alert.access_log
            user = log.user if log else None
            access_point = log.access_point if log else None
            results.append(
                {
                    "id": alert.id,
                    "alert_type": alert.alert_type,
                    "severity": alert.severity,
                    "status": alert.status,
                    "created_at": alert.created_at,
                    "is_resolved": alert.is_resolved,
                    "log_id": alert.log_id,
                    "user": {
                        "id": user.id,
                        "name": f"{user.first_name} {user.last_name}",
                        "role": user.role,
                    }
                    if user
                    else None,
                    "access_point": {
                        "id": access_point.id,
                        "name": access_point.name,
                        "building": access_point.building,
                    }
                    if access_point
                    else None,
                }
            )
        return results
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/{alert_id}", status_code=status.HTTP_200_OK)
def get_alert(alert_id: int, db: Session = Depends(get_db)):
    """Get a single alert with details."""
    try:
        alert = (
            db.query(AnomalyAlert)
            .options(
                joinedload(AnomalyAlert.access_log).joinedload(AccessLog.access_point),
                joinedload(AnomalyAlert.access_log).joinedload(AccessLog.user),
            )
            .filter(AnomalyAlert.id == alert_id)
            .first()
        )
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")

        log = alert.access_log
        user = log.user if log else None
        access_point = log.access_point if log else None

        return {
            "id": alert.id,
            "alert_type": alert.alert_type,
            "severity": alert.severity,
            "status": alert.status,
            "is_resolved": alert.is_resolved,
            "description": alert.description,
            "confidence": alert.confidence,
            "triggered_by": alert.triggered_by,
            "created_at": alert.created_at,
            "resolved_at": alert.resolved_at,
            "resolved_by": alert.resolved_by,
            "notes": alert.notes,
            "log": {
                "id": log.id,
                "timestamp": log.timestamp,
                "decision": log.decision,
                "risk_score": log.risk_score,
            }
            if log
            else None,
            "user": {
                "id": user.id,
                "name": f"{user.first_name} {user.last_name}",
                "role": user.role,
            }
            if user
            else None,
            "access_point": {
                "id": access_point.id,
                "name": access_point.name,
                "building": access_point.building,
            }
            if access_point
            else None,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.put("/{alert_id}/resolve", status_code=status.HTTP_200_OK)
def resolve_alert(alert_id: int, payload: AlertResolveRequest, db: Session = Depends(get_db)):
    """Resolve an alert by setting status and resolved fields."""
    try:
        alert = db.query(AnomalyAlert).filter(AnomalyAlert.id == alert_id).first()
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")

        service = AlertService(db)
        resolved = service.resolve_alert(alert, resolved_by=payload.resolved_by)
        return {
            "id": resolved.id,
            "status": resolved.status,
            "is_resolved": resolved.is_resolved,
            "resolved_at": resolved.resolved_at,
            "resolved_by": resolved.resolved_by,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
