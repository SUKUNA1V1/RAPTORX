import os
import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split
from tensorflow import keras
from model_registry import register_model_version, resolve_model_artifact_path

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

FEATURE_COLS_13 = FEATURE_COLS[:13]

RANDOM_SEED = int(os.getenv("RAPTORX_RANDOM_SEED", "42"))
TARGET_ANOMALY_RATIO = os.getenv("RAPTORX_TARGET_ANOMALY_RATIO")
MIN_PRECISION = float(os.getenv("RAPTORX_MIN_PRECISION", "0.72"))
MIN_RECALL = float(os.getenv("RAPTORX_MIN_RECALL", "0.80"))


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


def rebalance_for_target_prevalence(
    X: np.ndarray,
    y: np.ndarray,
    target_ratio: float,
    random_seed: int,
) -> tuple[np.ndarray, np.ndarray]:
    if not (0.0 < target_ratio < 0.5):
        raise ValueError(f"Invalid target anomaly ratio {target_ratio}; expected 0 < ratio < 0.5")

    normal_idx = np.where(y == 0)[0]
    anomaly_idx = np.where(y == 1)[0]
    if len(normal_idx) == 0 or len(anomaly_idx) == 0:
        return X, y

    rng = np.random.default_rng(random_seed)
    current_ratio = float(y.mean())

    if np.isclose(current_ratio, target_ratio, atol=1e-6):
        return X, y

    if target_ratio < current_ratio:
        normals_keep = normal_idx
        desired_anomaly_count = int(round((target_ratio / (1.0 - target_ratio)) * len(normals_keep)))
        desired_anomaly_count = max(1, min(desired_anomaly_count, len(anomaly_idx)))
        anomalies_keep = rng.choice(anomaly_idx, size=desired_anomaly_count, replace=False)
    else:
        anomalies_keep = anomaly_idx
        desired_normal_count = int(round(((1.0 - target_ratio) / target_ratio) * len(anomalies_keep)))
        desired_normal_count = max(1, min(desired_normal_count, len(normal_idx)))
        normals_keep = rng.choice(normal_idx, size=desired_normal_count, replace=False)

    keep_idx = np.concatenate([normals_keep, anomalies_keep])
    rng.shuffle(keep_idx)
    return X[keep_idx], y[keep_idx]


# Load validation data
val_df = load_validation_data()
X_val = val_df[FEATURE_COLS_13].values
y_val = val_df["label"].values

# Load models
if_data = joblib.load(resolve_model_artifact_path("isolation_forest.pkl", "isolation_forest"))
ae_model = keras.models.load_model(resolve_model_artifact_path("autoencoder.keras", "autoencoder"))
ae_config = joblib.load(resolve_model_artifact_path("autoencoder_config.pkl", "autoencoder"))

# Get validation scores
combined = compute_scores(X_val, if_data, ae_model, ae_config)

X_tune = X_val
y_tune = y_val
if TARGET_ANOMALY_RATIO is not None:
    target_ratio = float(TARGET_ANOMALY_RATIO)
    X_tune, y_tune = rebalance_for_target_prevalence(X_val, y_val, target_ratio, RANDOM_SEED)
    combined_tune = compute_scores(X_tune, if_data, ae_model, ae_config)
else:
    combined_tune = combined

print("\n" + "=" * 60)
print("THRESHOLD TUNING ON VALIDATION SET")
print("=" * 60)
print(f"Validation anomaly ratio (original): {y_val.mean() * 100:.2f}%")
print(f"Validation anomaly ratio (tuning)  : {y_tune.mean() * 100:.2f}%")
print(f"Minimum precision target           : {MIN_PRECISION:.2f}")
print(f"Minimum recall target              : {MIN_RECALL:.2f}")

# Find optimal grant threshold (maximize recall - catch normal cases)
# and optimal deny threshold (maximize precision - catch anomalies)
best_grant_t = 0.30
best_deny_t = 0.70
best_f1 = 0.0
best_metrics = {}
results = []

for t in np.arange(0.20, 0.90, 0.01):
    preds = (combined_tune >= t).astype(int)
    f1 = f1_score(y_tune, preds, zero_division=0)
    prec = precision_score(y_tune, preds, zero_division=0)
    rec = recall_score(y_tune, preds, zero_division=0)
    valid = prec >= MIN_PRECISION and rec >= MIN_RECALL

    results.append({
        "threshold": round(float(t), 2),
        "f1": round(float(f1), 4),
        "precision": round(float(prec), 4),
        "recall": round(float(rec), 4),
        "valid": bool(valid),
    })

    if f1 > best_f1 and valid:
        best_f1 = f1
        best_grant_t = float(t)
        best_metrics = {
            "f1": f1,
            "precision": prec,
            "recall": rec,
        }

# Deny threshold should be higher than grant threshold
# Use a higher percentile for deny - be stricter on denying
# Strategy: grant at best found threshold, deny at +0.20 or higher percentile
best_deny_t = min(0.80, best_grant_t + 0.25)

# Validate deny threshold choice
if best_grant_t < best_deny_t:
    print(f"\n✓ Valid threshold pair: grant={best_grant_t:.2f}, deny={best_deny_t:.2f}")
else:
    print(f"\n⚠ Deny must be > grant, adjusting...")
    best_deny_t = best_grant_t + 0.25

results_df = pd.DataFrame(results).sort_values("f1", ascending=False)
print("\nTop 15 threshold candidates:\n")
print(results_df.head(15).to_string(index=False))

print("\n" + "=" * 60)
print(f"BEST GRANT THRESHOLD: {best_grant_t:.2f}")
print(f"BEST DENY THRESHOLD:  {best_deny_t:.2f}")
print(f"Validation F1:  {best_metrics.get('f1', best_f1):.4f}")
print(f"Validation Precision: {best_metrics.get('precision', 0):.4f}")
print(f"Validation Recall:    {best_metrics.get('recall', 0):.4f}")
print("=" * 60)

# Evaluate on test set
test_df = pd.read_csv("data/processed/test_scaled.csv")
X_test = test_df[FEATURE_COLS_13].values
y_test = test_df["label"].values

combined_test = compute_scores(X_test, if_data, ae_model, ae_config)
# Using binary classification: normal if < grant_threshold, anomaly if >= grant_threshold
preds_test = (combined_test >= best_grant_t).astype(int)

f1_test = f1_score(y_test, preds_test, zero_division=0)
prec_test = precision_score(y_test, preds_test, zero_division=0)
rec_test = recall_score(y_test, preds_test, zero_division=0)
auc_test = roc_auc_score(y_test, combined_test)

print("\n" + "=" * 60)
print("TEST SET PERFORMANCE (with new thresholds)")
print("=" * 60)
print(f"Grant Threshold (normal if < this): {best_grant_t:.2f}")
print(f"Deny Threshold (deny if >= this):   {best_deny_t:.2f}")
print(f"\nBinary Classification Performance (anomaly detection):")
print(f"Precision : {prec_test * 100:.2f}%")
print(f"Recall    : {rec_test * 100:.2f}%")
print(f"F1-Score  : {f1_test:.4f}")
print(f"AUC-ROC   : {auc_test:.4f}")

print("\n" + "=" * 60)
print("FINAL VERDICT")
print("=" * 60)

if f1_test > 0.95:
    verdict = "VERY HIGH — likely too easy; increase overlap for realism"
elif 0.85 <= f1_test <= 0.92:
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

# Update saved models with both thresholds
if_data["best_threshold"] = best_grant_t
if_data["deny_threshold"] = best_deny_t
if_root_path = "ml/models/isolation_forest.pkl"
joblib.dump(if_data, if_root_path)
register_model_version("isolation_forest", [if_root_path], "ml/models")
print(f"\nUpdated thresholds in isolation_forest.pkl:")
print(f"  grant_threshold: {best_grant_t:.2f}")
print(f"  deny_threshold:  {best_deny_t:.2f}")

try:
    ensemble_path = resolve_model_artifact_path("ensemble_config.pkl", "ensemble")
    ensemble = joblib.load(ensemble_path)
    ensemble["best_threshold"] = best_grant_t
    ensemble["threshold"] = best_grant_t
    ensemble["grant_threshold"] = best_grant_t
    ensemble["deny_threshold"] = best_deny_t
    ensemble_root_path = "ml/models/ensemble_config.pkl"
    joblib.dump(ensemble, ensemble_root_path)
    register_model_version("ensemble", [ensemble_root_path], "ml/models")
    print(f"Updated thresholds in ensemble_config.pkl:")
    print(f"  grant_threshold: {best_grant_t:.2f}")
    print(f"  deny_threshold:  {best_deny_t:.2f}")
except Exception as e:
    print(f"Warning: Could not update ensemble_config: {e}")

print("\n" + "=" * 60)
