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
            .filter(AnomalyAlert.status == "open")
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
def get_access_timeline(date: str | None = None, db: Session = Depends(get_db)):
    """Return access counts by minute for a selected date (YYYY-MM-DD) or the 24h window
    containing the most recent activity when no date is provided."""
    try:
        now = datetime.now(timezone.utc)

        if date:
            # Parse the user-selected date and build a full-day window in UTC
            try:
                selected = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
            window_start = selected
            window_end = selected + timedelta(hours=24)
        else:
            # Anchor to the most recent log so the chart shows real data even if
            # logs were stored with future timestamps from the simulator.
            latest_ts = db.query(func.max(AccessLog.timestamp)).scalar()
            if latest_ts is not None:
                if latest_ts.tzinfo is None:
                    latest_ts = latest_ts.replace(tzinfo=timezone.utc)
                anchor = max(now, latest_ts)
            else:
                anchor = now
            window_end = anchor.replace(second=0, microsecond=0) + timedelta(minutes=1)
            window_start = window_end - timedelta(hours=24)

        minute_map = {}
        for m in range(24 * 60):
            dt = window_start + timedelta(minutes=m)
            minute_map[dt.isoformat()] = {"granted": 0, "denied": 0, "delayed": 0}

        logs = (
            db.query(AccessLog.timestamp, AccessLog.decision)
            .filter(AccessLog.timestamp >= window_start, AccessLog.timestamp < window_end)
            .all()
        )

        for ts, decision in logs:
            if not ts:
                continue
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            minute_key = ts.replace(second=0, microsecond=0).isoformat()
            if minute_key in minute_map and decision in minute_map[minute_key]:
                minute_map[minute_key][decision] += 1

        result = [
            {
                "timestamp": k,
                "granted": v["granted"],
                "denied": v["denied"],
                "delayed": v["delayed"],
            }
            for k, v in sorted(minute_map.items())
        ]

        return result
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/monthly-timeline", status_code=status.HTTP_200_OK)
def get_monthly_timeline(db: Session = Depends(get_db)):
    """Return monthly access decision counts for the current year."""
    try:
        now = datetime.now(timezone.utc)
        result = []
        for month in range(1, 13):
            start = datetime(now.year, month, 1, tzinfo=timezone.utc)
            if month < 12:
                end = datetime(now.year, month + 1, 1, tzinfo=timezone.utc)
            else:
                end = datetime(now.year + 1, 1, 1, tzinfo=timezone.utc)
            granted = (
                db.query(func.count(AccessLog.id))
                .filter(AccessLog.timestamp >= start, AccessLog.timestamp < end)
                .filter(AccessLog.decision == "granted")
                .scalar()
            )
            denied = (
                db.query(func.count(AccessLog.id))
                .filter(AccessLog.timestamp >= start, AccessLog.timestamp < end)
                .filter(AccessLog.decision == "denied")
                .scalar()
            )
            delayed = (
                db.query(func.count(AccessLog.id))
                .filter(AccessLog.timestamp >= start, AccessLog.timestamp < end)
                .filter(AccessLog.decision == "delayed")
                .scalar()
            )
            result.append({"month": month, "granted": granted, "denied": denied, "delayed": delayed})
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
