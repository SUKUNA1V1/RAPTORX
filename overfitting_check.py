import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import confusion_matrix, f1_score, precision_score, recall_score
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


def load_models():
    if_data = joblib.load(resolve_model_artifact_path("isolation_forest.pkl", "isolation_forest"))
    ae_model = keras.models.load_model(resolve_model_artifact_path("autoencoder.keras", "autoencoder"))
    ae_config = joblib.load(resolve_model_artifact_path("autoencoder_config.pkl", "autoencoder"))
    try:
        scaler = joblib.load("ml/models/scaler_19.pkl")
    except Exception:
        scaler = joblib.load("ml/models/scaler.pkl")
    return if_data, ae_model, ae_config, scaler


def score_dataset(df: pd.DataFrame, if_data: dict, ae_model, ae_config: dict, threshold: float):
    X_all = df[FEATURE_COLS].values
    X = df[FEATURE_COLS_13].values  # Only 13 features for models
    y = df["label"].values

    if_model = if_data["model"]
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
    preds = (combined >= threshold).astype(int)

    metrics = {
        "precision": precision_score(y, preds, zero_division=0),
        "recall": recall_score(y, preds, zero_division=0),
        "f1": f1_score(y, preds, zero_division=0),
        "preds": preds,
        "combined": combined,
        "y": y,
    }
    return metrics


def print_split_metrics(name: str, metrics: dict):
    y = metrics["y"]
    print(f"\n{name} SET:")
    print(f"  Precision : {metrics['precision'] * 100:.2f}%")
    print(f"  Recall    : {metrics['recall'] * 100:.2f}%")
    print(f"  F1-Score  : {metrics['f1']:.4f}")
    print(f"  Anomaly % : {y.mean() * 100:.1f}%")


def run_edge_cases(if_data, ae_model, ae_config, scaler, threshold: float):
    print("\n" + "=" * 60)
    print("TEST 2 — Edge Cases (never seen in training)")
    print("=" * 60)

    edge_cases = [
        {"name": "Night shift worker (legitimate 2AM)", "label": 0, "features": [2, 0, 0, 3, 120, 1, 2, 0, 1, 0, 0, 2, 1.5, 0, 0.1, 0.001, 0, 0, 0]},
        {"name": "Admin working Saturday (legitimate)", "label": 0, "features": [10, 5, 1, 2, 200, 1, 3, 1, 1, 0, 0, 130, 0.5, 0, 0.2, 0.001, 0, 0, 0]},
        {"name": "Employee covering colleague (different zone)", "label": 0, "features": [9, 1, 0, 4, 90, 0, 1, 0, 0, 0, 0, 33, 0.8, 0, 0.4, 0.004, 0, 0, 0]},
        {"name": "New employee first week (unusual patterns)", "label": 0, "features": [8, 0, 0, 6, 45, 1, 1, 0, 1, 0, 1, 8, 2.1, 0, 0.1, 0.002, 0, 0, 0]},
        {"name": "On-call engineer late night (legitimate)", "label": 0, "features": [23, 3, 0, 2, 180, 1, 2, 1, 1, 0, 0, 95, 2.8, 0, 0.2, 0.001, 0, 0, 0]},
        {"name": "Janitor early morning (legitimate)", "label": 0, "features": [5, 1, 0, 3, 240, 1, 1, 0, 1, 0, 0, 29, 0.3, 0, 0.1, 0.0, 0, 0, 0]},
        {"name": "Badge cloning attempt", "label": 1, "features": [9, 0, 0, 15, 2, 0, 1, 0, 0, 1, 4, 9, 4.0, 1, 50.0, 25.0, 0, 0, 1]},
        {"name": "Unauthorized zone + high frequency", "label": 1, "features": [3, 6, 1, 20, 5, 0, 1, 1, 0, 1, 5, 147, 6.0, 0, 0.4, 0.08, 1, 1, 0]},
        {"name": "Slow data exfiltration (subtle)", "label": 1, "features": [14, 2, 0, 9, 25, 0, 1, 1, 0, 0, 1, 62, 2.5, 0, 0.6, 0.024, 1, 1, 0]},
        {"name": "Weekend intruder after hours", "label": 1, "features": [2, 6, 1, 12, 8, 0, 1, 1, 1, 1, 3, 146, 7.5, 0, 0.8, 0.1, 1, 1, 0]},
    ]

    if_model = if_data["model"]
    correct = 0
    for case in edge_cases:
        raw_f = np.array(case["features"]).reshape(1, -1)
        raw_df = pd.DataFrame(raw_f, columns=FEATURE_COLS)
        scaled_f_all = scaler.transform(raw_df)
        scaled_f = scaled_f_all[:, :13]  # Only first 13 features for models

        raw_s = if_model.decision_function(scaled_f)[0]
        if_s = float(np.clip(1 - (raw_s - if_data["min_score"]) / (if_data["max_score"] - if_data["min_score"] + 1e-9), 0, 1))

        recon = ae_model.predict(scaled_f, verbose=0)
        error = float(np.mean(np.power(scaled_f - recon, 2)))
        ae_s = float(np.clip((error - ae_config["min_error"]) / (ae_config["max_error"] - ae_config["min_error"] + 1e-9), 0, 1))

        combined = 0.3 * if_s + 0.7 * ae_s
        pred = 1 if combined >= threshold else 0
        expected = case["label"]
        ok = pred == expected
        if ok:
            correct += 1

        status = "OK" if ok else "WRONG"
        expected_str = "ANOMALY" if expected == 1 else "NORMAL"
        pred_str = "ANOMALY" if pred == 1 else "NORMAL"

        print(f"\n  {status} {case['name']}")
        print(f"     Expected: {expected_str}")
        print(f"     Got     : {pred_str}")
        print(f"     Risk    : {combined:.4f}  (IF:{if_s:.3f} AE:{ae_s:.3f})")

    accuracy = correct / len(edge_cases)
    print(f"\n  Edge case accuracy: {correct}/{len(edge_cases)} ({accuracy * 100:.0f}%)")

    if correct >= 9:
        print("  EXCELLENT — Strong generalization")
    elif correct >= 7:
        print("  GOOD — Acceptable generalization")
    elif correct >= 5:
        print("  MODERATE — Some issues")
    else:
        print("  POOR — Significant overfitting")


def main():
    if_data, ae_model, ae_config, scaler = load_models()
    threshold, threshold_source = resolve_alert_threshold(if_data=if_data)

    print("=" * 60)
    print("TEST 1 — Train vs Test Performance Gap")
    print("=" * 60)

    train_df = pd.read_csv("data/processed/train_scaled.csv")
    test_df = pd.read_csv("data/processed/test_scaled.csv")

    print(f"Operating threshold: {threshold:.2f} ({threshold_source})")

    train_metrics = score_dataset(train_df, if_data, ae_model, ae_config, threshold)
    test_metrics = score_dataset(test_df, if_data, ae_model, ae_config, threshold)

    print_split_metrics("TRAIN", train_metrics)
    print_split_metrics("TEST", test_metrics)

    gap = abs(train_metrics["f1"] - test_metrics["f1"])
    print(f"\nTrain-Test Gap: {gap:.4f}")
    if gap < 0.05:
        print("LOW gap — good generalization")
    elif gap < 0.10:
        print("MODERATE gap — acceptable")
    else:
        print("HIGH gap — overfitting detected")

    run_edge_cases(if_data, ae_model, ae_config, scaler, threshold)

    print("\n" + "=" * 60)
    print("TEST 3 — Score separation check")
    print("=" * 60)

    combined = test_metrics["combined"]
    test_y = test_metrics["y"]
    normal_scores = combined[test_y == 0]
    anomaly_scores = combined[test_y == 1]

    overlap_normal = np.sum(normal_scores > 0.4)
    overlap_anomaly = np.sum(anomaly_scores < 0.4)

    print(f"\n  Normal  scores — mean: {normal_scores.mean():.4f}  std: {normal_scores.std():.4f}")
    print(f"  Anomaly scores — mean: {anomaly_scores.mean():.4f}  std: {anomaly_scores.std():.4f}")
    print(f"  Separation gap : {anomaly_scores.mean() - normal_scores.mean():.4f}")
    print(f"\n  Normal  records scoring > 0.4 : {overlap_normal:,}  ({overlap_normal / len(normal_scores) * 100:.1f}%)")
    print(f"  Anomaly records scoring < 0.4 : {overlap_anomaly:,} ({overlap_anomaly / len(anomaly_scores) * 100:.1f}%)")

    gap_value = anomaly_scores.mean() - normal_scores.mean()
    if gap_value > 0.70:
        print("\n  WARNING: Separation very high — possible overfitting")
    elif gap_value > 0.50:
        print("\n  Good separation — healthy for security system")
    elif gap_value > 0.35:
        print("\n  Moderate separation — realistic for production")
    else:
        print("\n  Low separation — dataset may be too difficult")

    print("\n" + "=" * 60)
    print("TEST 4 — Detailed Confusion Matrix")
    print("=" * 60)

    preds = test_metrics["preds"]
    cm = confusion_matrix(test_y, preds)
    tn, fp, fn, tp = cm.ravel()

    total_normal = tn + fp
    total_anomaly = tp + fn

    print(f"\n  True Negatives  (TN): {tn:,}  —  {tn / total_normal * 100:.1f}% of normal correctly identified")
    print(f"  False Positives (FP): {fp:,}  —  {fp / total_normal * 100:.1f}% of normal wrongly flagged")
    print(f"  False Negatives (FN): {fn:,}  —  {fn / total_anomaly * 100:.1f}% of attacks missed")
    print(f"  True Positives  (TP): {tp:,}  —  {tp / total_anomaly * 100:.1f}% of attacks caught")

    fpr = fp / (fp + tn) * 100
    fnr = fn / (fn + tp) * 100

    print(f"\n  False Positive Rate: {fpr:.2f}%  (target < 2%)")
    print(f"  False Negative Rate: {fnr:.2f}%  (target < 10%)")

    print("\n" + "=" * 60)
    print("Overfitting diagnosis complete")
    print("=" * 60)


if __name__ == "__main__":
    main()
