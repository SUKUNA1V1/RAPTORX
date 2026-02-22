from datetime import datetime, time, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AccessLog, AccessPoint, AnomalyAlert, User
from ..monitoring import get_query_statistics
from ..api_metrics import get_api_performance_stats
import psutil
import os


# Purpose: Dashboard/statistics endpoints used by overview and chart widgets.
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
        granted_today = (
            db.query(func.count(AccessLog.id))
            .filter(AccessLog.timestamp >= start_of_day)
            .filter(AccessLog.decision == "granted")
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
            "granted_today": granted_today,
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
        today = datetime.now(timezone.utc).date()
        result = []
        for hour in range(24):
            start = datetime.combine(today, time(hour, 0), tzinfo=timezone.utc)
            end = datetime.combine(today, time(hour, 59, 59), tzinfo=timezone.utc)
            granted = (
                db.query(func.count(AccessLog.id))
                .filter(AccessLog.timestamp.between(start, end))
                .filter(AccessLog.decision == "granted")
                .scalar()
            )
            denied = (
                db.query(func.count(AccessLog.id))
                .filter(AccessLog.timestamp.between(start, end))
                .filter(AccessLog.decision == "denied")
                .scalar()
            )
            delayed = (
                db.query(func.count(AccessLog.id))
                .filter(AccessLog.timestamp.between(start, end))
                .filter(AccessLog.decision == "delayed")
                .scalar()
            )
            result.append(
                {
                    "hour": hour,
                    "granted": granted,
                    "denied": denied,
                    "delayed": delayed,
                }
            )

        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/anomaly-distribution", status_code=status.HTTP_200_OK)
def get_anomaly_distribution(db: Session = Depends(get_db)):
    """Return alert counts grouped by severity."""
    try:
        rows = (
            db.query(AnomalyAlert.severity, func.count(AnomalyAlert.id))
            .filter(AnomalyAlert.is_resolved.is_(False))
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


@router.get("/database-performance", status_code=status.HTTP_200_OK)
def get_database_performance():
    """Return database query performance statistics and slow query logs."""
    try:
        return get_query_statistics()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/api-performance", status_code=status.HTTP_200_OK)
def get_api_performance():
    """Return API endpoint performance statistics."""
    try:
        return get_api_performance_stats()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/system-health", status_code=status.HTTP_200_OK)
def get_system_health():
    """Return comprehensive system health metrics."""
    try:
        process = psutil.Process(os.getpid())
        
        # Get CPU and memory metrics
        cpu_percent = process.cpu_percent(interval=0.1)
        memory_info = process.memory_info()
        
        # Get system-wide metrics
        system_cpu = psutil.cpu_percent(interval=0.1)
        system_memory = psutil.virtual_memory()
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "process": {
                "cpu_percent": cpu_percent,
                "memory_mb": round(memory_info.rss / 1024 / 1024, 2),
                "threads": process.num_threads(),
            },
            "system": {
                "cpu_percent": system_cpu,
                "memory_percent": system_memory.percent,
                "memory_available_mb": round(system_memory.available / 1024 / 1024, 2),
                "disk_percent": psutil.disk_usage("/").percent,
            },
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
