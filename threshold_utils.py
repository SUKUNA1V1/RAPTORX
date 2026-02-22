from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
from model_registry import resolve_model_artifact_path


def resolve_alert_threshold(
    models_dir: str = "ml/models",
    if_data: dict[str, Any] | None = None,
    default: float = 0.50,
    prefer_ensemble: bool = True,
) -> tuple[float, str]:
    """
    Resolve the production alert threshold using a single precedence order.

    Precedence:
      1) ensemble_config.pkl -> best_threshold
      2) ensemble_config.pkl -> threshold
      3) provided if_data      -> best_threshold
      4) isolation_forest.pkl  -> best_threshold
      5) default
    """
    if prefer_ensemble:
        ensemble_path = Path(models_dir) / "ensemble_config.pkl"
        if ensemble_path.exists():
            try:
                ensemble = joblib.load(ensemble_path)
                best = ensemble.get("best_threshold")
                if best is not None:
                    return float(best), "ensemble_config.best_threshold"
                fallback = ensemble.get("threshold")
                if fallback is not None:
                    return float(fallback), "ensemble_config.threshold"
            except Exception:
                pass

    if if_data is not None:
        best_if = if_data.get("best_threshold")
        if best_if is not None:
            return float(best_if), "isolation_forest.best_threshold"

    if_path = Path(resolve_model_artifact_path("isolation_forest.pkl", "isolation_forest", models_dir))
    if if_path.exists():
        try:
            if_payload = joblib.load(if_path)
            best_if = if_payload.get("best_threshold")
            if best_if is not None:
                return float(best_if), "isolation_forest.best_threshold"
        except Exception:
            pass

    return float(default), f"default_{default:.2f}"
