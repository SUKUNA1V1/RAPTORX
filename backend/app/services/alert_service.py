from datetime import datetime, timezone

from sqlalchemy.orm import Session

from ..models import AnomalyAlert
from .ml_service import determine_alert_severity, determine_alert_type


def create_alert(db: Session, log_id: int, ml_result: dict, features_raw: dict, grant_threshold: float = 0.30, deny_threshold: float = 0.70) -> AnomalyAlert:
    """Create and persist an alert derived from ML decision output.
    
    Args:
        db: Database session
        log_id: ID of the access log entry
        ml_result: ML decision result dict containing risk_score, reasoning, mode
        features_raw: Raw feature vector for alert type determination
        grant_threshold: Grant decision threshold (from DecisionEngine)
        deny_threshold: Deny decision threshold (from DecisionEngine)
    
    Returns:
        Created and persisted AnomalyAlert
    """
    risk_score = float(ml_result.get("risk_score", 0.0))
    alert = AnomalyAlert(
        log_id=log_id,
        alert_type=determine_alert_type(features_raw, risk_score),
        severity=determine_alert_severity(risk_score, grant_threshold, deny_threshold),
        status="open",
        is_resolved=False,
        description=ml_result.get("reasoning"),
        confidence=risk_score,
        triggered_by=ml_result.get("mode"),
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


class AlertService:
    """Service for alert lifecycle operations (resolve/update state)."""
    def __init__(self, db: Session):
        self.db = db

    def resolve_alert(self, alert: AnomalyAlert, resolved_by: int | None = None) -> AnomalyAlert:
        """Mark an alert as resolved and persist resolver metadata."""
        alert.status = "resolved"
        alert.is_resolved = True
        alert.resolved_at = datetime.now(timezone.utc)
        alert.resolved_by = resolved_by
        self.db.add(alert)
        self.db.commit()
        self.db.refresh(alert)
        return alert

    def mark_false_positive(self, alert: AnomalyAlert, resolved_by: int | None = None) -> AnomalyAlert:
        """Mark an alert as false positive and close it."""
        alert.status = "false_positive"
        alert.is_resolved = True
        alert.resolved_at = datetime.now(timezone.utc)
        alert.resolved_by = resolved_by
        self.db.add(alert)
        self.db.commit()
        self.db.refresh(alert)
        return alert
