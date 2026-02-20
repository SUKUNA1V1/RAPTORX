import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split
from tensorflow import keras

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


def load_validation_data() -> pd.DataFrame:
    val_path = "data/processed/val_scaled.csv"
    train_path = "data/processed/train_scaled.csv"

    try:
        return pd.read_csv(val_path)
    except FileNotFoundError:
        train_df = pd.read_csv(train_path)
        _, val_df = train_test_split(
            train_df,
            test_size=0.2,
            random_state=42,
            stratify=train_df["label"],
        )
        return val_df.reset_index(drop=True)


def compute_scores(X, if_data, ae_model, ae_config):
    if_model = if_data["model"]
    if_min = if_data["min_score"]
    if_max = if_data["max_score"]

    raw = if_model.decision_function(X)
    if_scores = np.clip(1 - (raw - if_min) / (if_max - if_min + 1e-9), 0, 1)

    recon = ae_model.predict(X, verbose=0)
    errors = np.mean(np.power(X - recon, 2), axis=1)
    ae_scores = np.clip(
        (errors - ae_config["min_error"]) / (ae_config["max_error"] - ae_config["min_error"] + 1e-9),
        0,
        1,
    )

    return 0.3 * if_scores + 0.7 * ae_scores


# Load validation data
val_df = load_validation_data()
X_val = val_df[FEATURE_COLS].values
y_val = val_df["label"].values

# Load models
if_data = joblib.load("ml/models/isolation_forest.pkl")
ae_model = keras.models.load_model("ml/models/autoencoder.keras")
ae_config = joblib.load("ml/models/autoencoder_config.pkl")

# Get validation scores
combined = compute_scores(X_val, if_data, ae_model, ae_config)

print("=" * 60)
print("THRESHOLD TUNING ON VALIDATION SET")
print("=" * 60)

best_t = 0.5
best_f1 = 0.0
results = []

for t in np.arange(0.20, 0.90, 0.01):
    preds = (combined >= t).astype(int)
    f1 = f1_score(y_val, preds, zero_division=0)
    prec = precision_score(y_val, preds, zero_division=0)
    rec = recall_score(y_val, preds, zero_division=0)

    results.append({
        "threshold": round(float(t), 2),
        "f1": round(float(f1), 4),
        "precision": round(float(prec), 4),
        "recall": round(float(rec), 4),
    })

    if f1 > best_f1:
        best_f1 = f1
        best_t = float(t)

results_df = pd.DataFrame(results).sort_values("f1", ascending=False)
print("\nTop 15 threshold candidates:\n")
print(results_df.head(15).to_string(index=False))

print("\n" + "=" * 60)
print(f"BEST THRESHOLD: {best_t:.2f}")
print(f"Validation F1:  {best_f1:.4f}")
print("=" * 60)

# Evaluate on test set
test_df = pd.read_csv("data/processed/test_scaled.csv")
X_test = test_df[FEATURE_COLS].values
y_test = test_df["label"].values

combined_test = compute_scores(X_test, if_data, ae_model, ae_config)
preds_test = (combined_test >= best_t).astype(int)

f1_test = f1_score(y_test, preds_test, zero_division=0)
prec_test = precision_score(y_test, preds_test, zero_division=0)
rec_test = recall_score(y_test, preds_test, zero_division=0)
auc_test = roc_auc_score(y_test, combined_test)

print("\n" + "=" * 60)
print("TEST SET PERFORMANCE (with new threshold)")
print("=" * 60)
print(f"Precision : {prec_test * 100:.2f}%")
print(f"Recall    : {rec_test * 100:.2f}%")
print(f"F1-Score  : {f1_test:.4f}")
print(f"AUC-ROC   : {auc_test:.4f}")

print("\n" + "=" * 60)
print("FINAL VERDICT")
print("=" * 60)

if 0.85 <= f1_test <= 0.92:
    verdict = "EXCELLENT — Production-ready performance"
elif 0.80 <= f1_test < 0.85:
    verdict = "GOOD — Acceptable for production with monitoring"
elif 0.70 <= f1_test < 0.80:
    verdict = "MODERATE — Needs improvement before production"
else:
    verdict = "NEEDS WORK — Not ready for production"

print(f"\nTest F1: {f1_test:.4f}")
print(verdict)

if f1_test > 0.95:
    print("\nWARNING: F1 > 0.95 suggests data may still be too easy")
    print("Consider regenerating with more overlap")

# Update saved models
if_data["best_threshold"] = best_t
joblib.dump(if_data, "ml/models/isolation_forest.pkl")
print(f"\nUpdated threshold in isolation_forest.pkl: {best_t:.2f}")

try:
    ensemble = joblib.load("ml/models/ensemble_config.pkl")
    ensemble["best_threshold"] = best_t
    ensemble["threshold"] = best_t
    joblib.dump(ensemble, "ml/models/ensemble_config.pkl")
    print(f"Updated threshold in ensemble_config.pkl: {best_t:.2f}")
except Exception:
    pass

print("\n" + "=" * 60)
