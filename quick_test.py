import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import f1_score, precision_score, recall_score
from tensorflow import keras
from model_registry import resolve_model_artifact_path
from threshold_utils import resolve_alert_threshold

FEATURE_COLS = [
    "hour", "day_of_week", "is_weekend",
    "access_frequency_24h", "time_since_last_access_min",
    "location_match", "role_level", "is_restricted_area",
    "is_first_access_today", "sequential_zone_violation",
    "access_attempt_count", "time_of_week", "hour_deviation_from_norm",
    "geographic_impossibility", "distance_between_scans_km",
    "velocity_km_per_min", "zone_clearance_mismatch",
    "department_zone_mismatch", "concurrent_session_detected",
]

# Models use only first 13 features
FEATURE_COLS_13 = FEATURE_COLS[:13]

# Load test data
test_df = pd.read_csv("data/processed/test_scaled.csv")
X_all = test_df[FEATURE_COLS].values
X = test_df[FEATURE_COLS_13].values  # Only 13 features for models
y = test_df["label"].values

# Load models
if_data = joblib.load(resolve_model_artifact_path("isolation_forest.pkl", "isolation_forest"))
if_model = if_data["model"]
ae_model = keras.models.load_model(resolve_model_artifact_path("autoencoder.keras", "autoencoder"))
ae_config = joblib.load(resolve_model_artifact_path("autoencoder_config.pkl", "autoencoder"))


# Get scores
raw = if_model.decision_function(X)
if_scores = np.clip(
    1 - (raw - if_data["min_score"]) / (if_data["max_score"] - if_data["min_score"] + 1e-9),
    0,
    1,
)
recon = ae_model.predict(X, verbose=0)
errors = np.mean(np.power(X - recon, 2), axis=1)
ae_scores = np.clip(
    (errors - ae_config["min_error"]) / (ae_config["max_error"] - ae_config["min_error"] + 1e-9),
    0,
    1,
)
combined = 0.3 * if_scores + 0.7 * ae_scores
threshold, threshold_source = resolve_alert_threshold(if_data=if_data)
preds = (combined >= threshold).astype(int)

# Metrics
f1 = f1_score(y, preds, zero_division=0)
prec = precision_score(y, preds, zero_division=0)
rec = recall_score(y, preds, zero_division=0)

print("=" * 50)
print("QUICK TEST RESULTS")
print("=" * 50)
print(f"Precision : {prec * 100:.1f}%")
print(f"Recall    : {rec * 100:.1f}%")
print(f"F1-Score  : {f1:.3f}")
print(f"Threshold : {threshold:.2f} ({threshold_source})")

if f1 >= 0.85:
    print("\nLooking good")
elif f1 >= 0.75:
    print("\nCould be better")
else:
    print("\nNeeds work")
print("=" * 50)
