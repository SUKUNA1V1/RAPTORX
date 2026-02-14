import os
from datetime import datetime, timedelta, timezone
from typing import Dict, List

import joblib
import numpy as np
from sqlalchemy import desc, func
from sqlalchemy.orm import Session, joinedload

from ..models import AccessLog


FEATURE_COLS = [
    "hour",
    "day_of_week",
    "is_weekend",
    "access_frequency_24h",
    "time_since_last_access_min",
    "location_match",
    "role_level",
    "is_restricted_area",
    "is_first_access_today",
    "sequential_zone_violation",
    "access_attempt_count",
    "time_of_week",
    "hour_deviation_from_norm",
]

ZONE_DEPARTMENT_MAP = {
    "engineering": "Engineering",
    "hr": "HR",
    "finance": "Finance",
    "marketing": "Marketing",
    "logistics": "Logistics",
    "it": "IT",
    "server-room": "IT",
    "executive": "Management",
    "lobby": None,
    "parking": None,
}

ROLE_LEVEL_MAP = {
    "employee": 1,
    "contractor": 1,
    "visitor": 1,
    "security": 2,
    "manager": 2,
    "admin": 3,
}

FEATURE_RANGES = {
    "hour": (0, 23),
    "day_of_week": (0, 6),
    "is_weekend": (0, 1),
    "access_frequency_24h": (0, 40),
    "time_since_last_access_min": (0, 480),
    "location_match": (0, 1),
    "role_level": (1, 3),
    "is_restricted_area": (0, 1),
    "is_first_access_today": (0, 1),
    "sequential_zone_violation": (0, 1),
    "access_attempt_count": (0, 8),
    "time_of_week": (0, 167),
    "hour_deviation_from_norm": (0, 10),
}

_SCALER = None


def _models_dir() -> str:
    base = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
    return os.path.join(base, "ml", "models")


def get_scaler():
    global _SCALER
    if _SCALER is None:
        scaler_path = os.path.join(_models_dir(), "scaler.pkl")
        _SCALER = joblib.load(scaler_path)
    return _SCALER


def _clip_value(name: str, value: float) -> float:
    min_val, max_val = FEATURE_RANGES[name]
    return float(min(max(value, min_val), max_val))


def _safe_int(value, default=0) -> int:
    if value is None:
        return int(default)
    return int(value)


def _location_match(user_department: str, zone: str) -> int:
    if zone is None:
        return 0
    expected_department = ZONE_DEPARTMENT_MAP.get(zone.strip().lower())
    if expected_department is None:
        return 1
    if not user_department:
        return 0
    return 1 if user_department.strip().lower() == expected_department.strip().lower() else 0


def extract_features(user, access_point, timestamp: datetime, db: Session, failed_attempts=0) -> Dict:
    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(tzinfo=timezone.utc)

    hour = timestamp.hour
    day_of_week = timestamp.weekday()
    is_weekend = 1 if day_of_week >= 5 else 0

    last_24h_start = timestamp - timedelta(hours=24)
    access_frequency_24h = (
        db.query(func.count(AccessLog.id))
        .filter(AccessLog.user_id == user.id)
        .filter(AccessLog.timestamp >= last_24h_start)
        .scalar()
        or 0
    )

    last_log = (
        db.query(AccessLog)
        .options(joinedload(AccessLog.access_point))
        .filter(AccessLog.user_id == user.id)
        .order_by(desc(AccessLog.timestamp))
        .first()
    )
    time_since_last_access_min = None
    if last_log and last_log.timestamp:
        delta = timestamp - last_log.timestamp
        time_since_last_access_min = int(delta.total_seconds() / 60)

    location_match = _location_match(user.department, access_point.zone)
    role_level = ROLE_LEVEL_MAP.get(user.role, 1)
    is_restricted_area = 1 if access_point.is_restricted else 0

    start_of_day = timestamp.replace(hour=0, minute=0, second=0, microsecond=0)
    today_count = (
        db.query(func.count(AccessLog.id))
        .filter(AccessLog.user_id == user.id)
        .filter(AccessLog.timestamp >= start_of_day)
        .scalar()
        or 0
    )
    is_first_access_today = 1 if today_count == 0 else 0

    sequential_zone_violation = 0
    if (
        last_log
        and last_log.access_point
        and last_log.access_point.zone
        and access_point.zone
        and time_since_last_access_min is not None
        and time_since_last_access_min < 5
        and last_log.access_point.zone != access_point.zone
    ):
        sequential_zone_violation = 1

    access_attempt_count = _safe_int(failed_attempts, default=0)

    time_of_week = day_of_week * 24 + hour

    recent_logs = (
        db.query(AccessLog)
        .filter(AccessLog.user_id == user.id)
        .order_by(desc(AccessLog.timestamp))
        .limit(50)
        .all()
    )
    if recent_logs:
        hours = [log.timestamp.hour for log in recent_logs if log.timestamp]
        mean_hour = float(np.mean(hours)) if hours else 0.0
        hour_deviation_from_norm = abs(hour - mean_hour)
    else:
        hour_deviation_from_norm = 0.0

    raw = {
        "hour": hour,
        "day_of_week": day_of_week,
        "is_weekend": is_weekend,
        "access_frequency_24h": access_frequency_24h,
        "time_since_last_access_min": _safe_int(time_since_last_access_min, default=0),
        "location_match": location_match,
        "role_level": role_level,
        "is_restricted_area": is_restricted_area,
        "is_first_access_today": is_first_access_today,
        "sequential_zone_violation": sequential_zone_violation,
        "access_attempt_count": access_attempt_count,
        "time_of_week": time_of_week,
        "hour_deviation_from_norm": hour_deviation_from_norm,
    }

    clipped = {name: _clip_value(name, float(raw[name])) for name in FEATURE_COLS}

    scaler = get_scaler()
    ordered_raw = [clipped[name] for name in FEATURE_COLS]
    scaled_list = scaler.transform([ordered_raw])[0].tolist()
    scaled = {name: scaled_list[idx] for idx, name in enumerate(FEATURE_COLS)}

    return {"raw": clipped, "scaled": scaled, "list": scaled_list}


def determine_alert_type(features_raw: Dict, risk_score: float) -> str:
    hour = features_raw.get("hour", 0)
    is_weekend = features_raw.get("is_weekend", 0)
    is_restricted_area = features_raw.get("is_restricted_area", 0)
    role_level = features_raw.get("role_level", 1)
    access_frequency_24h = features_raw.get("access_frequency_24h", 0)
    time_since_last_access_min = features_raw.get("time_since_last_access_min", 0)
    location_match = features_raw.get("location_match", 1)

    if hour < 6 or hour > 22:
        return "unusual_hour"
    if is_weekend == 1:
        return "weekend_access"
    if is_restricted_area == 1 and role_level == 1:
        return "unauthorized_zone"
    if access_frequency_24h > 10:
        return "high_frequency"
    if time_since_last_access_min < 5 and location_match == 0:
        return "badge_cloning"
    if location_match == 0:
        return "location_mismatch"
    return "suspicious_pattern"


def determine_alert_severity(risk_score: float) -> str:
    if risk_score >= 0.85:
        return "critical"
    if risk_score >= 0.70:
        return "high"
    if risk_score >= 0.55:
        return "medium"
    return "low"
