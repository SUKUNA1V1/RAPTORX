"""
Train Isolation Forest using REAL retraining data.

Called during auto-retrain (every 40 days) using production access logs.
Uses: data/processed/retrain_train.csv (loaded from database)
"""

import os
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.metrics import confusion_matrix, precision_score, recall_score, f1_score, roc_auc_score
import joblib
import time

# Check if we're in retrain mode
RETRAIN_MODE = os.getenv("RETRAIN_MODE", "true").lower() == "true"

# Use retrain data if available
PROCESSED_DIR = "data/processed"
MODELS_DIR = "ml/models"
RESULTS_DIR = "ml/results/isolation_forest"
RANDOM_SEED = 42

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

os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(RESULTS_DIR, exist_ok=True)

# Determine which data to use
if RETRAIN_MODE:
    train_file = os.path.join(PROCESSED_DIR, "retrain_train.csv")
    test_file = os.path.join(PROCESSED_DIR, "retrain_test.csv")
    print("🔄 RETRAIN MODE: Using real production data from access logs")
else:
    train_file = os.path.join(PROCESSED_DIR, "train_scaled.csv")
    test_file = os.path.join(PROCESSED_DIR, "test_scaled.csv")
    print("📊 TRAINING MODE: Using generated synthetic data")

# Always save with same name so retrained models REPLACE old ones
model_name = "isolation_forest.pkl"

print("=" * 60)
print("ISOLATION FOREST TRAINING")
print("=" * 60)
print()

# Load data
print(f"Loading training data: {train_file}")
train_df = pd.read_csv(train_file)
test_df = pd.read_csv(test_file)

X_train_full = train_df[FEATURE_COLS].values
y_train_full = train_df["label"].values

X_test = test_df[FEATURE_COLS].values
y_test = test_df["label"].values

# Train on normal records only
X_train_normal = train_df[train_df["label"] == 0][FEATURE_COLS].values

print(f"Full train set    : {X_train_full.shape}")
print(f"Normal-only train : {X_train_normal.shape}")
print(f"Test set          : {X_test.shape}")
print(f"Anomaly ratio     : {y_test.mean() * 100:.2f}%")
print()

# Train model
print("Training Isolation Forest...")
start_time = time.time()

model = IsolationForest(
    n_estimators=200,
    contamination=0.08,
    max_samples=512,
    random_state=RANDOM_SEED,
    n_jobs=-1
)

model.fit(X_train_normal)

# Evaluate
raw_preds = model.predict(X_test)
y_pred = np.where(raw_preds == -1, 1, 0)
scores = model.decision_function(X_test)

precision = precision_score(y_test, y_pred, zero_division=0)
recall = recall_score(y_test, y_pred, zero_division=0)
f1 = f1_score(y_test, y_pred, zero_division=0)
auc = roc_auc_score(y_test, -scores)

elapsed = time.time() - start_time

print(f"Training time    : {elapsed:.1f}s")
print(f"Precision        : {precision * 100:.2f}%")
print(f"Recall           : {recall * 100:.2f}%")
print(f"F1-Score         : {f1:.4f}")
print(f"AUC-ROC          : {auc:.4f}")
print()

# Save model
min_score = scores.min()
max_score = scores.max()

model_data = {
    "model": model,
    "min_score": float(min_score),
    "max_score": float(max_score),
    "metrics": {
        "precision": float(precision),
        "recall": float(recall),
        "f1": float(f1),
        "auc": float(auc),
    }
}

model_path = os.path.join(MODELS_DIR, model_name)
joblib.dump(model_data, model_path)

print(f"✓ Model saved: {model_path}")
print()
