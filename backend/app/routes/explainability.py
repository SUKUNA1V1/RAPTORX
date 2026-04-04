"""Explainability API endpoints."""

import sys
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
import numpy as np

# Add scripts directory to path to import explainability module
scripts_dir = Path(__file__).resolve().parents[3] / "scripts"
sys.path.insert(0, str(scripts_dir))

from explainability import ModelExplainer
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
        
        # Get features from log context (or reconstruct from direct columns)
        context = log.context or {}
        features_dict = context.get("features_raw") if isinstance(context, dict) else None
        if not isinstance(features_dict, dict):
            features_dict = {}
        
        # Convert to numpy array
        feature_names = [
            "hour", "day_of_week", "is_weekend",
            "access_frequency_24h", "time_since_last_access_min",
            "location_match", "role_level", "is_restricted_area",
            "is_first_access_today", "sequential_zone_violation",
            "access_attempt_count", "time_of_week", "hour_deviation_from_norm",
        ]
        
        fallback_feature_values = {
            "hour": log.hour,
            "day_of_week": log.day_of_week,
            "is_weekend": log.is_weekend,
            "access_frequency_24h": log.access_frequency_24h,
            "time_since_last_access_min": log.time_since_last_access_min,
            "location_match": log.location_match,
            "role_level": log.role_level,
            "is_restricted_area": log.is_restricted_area,
            "is_first_access_today": log.is_first_access_today,
            "sequential_zone_violation": log.sequential_zone_violation,
            "access_attempt_count": log.access_attempt_count,
            "time_of_week": log.time_of_week,
            "hour_deviation_from_norm": log.hour_deviation_from_norm,
        }

        features = np.array([
            float(
                features_dict.get(
                    name,
                    0.5 if fallback_feature_values.get(name) is None else fallback_feature_values.get(name),
                )
            )
            for name in feature_names
        ]).reshape(1, -1)
        
        # Get scores from context if available, else fall back to stored risk score
        if_score = float(context.get("if_score", log.risk_score if log.risk_score is not None else 0.5))
        ae_score = float(context.get("ae_score", log.risk_score if log.risk_score is not None else 0.5))
        combined_score = float(context.get("combined_score", log.risk_score if log.risk_score is not None else 0.5))
        
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
                "badge_id": log.badge_id_used,
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
    
    except HTTPException:
        raise
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
        # Return just the features array (what frontend expects)
        features = importance_data.get("features", [])
        # Add rank to each feature
        for idx, feature in enumerate(features):
            feature["rank"] = idx + 1
        return features
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
    """Get model architecture insights and descriptions."""
    if not explainer:
        raise HTTPException(
            status_code=503,
            detail="Explainability service not available",
        )
    
    try:
        return {
            "isolation_forest": {
                "description": "Tree-based ensemble anomaly detection using isolation algorithm. Constructs random forests where anomalies are isolated in fewer splits than normal observations.",
                "architecture": "100 trees, max_samples='auto', max_features=1.0, contamination=0.1",
                "features": [
                    "hour",
                    "day_of_week",
                    "access_frequency_24h",
                    "time_since_last_access_min",
                    "location_match",
                    "role_level",
                    "is_restricted_area",
                    "access_attempt_count",
                    "is_weekend",
                    "is_first_access_today",
                    "sequential_zone_violation",
                    "time_of_week",
                    "hour_deviation_from_norm"
                ]
            },
            "autoencoder": {
                "description": "Deep neural network for unsupervised anomaly detection. Learns compressed representation of normal access patterns; reconstruction error indicates anomalies.",
                "architecture": "Input(13) → Dense(26,relu) → Dense(13,relu) → Dense(6,relu) → Dense(13,relu) → Dense(26,relu) → Output(13)",
                "features": [
                    "hour",
                    "day_of_week",
                    "access_frequency_24h",
                    "time_since_last_access_min",
                    "location_match",
                    "role_level",
                    "is_restricted_area",
                    "access_attempt_count",
                    "is_weekend",
                    "is_first_access_today",
                    "sequential_zone_violation",
                    "time_of_week",
                    "hour_deviation_from_norm"
                ]
            },
            "ensemble": {
                "description": "Combines Isolation Forest (50%) and Autoencoder (50%) anomaly scores. Weighted averaging provides robust detection by leveraging diverse algorithmic strengths.",
                "method": "Weighted Average (IF: 50%, AE: 50%)"
            }
        }
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving insights: {str(exc)}",
        ) from exc
