from datetime import datetime, timezone

from sqlalchemy.orm import Session

from ..models import AnomalyAlert


class AlertService:
    def __init__(self, db: Session):
        self.db = db

    def resolve_alert(self, alert: AnomalyAlert, resolved_by: int) -> AnomalyAlert:
        alert.status = "resolved"
        alert.is_resolved = True
        alert.resolved_at = datetime.now(timezone.utc)
        alert.resolved_by = resolved_by
        self.db.add(alert)
        self.db.commit()
        self.db.refresh(alert)
        return alert
