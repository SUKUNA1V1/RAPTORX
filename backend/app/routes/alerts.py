from datetime import datetime
from typing import Optional
from math import ceil
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..models import AccessLog, AnomalyAlert, User
from ..services import AlertService
from ..routes.auth import get_current_user
from ..models.pagination import PaginationParams, PaginatedResponse, PaginationMetadata, get_pagination_offset, create_paginated_response
from ..services.cache_service import CacheService, CacheConfig

logger = logging.getLogger(__name__)


# Purpose: Alert management endpoints for listing, inspection, and resolution.
router = APIRouter(prefix="/alerts", tags=["alerts"])


class AlertResolveRequest(BaseModel):
    resolved_by: Optional[int] = None


@router.get("", response_model=PaginatedResponse, status_code=status.HTTP_200_OK)
def list_alerts(
    severity: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    params: PaginationParams = Depends(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List alerts with optional filters and pagination. Requires authentication."""
    try:
        # Generate cache key from filters
        cache_key = f"alerts:{severity}:{status_filter}:{date_from}:{date_to}:{params.page}:{params.page_size}:{params.sort_by}:{params.sort_order}"
        
        # Try cache first (short TTL due to frequent changes)
        cached_result = CacheService.get(cache_key)
        if cached_result:
            return cached_result
        
        # Build query for counting
        count_query = db.query(AnomalyAlert)
        if severity:
            count_query = count_query.filter(AnomalyAlert.severity == severity)
        if status_filter:
            count_query = count_query.filter(AnomalyAlert.status == status_filter)
        if date_from:
            count_query = count_query.filter(AnomalyAlert.created_at >= date_from)
        if date_to:
            count_query = count_query.filter(AnomalyAlert.created_at <= date_to)
        
        total = count_query.count()
        
        # Build query with joins
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
        
        # Apply sorting
        try:
            sort_field = getattr(AnomalyAlert, params.sort_by, AnomalyAlert.created_at)
            if params.sort_order == "asc":
                query = query.order_by(sort_field.asc())
            else:
                query = query.order_by(sort_field.desc())
        except AttributeError:
            query = query.order_by(AnomalyAlert.created_at.desc())
        
        # Apply pagination
        offset = get_pagination_offset(params.page, params.page_size)
        alerts = query.offset(offset).limit(params.page_size).all()
        
        # Build result items
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
                    "description": alert.description,
                    "confidence": alert.confidence,
                    "triggered_by": alert.triggered_by,
                    "resolved_at": alert.resolved_at,
                    "resolved_by": alert.resolved_by,
                    "notes": alert.notes,
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
        
        # Build response
        total_pages = ceil(total / params.page_size) if params.page_size > 0 else 0
        response = PaginatedResponse(
            data=results,
            pagination=PaginationMetadata(
                page=params.page,
                page_size=params.page_size,
                total=total,
                total_pages=total_pages,
                has_next=params.page < total_pages,
                has_prev=params.page > 1
            )
        )
        
        # Cache result (short TTL for alerts)
        CacheService.set(cache_key, response, CacheConfig.TTL_SHORT)
        
        return response
    except Exception as exc:
        logger.error(f"Error listing alerts: {exc}")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/{alert_id}", status_code=status.HTTP_200_OK)
def get_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single alert with details. Requires authentication."""
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
def resolve_alert(
    alert_id: int,
    payload: Optional[AlertResolveRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Resolve an alert by setting status and resolved fields. Requires authentication."""
    try:
        alert = db.query(AnomalyAlert).filter(AnomalyAlert.id == alert_id).first()
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")

        service = AlertService(db)
        resolved_by = payload.resolved_by if payload and payload.resolved_by and payload.resolved_by > 0 else None
        resolved = service.resolve_alert(alert, resolved_by=resolved_by)
        
        # Invalidate alerts cache
        CacheService.invalidate("alerts:*")
        
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


@router.put("/{alert_id}/false-positive", status_code=status.HTTP_200_OK)
def mark_false_positive(
    alert_id: int,
    payload: Optional[AlertResolveRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark an alert as false-positive and resolved. Requires authentication."""
    try:
        alert = db.query(AnomalyAlert).filter(AnomalyAlert.id == alert_id).first()
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")

        service = AlertService(db)
        resolved_by = payload.resolved_by if payload and payload.resolved_by and payload.resolved_by > 0 else None
        resolved = service.mark_false_positive(alert, resolved_by=resolved_by)
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
