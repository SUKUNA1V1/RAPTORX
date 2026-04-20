from datetime import datetime, timezone
from typing import Optional
from math import ceil
import threading
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, validator
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..models import AccessLog, AccessPoint, AnomalyAlert, User
from ..schemas.access_point import AccessPointCreate, AccessPointResponse, AccessPointUpdate
from ..services import AccessDecisionEngine, create_alert, extract_features
from ..services.ml_service import FEATURE_COLS
from ..services.cache_service import CacheService, CacheConfig, cache_context
from ..models.pagination import PaginationParams, PaginatedResponse, PaginationMetadata, get_pagination_offset, create_paginated_response
from ..routes.auth import get_current_user

logger = logging.getLogger(__name__)


# Purpose: Access-control endpoints for request evaluation, logs, and ML status.
router = APIRouter(prefix="/access", tags=["access"])
ml_router = APIRouter(prefix="/ml", tags=["ml"])
access_points_router = APIRouter(prefix="/access-points", tags=["access-points"])


class AccessRequest(BaseModel):
    """Request to make an access decision.
    
    Validates:
    - badge_id must be non-empty string
    - access_point_id must be positive integer
    - timestamp must be reasonable (not in future)
    - method must be one of allowed types
    """
    badge_id: str = Field(..., min_length=1, max_length=64, description="Badge ID")
    access_point_id: int = Field(..., gt=0, description="Access point ID")
    timestamp: Optional[datetime] = Field(None, description="Access timestamp (default: now)")
    method: Optional[str] = Field("badge", pattern="^(badge|pin|biometric|mobile)$", description="Access method")
    
    @validator("badge_id")
    def validate_badge_id(cls, v):
        """Validate badge ID format."""
        if not v or not v.strip():
            raise ValueError("badge_id cannot be empty")
        # Prevent injection attacks - only allow alphanumeric, underscore, hyphen
        if not all(c.isalnum() or c in "_-" for c in v):
            raise ValueError("badge_id contains invalid characters")
        return v.strip()
    
    @validator("timestamp")
    def validate_timestamp(cls, v):
        """Validate timestamp is not in the future."""
        if v is None:
            return datetime.now(timezone.utc)
        if v > datetime.now(timezone.utc):
            raise ValueError("timestamp cannot be in the future")
        return v


class AccessDecisionResponse(BaseModel):
    decision: str
    risk_score: float = Field(..., ge=0.0, le=1.0)
    if_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    ae_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    log_id: Optional[int] = None
    user_name: Optional[str] = None
    access_point_name: Optional[str] = None
    mode: Optional[str] = None
    reasoning: Optional[str] = None
    alert_created: bool


_ENGINE: Optional[AccessDecisionEngine] = None
_ENGINE_LOCK = threading.Lock()


def get_engine() -> AccessDecisionEngine:
    """Get or initialize the decision engine singleton.
    
    Thread-safe lazy loading with double-checked locking pattern
    to prevent concurrent initialization and ensure single instance.
    """
    global _ENGINE
    
    # First check (no lock for performance)
    if _ENGINE is not None:
        return _ENGINE
    
    # Acquire lock for initialization
    with _ENGINE_LOCK:
        # Second check (inside lock)
        if _ENGINE is not None:
            return _ENGINE
        
        try:
            _ENGINE = AccessDecisionEngine()
            logger.debug("Decision engine initialized")
        except Exception as e:
            logger.error(f"Failed to initialize decision engine: {e}")
            raise
    
    return _ENGINE


def _rule_based_score(features: list) -> float:
    # Purpose: Compute fallback score from the base behavioral feature subset.
    base_features = features[:13]
    (
        hour,
        day_of_week,
        is_weekend,
        access_frequency_24h,
        time_since_last_access_min,
        location_match,
        role_level,
        is_restricted_area,
        is_first_access_today,
        sequential_zone_violation,
        access_attempt_count,
        time_of_week,
        hour_deviation_from_norm,
    ) = base_features

    score = 0.0

    if hour < 6 or hour > 22:
        score += 0.35
    if is_weekend and role_level == 1:
        score += 0.20
    if not location_match:
        score += 0.20
    if is_restricted_area and role_level < 3:
        score += 0.30
    if access_frequency_24h > 10:
        score += 0.25
    if time_since_last_access_min is not None and time_since_last_access_min < 5:
        score += 0.30
    if sequential_zone_violation:
        score += 0.20
    if access_attempt_count > 2:
        score += 0.15

    return float(min(max(score, 0.0), 1.0))


@access_points_router.get("", response_model=PaginatedResponse[AccessPointResponse], status_code=status.HTTP_200_OK)
def list_access_points(
    status_filter: Optional[str] = Query(None, alias="status"),
    building: Optional[str] = Query(None),
    params: PaginationParams = Depends(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return access points list with optional filters and pagination. Requires authentication."""
    try:
        # Generate cache key from filters
        cache_key = f"access_points:{status_filter}:{building}:{params.page}:{params.page_size}:{params.sort_by}:{params.sort_order}"
        
        # Try cache first
        cached_result = CacheService.get(cache_key)
        if cached_result:
            return cached_result
        
        # Build query
        query = db.query(AccessPoint)
        if status_filter:
            query = query.filter(AccessPoint.status == status_filter)
        if building:
            query = query.filter(AccessPoint.building == building)
        
        # Get total count
        total = query.count()
        
        # Apply sorting
        try:
            sort_field = getattr(AccessPoint, params.sort_by, AccessPoint.installed_at)
            if params.sort_order == "asc":
                query = query.order_by(sort_field.asc())
            else:
                query = query.order_by(sort_field.desc())
        except AttributeError:
            query = query.order_by(AccessPoint.name.asc())
        
        # Apply pagination
        offset = get_pagination_offset(params.page, params.page_size)
        access_points = query.offset(offset).limit(params.page_size).all()
        
        # Build response
        total_pages = ceil(total / params.page_size) if params.page_size > 0 else 0
        response = PaginatedResponse(
            data=access_points,
            pagination=PaginationMetadata(
                page=params.page,
                page_size=params.page_size,
                total=total,
                total_pages=total_pages,
                has_next=params.page < total_pages,
                has_prev=params.page > 1
            )
        )
        
        # Cache result
        CacheService.set(cache_key, response, CacheConfig.TTL_MEDIUM)
        
        return response
    except Exception as exc:
        logger.error(f"Error listing access points: {exc}")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@access_points_router.get("/{access_point_id}", response_model=AccessPointResponse, status_code=status.HTTP_200_OK)
def get_access_point(
    access_point_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return a single access point by id. Requires authentication."""
    access_point = (
        db.query(AccessPoint)
        .filter(AccessPoint.id == access_point_id)
        .first()
    )
    if not access_point:
        raise HTTPException(status_code=404, detail="Access point not found")
    return access_point


@access_points_router.post("", response_model=AccessPointResponse, status_code=status.HTTP_201_CREATED)
def create_access_point(
    data: AccessPointCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new access point. Requires authentication."""
    try:
        payload = data.model_dump()
        payload["building"] = payload.get("building", "").strip()
        if not payload["building"]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="building is required",
            )

        for field in ("floor", "room", "zone", "ip_address", "description"):
            value = payload.get(field)
            if isinstance(value, str):
                value = value.strip()
            payload[field] = value or None

        payload["installed_at"] = payload.get("installed_at") or datetime.now(timezone.utc)

        access_point = AccessPoint(**payload)
        db.add(access_point)
        db.commit()
        db.refresh(access_point)
        
        # Invalidate access_points cache
        CacheService.invalidate("access_points:*")
        
        return access_point
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@access_points_router.put("/{access_point_id}", response_model=AccessPointResponse, status_code=status.HTTP_200_OK)
def update_access_point(
    access_point_id: int,
    data: AccessPointUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an access point. Requires authentication."""
    try:
        access_point = (
            db.query(AccessPoint)
            .filter(AccessPoint.id == access_point_id)
            .first()
        )
        if not access_point:
            raise HTTPException(status_code=404, detail="Access point not found")

        payload = data.model_dump(exclude_unset=True)

        if "name" in payload:
            name = (payload.get("name") or "").strip()
            if not name:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="name is required",
                )
            payload["name"] = name

        if "type" in payload:
            device_type = (payload.get("type") or "").strip()
            if not device_type:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="type is required",
                )
            payload["type"] = device_type

        if "building" in payload:
            building = (payload.get("building") or "").strip()
            if not building:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="building is required",
                )
            payload["building"] = building

        if "status" in payload:
            status_value = (payload.get("status") or "").strip()
            if not status_value:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="status is required",
                )
            payload["status"] = status_value

        for field in ("floor", "room", "zone", "ip_address", "description"):
            if field in payload and isinstance(payload[field], str):
                value = payload[field].strip()
                payload[field] = value or None

        for key, value in payload.items():
            setattr(access_point, key, value)

        db.commit()
        db.refresh(access_point)
        
        # Invalidate access_points cache
        CacheService.invalidate("access_points:*")
        
        return access_point
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/request", response_model=AccessDecisionResponse, status_code=status.HTTP_200_OK)
def request_access(payload: AccessRequest, db: Session = Depends(get_db)):
    """Process an access request and return a decision."""
    try:
        timestamp = payload.timestamp or datetime.now(timezone.utc)
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=timezone.utc)

        user = db.query(User).filter(User.badge_id == payload.badge_id).first()
        if not user:
            return AccessDecisionResponse(
                decision="denied",
                risk_score=1.0,
                log_id=None,
                user_name=None,
                access_point_name=None,
                mode="rule_based",
                reasoning="unknown_badge",
                alert_created=False,
            )

        if not user.is_active:
            access_point = (
                db.query(AccessPoint)
                .filter(AccessPoint.id == payload.access_point_id)
                .first()
            )
            access_log_id = None
            if access_point:
                access_log = AccessLog(
                    user_id=user.id,
                    access_point_id=access_point.id,
                    timestamp=timestamp,
                    decision="denied",
                    risk_score=1.0,
                    method=payload.method or "badge",
                    badge_id_used=payload.badge_id,
                )
                db.add(access_log)
                db.commit()
                db.refresh(access_log)
                access_log_id = access_log.id
            return AccessDecisionResponse(
                decision="denied",
                risk_score=1.0,
                log_id=access_log_id,
                user_name=f"{user.first_name} {user.last_name}",
                access_point_name=access_point.name if access_point else None,
                mode="rule_based",
                reasoning="deactivated_user",
                alert_created=False,
            )

        access_point = (
            db.query(AccessPoint)
            .filter(AccessPoint.id == payload.access_point_id)
            .first()
        )
        if not access_point:
            return AccessDecisionResponse(
                decision="denied",
                risk_score=1.0,
                log_id=None,
                user_name=f"{user.first_name} {user.last_name}",
                access_point_name=None,
                mode="rule_based",
                reasoning="invalid_access_point",
                alert_created=False,
            )
        if access_point.status != "active":
            return AccessDecisionResponse(
                decision="denied",
                risk_score=1.0,
                log_id=None,
                user_name=f"{user.first_name} {user.last_name}",
                access_point_name=access_point.name,
                mode="rule_based",
                reasoning="access_point_inactive",
                alert_created=False,
            )

        if user.clearance_level < access_point.required_clearance:
            features = extract_features(user, access_point, timestamp, db)
            access_log = AccessLog(
                user_id=user.id,
                access_point_id=access_point.id,
                timestamp=timestamp,
                decision="denied",
                risk_score=0.95,
                method=payload.method or "badge",
                hour=features["raw"]["hour"],
                day_of_week=features["raw"]["day_of_week"],
                is_weekend=bool(features["raw"]["is_weekend"]),
                access_frequency_24h=features["raw"]["access_frequency_24h"],
                time_since_last_access_min=features["raw"]["time_since_last_access_min"],
                location_match=bool(features["raw"]["location_match"]),
                role_level=features["raw"]["role_level"],
                is_restricted_area=bool(features["raw"]["is_restricted_area"]),
                is_first_access_today=bool(features["raw"]["is_first_access_today"]),
                sequential_zone_violation=bool(
                    features["raw"]["sequential_zone_violation"]
                ),
                access_attempt_count=features["raw"]["access_attempt_count"],
                time_of_week=features["raw"]["time_of_week"],
                hour_deviation_from_norm=features["raw"]["hour_deviation_from_norm"],
                badge_id_used=payload.badge_id,
                context={
                    "features_raw": features["raw"],
                    "features_scaled": features["scaled"],
                },
            )
            db.add(access_log)
            db.flush()

            alert = AnomalyAlert(
                log_id=access_log.id,
                alert_type="unauthorized_zone",
                severity="high",
                status="open",
                is_resolved=False,
                description="Insufficient clearance for access point",
                confidence=0.95,
                triggered_by="rule_engine",
            )
            db.add(alert)

            user.last_seen_at = timestamp
            db.commit()
            db.refresh(access_log)

            return AccessDecisionResponse(
                decision="denied",
                risk_score=0.95,
                log_id=access_log.id,
                user_name=f"{user.first_name} {user.last_name}",
                access_point_name=access_point.name,
                mode="rule_based",
                reasoning="insufficient_clearance",
                alert_created=True,
            )

        features = extract_features(user, access_point, timestamp, db)
        raw_list = [features["raw"][name] for name in FEATURE_COLS]

        engine = get_engine()
        audit_context = {
            "user_id": user.id,
            "access_point_id": access_point.id,
            "badge_id": payload.badge_id,
            "method": payload.method or "badge",
            "timestamp": timestamp.isoformat() if timestamp else None,
        }
        try:
            ml_result = engine.decide(
                features["list"],
                raw_features=raw_list,
                audit_context=audit_context,
            )
        except Exception as exc:
            print(f"ML scoring failed, falling back to rule-based: {exc}")
            risk_score = _rule_based_score(raw_list)
            if risk_score < engine.grant_threshold:
                decision = "granted"
                reasoning = (
                    f"Risk score {risk_score:.4f} below grant threshold {engine.grant_threshold}"
                )
            elif risk_score < engine.deny_threshold:
                decision = "delayed"
                reasoning = f"Risk score {risk_score:.4f} in delay zone - guard notified"
            else:
                decision = "denied"
                reasoning = (
                    f"Risk score {risk_score:.4f} above deny threshold {engine.deny_threshold}"
                )
            ml_result = {
                "decision": decision,
                "risk_score": round(risk_score, 4),
                "if_score": None,
                "ae_score": None,
                "reasoning": reasoning,
                "mode": "rule_based",
            }
            engine.audit_decision(
                decision=ml_result,
                features=features["list"],
                raw_features=raw_list,
                audit_context={**audit_context, "error": str(exc)},
                event_type="decision_exception_fallback",
            )

        access_log = AccessLog(
            user_id=user.id,
            access_point_id=access_point.id,
            timestamp=timestamp,
            decision=ml_result["decision"],
            risk_score=ml_result["risk_score"],
            method=payload.method or "badge",
            hour=features["raw"]["hour"],
            day_of_week=features["raw"]["day_of_week"],
            is_weekend=bool(features["raw"]["is_weekend"]),
            access_frequency_24h=features["raw"]["access_frequency_24h"],
            time_since_last_access_min=features["raw"]["time_since_last_access_min"],
            location_match=bool(features["raw"]["location_match"]),
            role_level=features["raw"]["role_level"],
            is_restricted_area=bool(features["raw"]["is_restricted_area"]),
            is_first_access_today=bool(features["raw"]["is_first_access_today"]),
            sequential_zone_violation=bool(features["raw"]["sequential_zone_violation"]),
            access_attempt_count=features["raw"]["access_attempt_count"],
            time_of_week=features["raw"]["time_of_week"],
            hour_deviation_from_norm=features["raw"]["hour_deviation_from_norm"],
            badge_id_used=payload.badge_id,
            context={"features_raw": features["raw"], "features_scaled": features["scaled"]},
        )
        db.add(access_log)

        user.last_seen_at = timestamp
        db.commit()
        db.refresh(access_log)
        
        # Invalidate access logs cache since new log was added
        CacheService.invalidate("access_logs:*")

        alert_created = False
        if ml_result["decision"] == "denied" or (
            ml_result["decision"] == "delayed" and ml_result["risk_score"] >= 0.50
        ):
            create_alert(
                db,
                access_log.id,
                ml_result,
                features["raw"],
                grant_threshold=engine.grant_threshold,
                deny_threshold=engine.deny_threshold,
            )
            alert_created = True

        return AccessDecisionResponse(
            decision=ml_result["decision"],
            risk_score=ml_result["risk_score"],
            if_score=ml_result.get("if_score"),
            ae_score=ml_result.get("ae_score"),
            log_id=access_log.id,
            user_name=f"{user.first_name} {user.last_name}",
            access_point_name=access_point.name,
            mode=ml_result.get("mode"),
            reasoning=ml_result.get("reasoning"),
            alert_created=alert_created,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/logs", status_code=status.HTTP_200_OK)
def list_access_logs(
    params: PaginationParams = Depends(),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    access_point_id: Optional[int] = Query(None, description="Filter by access point ID"),
    decision: Optional[str] = Query(None, description="Filter by decision (grant/deny/delayed)"),
    date_from: Optional[datetime] = Query(None, description="Filter from date"),
    date_to: Optional[datetime] = Query(None, description="Filter to date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List access logs with pagination and optional filters.
    
    Returns paginated results with metadata.
    
    Supports filtering by:
    - user_id
    - access_point_id
    - decision
    - date range (date_from, date_to)
    
    Pagination parameters:
    - page: Page number (1-indexed, default 1)
    - page_size: Items per page (10-500, default 50)
    - sort_by: Field to sort by (default created_at)
    - sort_order: asc or desc (default desc)
    """
    try:
        # Generate cache key from parameters
        cache_key = f"access_logs:{user_id}:{access_point_id}:{decision}:{date_from}:{date_to}:{params.page}:{params.page_size}:{params.sort_by}:{params.sort_order}"
        
        # Try to get from cache
        cached_result = CacheService.get(cache_key)
        if cached_result:
            logger.debug(f"Cache hit for access logs: {cache_key}")
            return cached_result
        
        # Build query
        query = db.query(AccessLog).options(
            joinedload(AccessLog.user), joinedload(AccessLog.access_point)
        )
        
        # Apply filters
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
        
        # Get total count
        total = query.count()
        
        # Calculate offset
        offset = get_pagination_offset(params.page, params.page_size)
        
        # Get sorted results
        sort_field = getattr(AccessLog, params.sort_by, AccessLog.timestamp)
        if params.sort_order == "asc":
            query = query.order_by(sort_field.asc())
        else:
            query = query.order_by(sort_field.desc())
        
        logs = query.offset(offset).limit(params.page_size).all()
        
        # Format items
        items = []
        for log in logs:
            items.append({
                "id": log.id,
                "timestamp": log.timestamp,
                "decision": log.decision,
                "risk_score": float(log.risk_score or 0.0),
                "method": log.method,
                "badge_id_used": log.badge_id_used,
                "user_id": log.user_id,
                "access_point_id": log.access_point_id,
                "user": {
                    "first_name": log.user.first_name,
                    "last_name": log.user.last_name,
                    "badge_id": log.user.badge_id,
                    "role": log.user.role,
                } if log.user else None,
                "access_point": {
                    "name": log.access_point.name,
                    "building": log.access_point.building,
                    "room": log.access_point.room,
                } if log.access_point else None,
            })
        
        # Build response with pagination
        response_data = {
            "data": items,
            "page": params.page,
            "page_size": params.page_size,
            "total": total
        }
        
        # Cache the result
        CacheService.set(cache_key, response_data, CacheConfig.TTL_SHORT)
        
        # Return paginated response
        total_pages = ceil(total / params.page_size) if params.page_size > 0 else 0
        return PaginatedResponse(
            data=items,
            pagination=PaginationMetadata(
                page=params.page,
                page_size=params.page_size,
                total=total,
                total_pages=total_pages,
                has_next=params.page < total_pages,
                has_prev=params.page > 1
            )
        )
    except Exception as exc:
        logger.error(f"Error listing access logs: {exc}")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/logs/{log_id}", status_code=status.HTTP_200_OK)
def get_access_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single access log with full details. Requires authentication."""
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


@router.delete("/logs", status_code=status.HTTP_200_OK)
def clear_access_logs(db: Session = Depends(get_db)):
    """Delete all access logs and associated anomaly alerts."""
    try:
        deleted_alerts = db.query(AnomalyAlert).delete(synchronize_session=False)
        deleted_logs = db.query(AccessLog).delete(synchronize_session=False)
        db.commit()
        return {"deleted_logs": deleted_logs, "deleted_alerts": deleted_alerts}
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
