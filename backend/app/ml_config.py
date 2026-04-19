"""
Centralized ML configuration and feature definitions.

This module serves as the single source of truth for:
- Feature column definitions
- Model weights and thresholds
- ML pipeline configuration

All ML components (backend service, scripts, training) should import from this module
to ensure consistency and prevent feature mismatches.
"""

import os
from typing import Dict, List, Tuple

# ============================================================================
# FEATURE DEFINITIONS
# ============================================================================

# Base 13 features used by runtime model for predictions
FEATURES_RUNTIME = [
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

# Extended features used during training/analysis but not runtime
FEATURES_EXTENDED = [
    "geographic_impossibility",
    "distance_between_scans_km",
    "velocity_km_per_min",
    "zone_clearance_mismatch",
    "department_zone_mismatch",
    "concurrent_session_detected",
]

# Combined feature set for comprehensive analysis
FEATURES_ALL = FEATURES_RUNTIME + FEATURES_EXTENDED

# Feature value ranges for validation and normalization
FEATURE_RANGES: Dict[str, Tuple[float, float]] = {
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
    "geographic_impossibility": (0, 1),
    "distance_between_scans_km": (0, 100.0),
    "velocity_km_per_min": (0, 1000.0),
    "zone_clearance_mismatch": (0, 1),
    "department_zone_mismatch": (0, 1),
    "concurrent_session_detected": (0, 1),
}

# ============================================================================
# MODEL CONFIGURATION
# ============================================================================

# Ensemble model weights (must sum to 1.0)
ENSEMBLE_WEIGHTS = {
    "isolation_forest": 0.3,  # 30%
    "autoencoder": 0.7,  # 70%
}

# Verify weights sum to 1.0
assert sum(ENSEMBLE_WEIGHTS.values()) == 1.0, "Ensemble weights must sum to 1.0"

# Decision thresholds for access decisions
# NOTE: Thresholds are now loaded dynamically from DecisionEngine
# They are loaded from ensemble_config.pkl, isolation_forest.pkl, env vars, or defaults (0.30, 0.70)
# Do NOT hardcode thresholds here - they will be overridden by auto-retuning
DECISION_THRESHOLDS = {
    "grant": None,      # Loaded dynamically from DecisionEngine
    "delayed": None,    # Loaded dynamically from DecisionEngine
    "deny": None,       # Loaded dynamically from DecisionEngine
}

# ============================================================================
# MODEL ARTIFACT PATHS
# ============================================================================

def get_models_dir() -> str:
    """Get the absolute path to ML models directory."""
    base = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
    return os.path.join(base, "ml", "models")

MODEL_PATHS = {
    "isolation_forest": os.path.join(get_models_dir(), "isolation_forest.pkl"),
    "autoencoder": os.path.join(get_models_dir(), "autoencoder.keras"),
    "scaler_13": os.path.join(get_models_dir(), "scaler_13.pkl"),
    "scaler_19": os.path.join(get_models_dir(), "scaler_19.pkl"),
    "scaler_legacy": os.path.join(get_models_dir(), "scaler.pkl"),
    "ensemble_config": os.path.join(get_models_dir(), "ensemble_config.pkl"),
    "thresholds": os.path.join(get_models_dir(), "current.json"),
    "versions": os.path.join(get_models_dir(), "versions"),
}

# ============================================================================
# VALIDATION FUNCTIONS
# ============================================================================

def validate_feature_columns(
    df_columns: List[str],
    mode: str = "runtime"
) -> bool:
    """
    Validate that required features are present in a dataframe.
    
    Args:
        df_columns: Column names from dataframe
        mode: "runtime" for predictions, "training" for full set
    
    Returns:
        True if valid
    
    Raises:
        ValueError: If required features are missing
    """
    required = FEATURES_RUNTIME if mode == "runtime" else FEATURES_ALL
    missing = [f for f in required if f not in df_columns]
    
    if missing:
        raise ValueError(
            f"Missing required features for {mode} mode: {missing}\n"
            f"Expected: {required}\n"
            f"Got: {df_columns}"
        )
    
    return True

def validate_feature_values(
    features_dict: Dict[str, float],
    mode: str = "runtime"
) -> bool:
    """
    Validate that feature values are within expected ranges.
    
    Args:
        features_dict: Dictionary of feature names to values
        mode: "runtime" or "training"
    
    Returns:
        True if valid
    
    Raises:
        ValueError: If any value is out of range
    """
    required_features = FEATURES_RUNTIME if mode == "runtime" else FEATURES_ALL
    
    for feature in required_features:
        if feature not in features_dict:
            raise ValueError(f"Missing feature: {feature}")
        
        value = features_dict[feature]
        min_val, max_val = FEATURE_RANGES[feature]
        
        if not (min_val <= value <= max_val):
            raise ValueError(
                f"Feature '{feature}' value {value} out of range [{min_val}, {max_val}]"
            )
    
    return True

# ============================================================================
# CONFIGURATION RETRIEVAL
# ============================================================================

def get_decision_threshold(decision_type: str) -> float:
    """Get decision threshold (grant, delayed, or deny)."""
    if decision_type not in DECISION_THRESHOLDS:
        raise ValueError(f"Unknown decision type: {decision_type}")
    return DECISION_THRESHOLDS[decision_type]

def get_ensemble_weight(model_name: str) -> float:
    """Get weight for ensemble model component."""
    if model_name not in ENSEMBLE_WEIGHTS:
        raise ValueError(f"Unknown model: {model_name}")
    return ENSEMBLE_WEIGHTS[model_name]

def get_model_path(model_name: str) -> str:
    """Get path to model artifact file."""
    if model_name not in MODEL_PATHS:
        raise ValueError(f"Unknown model path: {model_name}")
    return MODEL_PATHS[model_name]

# ============================================================================
# FEATURE DESCRIPTIONS (for UI and documentation)
# ============================================================================

FEATURE_DESCRIPTIONS = {
    "hour": "Hour of day when access was requested (0-23)",
    "day_of_week": "Day of week (0=Monday, 6=Sunday)",
    "is_weekend": "Whether access occurred on weekend (0 or 1)",
    "access_frequency_24h": "Number of access attempts in past 24 hours",
    "time_since_last_access_min": "Minutes since user's last access",
    "location_match": "Whether access point matches user's assigned zone",
    "role_level": "User's privilege level (1=employee, 2=manager, 3=admin)",
    "is_restricted_area": "Whether access point is in restricted area",
    "is_first_access_today": "Whether this is user's first access today",
    "sequential_zone_violation": "Multiple zone changes within short timeframe (badge cloning indicator)",
    "access_attempt_count": "Number of failed access attempts",
    "time_of_week": "Composite time feature (day_of_week * 24 + hour)",
    "hour_deviation_from_norm": "Deviation from user's normal access hour pattern",
    "geographic_impossibility": "Travel speed would be physically impossible",
    "distance_between_scans_km": "Physical distance between last two access points",
    "velocity_km_per_min": "Calculated travel velocity (km/min)",
    "zone_clearance_mismatch": "User's clearance level doesn't match zone requirement",
    "department_zone_mismatch": "User's department doesn't typically access this zone",
    "concurrent_session_detected": "User accessed multiple zones simultaneously",
}
