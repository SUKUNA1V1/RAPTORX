"""Explainability API endpoints."""

import sys
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
import numpy as np

# Add workspace root to path to import explainability module from root level
workspace_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(workspace_root))

from explainability import ModelExplainer, DecisionExplanation
from ..database import get_db
from ..models import AccessLog

explainability_router = APIRouter(prefix="/explainations", tags=["explainability"])

# Initialize explainer
try:
    explainer = ModelExplainer()
except Exception as e:
    explainer = None
    print(f"Warning: Could not initialize explainer: {e}")


@explainability_router.get("/decision/{log_id}")
def explain_access_decision(
    log_id: int,
    db: Session = Depends(get_db),
):
    """Get detailed explanation for a specific access decision."""
    if not explainer:
        raise HTTPException(
            status_code=503,
            detail="Explainability service not available",
        )
    
    try:
        # Get the access log
        log = db.query(AccessLog).filter(AccessLog.id == log_id).first()
        if not log:
            raise HTTPException(
                status_code=404,
                detail=f"Access log {log_id} not found",
            )
        
        # Get the features from metadata (or reconstruct if needed)
        features_dict = log.features_metadata or {}
        
        # Convert to numpy array
        feature_names = [
            "hour", "day_of_week", "is_weekend",
            "access_frequency_24h", "time_since_last_access_min",
            "location_match", "role_level", "is_restricted_area",
            "is_first_access_today", "sequential_zone_violation",
            "access_attempt_count", "time_of_week", "hour_deviation_from_norm",
        ]
        
        features = np.array([
            float(features_dict.get(name, 0.5)) for name in feature_names
        ]).reshape(1, -1)
        
        # Get scores (these should be in the log)
        if_score = log.ml_if_score or 0.5
        ae_score = log.ml_ae_score or 0.5
        combined_score = log.ml_combined_score or 0.5
        
        # Generate explanation
        explanation = explainer.explain_decision(
            features=features,
            if_score=if_score,
            ae_score=ae_score,
            combined_score=combined_score,
            decision=log.decision,
        )
        
        return {
            "access_log_id": log_id,
            "user": {
                "badge_id": log.badge_id,
                "timestamp": log.timestamp.isoformat(),
            },
            "explanation": {
                "decision": explanation.decision,
                "confidence": explanation.confidence,
                "reason": explanation.reason,
                "risk_level": explanation.risk_level,
                "scores": {
                    "isolation_forest": explanation.if_score,
                    "autoencoder": explanation.ae_score,
                    "combined": explanation.combined_score,
                    "threshold": explanation.threshold,
                },
                "top_features": [
                    {
                        "name": f.feature_name,
                        "value": f.value,
                        "contribution": f.contribution,
                        "importance": f.importance,
                        "percentile": f.percentile,
                    }
                    for f in explanation.top_features
                ],
                "feature_warnings": explanation.feature_warnings,
                "contributing_factors": explanation.contributing_factors,
            },
        }
    
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating explanation: {str(exc)}",
        ) from exc


@explainability_router.get("/feature-importance")
def get_feature_importance():
    """Get global feature importance across all decisions."""
    if not explainer:
        raise HTTPException(
            status_code=503,
            detail="Explainability service not available",
        )
    
    try:
        importance_data = explainer.explain_feature_importance()
        return importance_data
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error computing feature importance: {str(exc)}",
        ) from exc


@explainability_router.get("/threshold-behavior")
def get_threshold_behavior():
    """Get explanation of threshold behavior and decision boundaries."""
    if not explainer:
        raise HTTPException(
            status_code=503,
            detail="Explainability service not available",
        )
    
    try:
        threshold_info = explainer.explain_threshold_behavior()
        return threshold_info
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving threshold info: {str(exc)}",
        ) from exc


@explainability_router.get("/model-insights")
def get_model_insights():
    """Get general model insights and behavior patterns."""
    if not explainer:
        raise HTTPException(
            status_code=503,
            detail="Explainability service not available",
        )
    
    try:
        return {
            "timestamp": str(__import__("datetime").datetime.utcnow().isoformat()),
            "model_type": "Isolation Forest + Autoencoder Ensemble",
            "ensemble_method": "Weighted average of anomaly scores",
            "weights": {
                "isolation_forest": 0.5,
                "autoencoder": 0.5,
            },
            "feature_count": 13,
            "decision_threshold": float(explainer.best_threshold),
            "model_behavior": {
                "sensitivity": "High sensitivity to early detections",
                "false_positive_strategy": "Conservative (prefer false positives over false negatives)",
                "false_negative_strategy": "Critical security incidents must not be missed",
            },
            "strengths": [
                "Detects unusual patterns in feature combinations",
                "Unsupervised learning handles evolving threats",
                "Ensemble approach provides robustness",
            ],
            "limitations": [
                "Requires sufficient historical data for training",
                "Feature engineering crucial for performance",
                "May flag legitimate but unusual access patterns",
            ],
        }
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving insights: {str(exc)}",
        ) from exc
