"""
Retune Thresholds using REAL retraining data.

Called during auto-retrain (every 40 days) using production access logs.
Optimizes decision thresholds to maximize F1 score on real data.
"""

import os
import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import f1_score, precision_score, recall_score

# Check if we're in retrain mode
RETRAIN_MODE = os.getenv("RETRAIN_MODE", "true").lower() == "true"

PROCESSED_DIR = "data/processed"
MODELS_DIR = "ml/models"
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
    "hour_deviation_from_norm"
]

print("=" * 60)
print("THRESHOLD RETUNING")
print("=" * 60)
print()

# Always use same paths - retrained models already replaced old ones
if RETRAIN_MODE:
    print("🔄 RETRAIN MODE: Tuning thresholds on real data")
else:
    print("📊 TRAINING MODE: Tuning thresholds on generated data")

if_model_path = os.path.join(MODELS_DIR, "isolation_forest.pkl")
ae_model_path = os.path.join(MODELS_DIR, "autoencoder.keras")
ae_config_path = os.path.join(MODELS_DIR, "autoencoder_config.pkl")
ensemble_config_path = os.path.join(MODELS_DIR, "ensemble_config.pkl")

print()

# Load models
print("Loading models...")
try:
    from tensorflow import keras
    if_data = joblib.load(if_model_path)
    ae_model = keras.models.load_model(ae_model_path)
    ae_config = joblib.load(ae_config_path)
    ensemble_config = joblib.load(ensemble_config_path)
    print(f"✓ Models loaded")
except Exception as e:
    print(f"✗ Error loading models: {e}")
    exit(1)

# Load test data
print(f"Loading test data...")
if RETRAIN_MODE:
    test_file = os.path.join(PROCESSED_DIR, "retrain_test.csv")
else:
    test_file = os.path.join(PROCESSED_DIR, "test_scaled.csv")

test_df = pd.read_csv(test_file)
X_test = test_df[FEATURE_COLS].values
y_test = test_df["label"].values

print(f"Test set: {X_test.shape}")
print()

# Compute ensemble scores
print("Computing ensemble scores...")

if_model = if_data["model"]
raw = if_model.decision_function(X_test)
if_scores = np.clip(
    1 - (raw - if_data["min_score"]) / (if_data["max_score"] - if_data["min_score"] + 1e-9),
    0,
    1
)

ae_recon = ae_model.predict(X_test, verbose=0)
ae_errors = np.mean(np.power(X_test - ae_recon, 2), axis=1)
ae_scores = np.clip(
    (ae_errors - ae_config["min_error"]) / (ae_config["max_error"] - ae_config["min_error"] + 1e-9),
    0,
    1
)

# Ensemble: 30% IF + 70% AE
ensemble_scores = 0.3 * if_scores + 0.7 * ae_scores

print(f"Ensemble scores - mean: {ensemble_scores.mean():.4f}, std: {ensemble_scores.std():.4f}")
print()

# Find optimal threshold
print("Finding optimal threshold...")

thresholds = np.arange(0.1, 0.95, 0.05)
best_f1 = 0
best_threshold = 0.5
best_metrics = {}

for threshold in thresholds:
    y_pred = (ensemble_scores >= threshold).astype(int)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    
    if f1 > best_f1:
        best_f1 = f1
        best_threshold = threshold
        best_metrics = {
            "precision": precision_score(y_test, y_pred, zero_division=0),
            "recall": recall_score(y_test, y_pred, zero_division=0),
            "f1": f1,
        }

print(f"Best threshold: {best_threshold:.3f}")
print(f"  Precision: {best_metrics['precision'] * 100:.2f}%")
print(f"  Recall: {best_metrics['recall'] * 100:.2f}%")
print(f"  F1-Score: {best_metrics['f1']:.4f}")
print()

# Save threshold
threshold_config = {
    "threshold": float(best_threshold),
    "metrics": best_metrics,
    "data_source": "REAL" if RETRAIN_MODE else "SYNTHETIC",
}

threshold_path = os.path.join(MODELS_DIR, "current.json")
import json
with open(threshold_path, 'w') as f:
    json.dump(threshold_config, f, indent=2)

print(f"✓ Threshold saved to {threshold_path}")
print()

print("✓ Threshold retuning completed!")
print()
