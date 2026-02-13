from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AccessLog, AccessPoint, AnomalyAlert, User


router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/overview", status_code=status.HTTP_200_OK)
def get_overview(db: Session = Depends(get_db)):
    """Return high-level dashboard statistics."""
    try:
        now = datetime.now(timezone.utc)
        start_of_day = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)

        total_accesses_today = (
            db.query(func.count(AccessLog.id))
            .filter(AccessLog.timestamp >= start_of_day)
            .scalar()
        )
        denied_today = (
            db.query(func.count(AccessLog.id))
            .filter(AccessLog.timestamp >= start_of_day)
            .filter(AccessLog.decision == "denied")
            .scalar()
        )
        delayed_today = (
            db.query(func.count(AccessLog.id))
            .filter(AccessLog.timestamp >= start_of_day)
            .filter(AccessLog.decision == "delayed")
            .scalar()
        )
        active_alerts_count = (
            db.query(func.count(AnomalyAlert.id))
            .filter(AnomalyAlert.is_resolved.is_(False))
            .filter(AnomalyAlert.status.in_(["open", "acknowledged"]))
            .scalar()
        )
        total_users = db.query(func.count(User.id)).scalar()
        total_access_points = db.query(func.count(AccessPoint.id)).scalar()

        return {
            "total_accesses_today": total_accesses_today,
            "denied_today": denied_today,
            "delayed_today": delayed_today,
            "active_alerts_count": active_alerts_count,
            "total_users": total_users,
            "total_access_points": total_access_points,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/access-timeline", status_code=status.HTTP_200_OK)
def get_access_timeline(db: Session = Depends(get_db)):
    """Return hourly access counts for last 24 hours."""
    try:
        now = datetime.now(timezone.utc)
        start = now - timedelta(hours=24)

        rows = (
            db.query(
                func.date_trunc("hour", AccessLog.timestamp).label("hour"),
                func.sum(case((AccessLog.decision == "granted", 1), else_=0)).label("granted"),
                func.sum(case((AccessLog.decision == "denied", 1), else_=0)).label("denied"),
                func.sum(case((AccessLog.decision == "delayed", 1), else_=0)).label("delayed"),
            )
            .filter(AccessLog.timestamp >= start)
            .group_by("hour")
            .order_by("hour")
            .all()
        )

        counts = {row.hour: row for row in rows}
        results = []
        for offset in range(24):
            hour = (start + timedelta(hours=offset)).replace(minute=0, second=0, microsecond=0)
            row = counts.get(hour)
            results.append(
                {
                    "hour": hour,
                    "granted": int(row.granted) if row else 0,
                    "denied": int(row.denied) if row else 0,
                    "delayed": int(row.delayed) if row else 0,
                }
            )

        return results
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/anomaly-distribution", status_code=status.HTTP_200_OK)
def get_anomaly_distribution(db: Session = Depends(get_db)):
    """Return alert counts grouped by severity."""
    try:
        rows = (
            db.query(AnomalyAlert.severity, func.count(AnomalyAlert.id))
            .group_by(AnomalyAlert.severity)
            .all()
        )
        return [{"severity": row[0], "count": row[1]} for row in rows]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/top-access-points", status_code=status.HTTP_200_OK)
def get_top_access_points(db: Session = Depends(get_db)):
    """Return top 5 access points used today."""
    try:
        now = datetime.now(timezone.utc)
        start_of_day = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)

        rows = (
            db.query(
                AccessPoint.name,
                AccessPoint.building,
                func.count(AccessLog.id).label("total"),
                func.sum(case((AccessLog.decision == "granted", 1), else_=0)).label("granted"),
                func.sum(case((AccessLog.decision == "denied", 1), else_=0)).label("denied"),
            )
            .join(AccessLog, AccessLog.access_point_id == AccessPoint.id)
            .filter(AccessLog.timestamp >= start_of_day)
            .group_by(AccessPoint.id)
            .order_by(func.count(AccessLog.id).desc())
            .limit(5)
            .all()
        )

        return [
            {
                "name": row.name,
                "building": row.building,
                "total": int(row.total),
                "granted": int(row.granted),
                "denied": int(row.denied),
            }
            for row in rows
        ]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
