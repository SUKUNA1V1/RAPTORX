from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..models import AccessLog, AccessPoint, AnomalyAlert, User
from ..schemas.access_point import AccessPointCreate, AccessPointResponse
from ..services import AccessDecisionEngine, create_alert, extract_features
from ..services.ml_service import FEATURE_COLS


# Purpose: Access-control endpoints for request evaluation, logs, and ML status.
router = APIRouter(prefix="/access", tags=["access"])
ml_router = APIRouter(prefix="/ml", tags=["ml"])
access_points_router = APIRouter(prefix="/access-points", tags=["access-points"])


class AccessRequest(BaseModel):
    badge_id: str
    access_point_id: int
    timestamp: Optional[datetime] = None
    method: Optional[str] = "badge"


class AccessDecisionResponse(BaseModel):
    decision: str
    risk_score: float
    if_score: Optional[float] = None
    ae_score: Optional[float] = None
    log_id: Optional[int]
    user_name: Optional[str] = None
    access_point_name: Optional[str] = None
    mode: Optional[str] = None
    reasoning: Optional[str] = None
    alert_created: bool


_ENGINE: Optional[AccessDecisionEngine] = None


def get_engine() -> AccessDecisionEngine:
    # Purpose: Lazily initialize and reuse a single decision-engine instance.
    global _ENGINE
    if _ENGINE is None:
        _ENGINE = AccessDecisionEngine()
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
    if time_since_last_access_min and time_since_last_access_min < 5:
        score += 0.30
    if sequential_zone_violation:
        score += 0.20
    if access_attempt_count > 2:
        score += 0.15

    return float(min(max(score, 0.0), 1.0))


@access_points_router.get("", status_code=status.HTTP_200_OK)
def list_access_points(
    status_filter: Optional[str] = Query(None, alias="status"),
    building: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Return access points list with optional filters."""
    try:
        query = db.query(AccessPoint)
        if status_filter:
            query = query.filter(AccessPoint.status == status_filter)
        if building:
            query = query.filter(AccessPoint.building == building)
        return query.all()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@access_points_router.post("", response_model=AccessPointResponse, status_code=status.HTTP_201_CREATED)
def create_access_point(data: AccessPointCreate, db: Session = Depends(get_db)):
    """Create a new access point."""
    try:
        access_point = AccessPoint(**data.model_dump())
        db.add(access_point)
        db.commit()
        db.refresh(access_point)
        return access_point
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
            if risk_score < engine.GRANT_THRESHOLD:
                decision = "granted"
                reasoning = (
                    f"Risk score {risk_score:.4f} below grant threshold {engine.GRANT_THRESHOLD}"
                )
            elif risk_score < engine.DENY_THRESHOLD:
                decision = "delayed"
                reasoning = f"Risk score {risk_score:.4f} in delay zone - guard notified"
            else:
                decision = "denied"
                reasoning = (
                    f"Risk score {risk_score:.4f} above deny threshold {engine.DENY_THRESHOLD}"
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

        alert_created = False
        if ml_result["decision"] == "denied" or (
            ml_result["decision"] == "delayed" and ml_result["risk_score"] >= 0.50
        ):
            create_alert(db, access_log.id, ml_result, features["raw"])
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


@ml_router.get("/status", status_code=status.HTTP_200_OK)
def ml_status():
    """Return model loading/threshold status for frontend diagnostics."""
    engine = get_engine()
    return engine.status()


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

        total = query.count()
        logs = query.order_by(AccessLog.timestamp.desc()).offset(skip).limit(limit).all()
        items = []
        for log in logs:
            items.append(
                {
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
                    }
                    if log.user
                    else None,
                    "access_point": {
                        "name": log.access_point.name,
                        "building": log.access_point.building,
                        "room": log.access_point.room,
                    }
                    if log.access_point
                    else None,
                }
            )
        return {"items": items, "total": total}
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
