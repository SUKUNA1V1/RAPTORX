from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from ..config import settings
from ..models import AccessLog, AccessPoint, AnomalyAlert, User


class AccessService:
    """Service layer for synchronous rule-based access decisions and logging."""
    def __init__(self, db: Session):
        self.db = db

    def process_access_request(
        self, badge_id: str, access_point_id: int, timestamp: datetime
    ) -> Tuple[str, float, Optional[int], str]:
        """Validate access request, score risk, persist log, and optionally create alert."""
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=timezone.utc)

        user = self.db.query(User).filter(User.badge_id == badge_id).first()
        if not user:
            return "denied", 1.0, None, "unknown_badge"
        if not user.is_active:
            return "denied", 1.0, None, "deactivated_user"

        access_point = (
            self.db.query(AccessPoint)
            .filter(AccessPoint.id == access_point_id)
            .first()
        )
        if not access_point or access_point.status != "active":
            return "denied", 1.0, None, "invalid_access_point"

        if user.clearance_level < access_point.required_clearance:
            return "denied", 1.0, None, "insufficient_clearance"

        hour = timestamp.hour
        day_of_week = timestamp.weekday()
        is_weekend = day_of_week >= 5

        last_24h_start = timestamp - timedelta(hours=24)
        access_frequency_24h = (
            self.db.query(func.count(AccessLog.id))
            .filter(AccessLog.user_id == user.id)
            .filter(AccessLog.timestamp >= last_24h_start)
            .scalar()
        )

        last_log = (
            self.db.query(AccessLog)
            .filter(AccessLog.user_id == user.id)
            .filter(AccessLog.timestamp <= timestamp)
            .order_by(desc(AccessLog.timestamp))
            .first()
        )
        time_since_last_access_min = None
        if last_log and last_log.timestamp:
            delta = timestamp - last_log.timestamp
            delta_minutes = int(delta.total_seconds() / 60)
            if delta_minutes >= 0:
                time_since_last_access_min = delta_minutes

        location_match = self._location_match(user.department, access_point.zone)
        role_level = self._role_level(user.role)
        is_restricted_area = bool(access_point.is_restricted)

        risk_score, alert_type = self._calculate_risk_score(
            hour=hour,
            is_weekend=is_weekend,
            role=user.role,
            location_match=location_match,
            is_restricted_area=is_restricted_area,
            clearance_level=user.clearance_level,
            access_frequency_24h=access_frequency_24h or 0,
            time_since_last_access_min=time_since_last_access_min,
        )

        if risk_score < settings.DECISION_THRESHOLD_GRANT:
            decision = "granted"
        elif risk_score < settings.DECISION_THRESHOLD_DENY:
            decision = "delayed"
        else:
            decision = "denied"

        access_log = AccessLog(
            user_id=user.id,
            access_point_id=access_point.id,
            timestamp=timestamp,
            decision=decision,
            risk_score=risk_score,
            method="rule_based",
            hour=hour,
            day_of_week=day_of_week,
            is_weekend=is_weekend,
            access_frequency_24h=access_frequency_24h,
            time_since_last_access_min=time_since_last_access_min,
            location_match=location_match,
            role_level=role_level,
            is_restricted_area=is_restricted_area,
            badge_id_used=badge_id,
            context={
                "access_point_zone": access_point.zone,
                "user_department": user.department,
            },
        )

        self.db.add(access_log)
        self.db.flush()

        if decision in ("denied", "delayed") and risk_score >= 0.5:
            self._create_alert(access_log, alert_type, risk_score)

        self.db.commit()
        self.db.refresh(access_log)

        return decision, risk_score, access_log.id, "risk_score"

    def _create_alert(self, access_log: AccessLog, alert_type: str, risk_score: float) -> None:
        """Persist an anomaly alert linked to an access log entry."""
        severity = self._severity_from_score(risk_score)
        alert = AnomalyAlert(
            log_id=access_log.id,
            alert_type=alert_type,
            severity=severity,
            status="open",
            is_resolved=False,
            description=f"Rule-based alert: {alert_type}",
            confidence=risk_score,
            triggered_by="rule_engine",
        )
        self.db.add(alert)

    @staticmethod
    def _location_match(department: Optional[str], zone: Optional[str]) -> bool:
        """Return whether user's department aligns with access-point zone."""
        if not department or not zone:
            return False
        return department.strip().lower() == zone.strip().lower()

    @staticmethod
    def _role_level(role: str) -> int:
        """Map role names to comparable integer privilege levels."""
        mapping = {
            "employee": 1,
            "manager": 2,
            "admin": 3,
            "security": 2,
            "contractor": 1,
            "visitor": 1,
        }
        return mapping.get(role, 1)

    @staticmethod
    def _severity_from_score(score: float, grant_threshold: float = 0.30, deny_threshold: float = 0.70) -> str:
        """Convert risk score to alert severity tier using dynamic thresholds.
        
        Args:
            score: Risk score (0.0-1.0)
            grant_threshold: Score below this = low risk
            deny_threshold: Score above this = high risk
        
        Returns:
            Severity level: 'low', 'medium', 'high', or 'critical'
        """
        # Granted decisions are never critical, even if features are unusual
        if score < grant_threshold:
            return "low"
        if score >= min(0.99, deny_threshold + 0.20):  # Critical zone
            return "critical"
        if score >= deny_threshold:
            return "high"
        if score >= (grant_threshold + deny_threshold) / 2:  # Medium zone
            return "medium"
        return "low"

    @staticmethod
    def _calculate_risk_score(
        *,
        hour: int,
        is_weekend: bool,
        role: str,
        location_match: bool,
        is_restricted_area: bool,
        clearance_level: int,
        access_frequency_24h: int,
        time_since_last_access_min: Optional[int],
    ) -> Tuple[float, str]:
        """Compute rule-based risk score and most relevant alert type."""
        score = 0.0
        triggered = []

        if hour < 6 or hour > 22:
            score += 0.35
            triggered.append(("off_hours", 0.35))
        if is_weekend and role not in ("admin", "security"):
            score += 0.20
            triggered.append(("weekend_access", 0.20))
        if not location_match:
            score += 0.20
            triggered.append(("location_mismatch", 0.20))
        if is_restricted_area and clearance_level < 4:
            score += 0.30
            triggered.append(("restricted_area", 0.30))
        if access_frequency_24h > 10:
            score += 0.25
            triggered.append(("high_frequency", 0.25))
        if time_since_last_access_min is not None and time_since_last_access_min < 5:
            score += 0.30
            triggered.append(("rapid_repeat", 0.30))

        score = min(score, 1.0)
        alert_type = max(triggered, key=lambda item: item[1])[0] if triggered else "rule_based"

        return score, alert_type
