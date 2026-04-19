"""
Create Ensemble using REAL retraining data.

Called during auto-retrain (every 40 days) using production access logs.
Combines Isolation Forest + Autoencoder with weighted ensemble (0.3 IF + 0.7 AE).
"""

import os
import joblib
import numpy as np
import pandas as pd

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
print("ENSEMBLE CREATION")
print("=" * 60)
print()

# Always use same paths - retrained models already replaced old ones
if RETRAIN_MODE:
    print("🔄 RETRAIN MODE: Creating ensemble from freshly retrained models")
else:
    print("📊 TRAINING MODE: Creating ensemble from initial models")

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
    print(f"✓ IF model loaded")
    print(f"✓ AE model loaded")
except Exception as e:
    print(f"✗ Error loading models: {e}")
    exit(1)

# Load test data
print(f"\nLoading test data...")
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

print(f"IF scores   - mean: {if_scores.mean():.4f}, std: {if_scores.std():.4f}")
print(f"AE scores   - mean: {ae_scores.mean():.4f}, std: {ae_scores.std():.4f}")
print(f"Ensemble    - mean: {ensemble_scores.mean():.4f}, std: {ensemble_scores.std():.4f}")
print()

# Save ensemble configuration
ensemble_config = {
    "if_weight": 0.3,
    "ae_weight": 0.7,
    "if_model_path": if_model_path,
    "ae_model_path": ae_model_path,
    "if_metrics": if_data.get("metrics", {}),
    "ae_config": ae_config,
}

joblib.dump(ensemble_config, ensemble_config_path)
print(f"✓ Ensemble config saved: {ensemble_config_path}")
print()

print("✓ Ensemble created successfully!")
print("  Configuration:")
print("    - Isolation Forest weight: 30%")
print("    - Autoencoder weight: 70%")
print()
