#!/usr/bin/env python3
"""
Comprehensive ML model diagnostic to find wrong decisions root cause.
Analyzes: data quality, feature extraction, threshold calibration, model performance.
"""
import sys
import os
import json
import numpy as np

# Install minimal dependencies
print("📊 RaptorX ML Model Diagnostic\n")

try:
    import pandas as pd
except ImportError:
    print("⚠️  Installing pandas...")
    os.system(f"{sys.executable} -m pip install -q pandas")
    import pandas as pd

from pathlib import Path
from sklearn.preprocessing import StandardScaler, MinMaxScaler

# ============================================================
# PHASE 1: DATA QUALITY ANALYSIS
# ============================================================
def analyze_data_quality():
    """Analyze synthetic training data for weak signals."""
    
    train_path = "data/raw/train.csv"
    if not Path(train_path).exists():
        print(f"❌ Training data not found at {train_path}")
        return None
    
    df = pd.read_csv(train_path)
    normal = df[df["label"] == 0]
    anomalous = df[df["label"] == 1]
    
    print("=" * 80)
    print("PHASE 1: DATA QUALITY ANALYSIS")
    print("=" * 80)
    
    print(f"\nDataset Size:")
    print(f"  Total: {len(df):,} records")
    print(f"  Normal: {len(normal):,} ({len(normal)/len(df)*100:.1f}%)")
    print(f"  Anomalous: {len(anomalous):,} ({len(anomalous)/len(df)*100:.1f}%)")
    
    # Check feature overlap (Cohen's d effect size)
    print(f"\n{'=' * 80}")
    print("Issue 1: WEAK SIGNAL FEATURES (can't distinguish normal from anomaly)")
    print("=" * 80)
    
    feature_cols = [c for c in df.columns if c != "label"]
    weak_features = []
    strong_features = []
    
    for col in feature_cols:
        normal_mean = normal[col].mean()
        normal_std = normal[col].std()
        anomaly_mean = anomalous[col].mean()
        anomaly_std = anomalous[col].std()
        
        pooled_std = np.sqrt((normal_std**2 + anomaly_std**2) / 2)
        cohens_d = abs(normal_mean - anomaly_mean) / pooled_std if pooled_std > 0 else 0
        
        signal_strength = "🔴 WEAK (d<0.5)" if cohens_d < 0.5 else "🟡 MODERATE (d<1.0)" if cohens_d < 1.0 else "🟢 STRONG (d≥1.0)"
        
        if cohens_d < 0.8:  # Threshold for concern
            weak_features.append((col, cohens_d, normal_mean, anomaly_mean))
            print(f"  {col:35s} | Normal: {normal_mean:8.3f} | Anomaly: {anomaly_mean:8.3f} | Cohen's d: {cohens_d:6.3f} {signal_strength}")
        else:
            strong_features.append(col)
    
    if weak_features:
        print(f"\n⚠️  FOUND {len(weak_features)} WEAK SIGNAL FEATURES:")
        for col, d, n_mean, a_mean in weak_features:
            print(f"    • {col} (d={d:.3f}) — Similar distributions cause model confusion")
    else:
        print(f"\n✓ All features have good signal strength")
    
    # Check auto-retuning status
    print(f"\n{'=' * 80}")
    print("Issue 2: AUTO-RETUNING STATUS")
    print("=" * 80)
    if Path("retune_results.json").exists():
        with open("retune_results.json") as f:
            retune_status = json.load(f)
            print(f"  Status: {retune_status.get('status', 'unknown')}")
            if retune_status.get('status') == 'failed':
                print(f"  ❌ Auto-retuning FAILED")
                if retune_status.get('errors'):
                    for error in retune_status['errors'][:2]:
                        print(f"     Error: {error[:100]}")
                print(f"\n  ⚠️  IMPACT: Thresholds NOT auto-tuned — using default (grant=0.22, deny=0.47)")
            else:
                print(f"  ✓ Auto-retuning successful")
    else:
        print(f"  ⚠️  retune_results.json not found")
    
    # Check class imbalance
    print(f"\n{'=' * 80}")
    print("Issue 3: CLASS IMBALANCE")
    print("=" * 80)
    ratio = len(anomalous) / len(normal)
    print(f"  Anomaly ratio: {100*ratio:.2f}% (target: ~7%)")
    if ratio < 0.05:
        print(f"  🔴 SEVERE: Models biased toward predicting 'normal'")
    elif ratio < 0.07:
        print(f"  🟡 SLIGHT: Could cause recall bias")
    else:
        print(f"  ✓ BALANCED")
    
    return {
        "total_records": len(df),
        "weak_features": len(weak_features),
        "weak_feature_names": [col for col, _, _, _ in weak_features],
        "anomaly_ratio": ratio
    }


# ============================================================
# PHASE 2: FEATURE EXTRACTION VERIFICATION
# ============================================================
def analyze_feature_extraction():
    """Check if feature extraction matches training data."""
    
    train_path = "data/raw/train.csv"
    test_path = "data/raw/test.csv"
    
    if not Path(train_path).exists() or not Path(test_path).exists():
        print(f"\n❌ Data files not found")
        return None
    
    print(f"\n{'=' * 80}")
    print("PHASE 2: FEATURE EXTRACTION CONSISTENCY")
    print("=" * 80)
    
    train_df = pd.read_csv(train_path)
    test_df = pd.read_csv(test_path)
    
    # Check feature columns
    train_cols = set(train_df.columns)
    test_cols = set(test_df.columns)
    
    print(f"\nTraining features: {len(train_cols)}")
    print(f"Test features: {len(test_cols)}")
    
    if train_cols == test_cols:
        print(f"✓ Feature sets match")
    else:
        print(f"🔴 Feature mismatch!")
        missing = train_cols - test_cols
        extra = test_cols - train_cols
        if missing:
            print(f"  Missing in test: {missing}")
        if extra:
            print(f"  Extra in test: {extra}")
    
    # Check scaler compatibility
    print(f"\nScaler files:")
    scaler_files = ["ml/models/scaler.pkl", "ml/models/scaler_13.pkl", "ml/models/scaler_19.pkl"]
    for sf in scaler_files:
        exists = "✓" if Path(sf).exists() else "❌"
        print(f"  {exists} {sf}")
    
    # Analyze feature distributions
    print(f"\n{'=' * 80}")
    print("Feature Distribution Analysis (Training vs Test)")
    print("=" * 80)
    
    feature_cols = [c for c in train_df.columns if c != "label"]
    
    print(f"\nFeature columns ({len(feature_cols)}):")
    dist_issues = []
    
    for col in feature_cols[:5]:  # Show first 5
        train_mean = train_df[col].mean()
        test_mean = test_df[col].mean()
        train_std = train_df[col].std()
        test_std = test_df[col].std()
        
        # Check for significant drift
        drift = abs(train_mean - test_mean) / (train_std + 1e-6)
        
        if drift > 1.0:
            dist_issues.append(col)
            print(f"  🔴 {col:30s} | Train: μ={train_mean:7.3f}, σ={train_std:7.3f} | Test: μ={test_mean:7.3f}, σ={test_std:7.3f} | Drift: {drift:.2f}")
        else:
            print(f"  ✓ {col:30s} | Train: μ={train_mean:7.3f}, σ={train_std:7.3f} | Test: μ={test_mean:7.3f}, σ={test_std:7.3f} | Drift: {drift:.2f}")
    
    if dist_issues:
        print(f"\n⚠️  FEATURE DRIFT DETECTED in: {', '.join(dist_issues)}")
        print(f"   This could cause runtime errors (model trained on different distributions)")
    
    return {
        "feature_cols": len(feature_cols),
        "train_test_match": train_cols == test_cols,
        "distribution_drift": len(dist_issues)
    }


# ============================================================
# PHASE 3: MODEL ARTIFACT VERIFICATION
# ============================================================
def verify_models():
    """Check if models can be loaded and analyzed."""
    
    print(f"\n{'=' * 80}")
    print("PHASE 3: MODEL ARTIFACT VERIFICATION")
    print("=" * 80)
    
    models_dir = Path("ml/models")
    
    # Check model files exist
    required_files = {
        "isolation_forest.pkl": "Isolation Forest model",
        "autoencoder.keras": "Autoencoder model",
        "autoencoder_config.pkl": "Autoencoder config",
        "scaler_19.pkl": "Feature scaler (19 features)",
        "scaler_13.pkl": "Feature scaler (13 features)"
    }
    
    print(f"\nModel files:")
    missing_models = []
    for file, desc in required_files.items():
        path = models_dir / file
        if path.exists():
            size_mb = path.stat().st_size / (1024 * 1024)
            print(f"  ✓ {file:30s} ({size_mb:6.2f} MB) — {desc}")
        else:
            missing_models.append(file)
            print(f"  ❌ {file:30s} MISSING — {desc}")
    
    if missing_models:
        print(f"\n🔴 CRITICAL: Missing model files: {', '.join(missing_models)}")
        return False
    
    # Try to load scaler to check compatibility
    print(f"\nTrying to load scaler_19.pkl...")
    try:
        import joblib
        scaler = joblib.load(models_dir / "scaler_19.pkl")
        print(f"  ✓ Scaler loaded successfully")
        print(f"    - Feature count: {scaler.n_features_in_}")
        print(f"    - Scaler type: {type(scaler).__name__}")
        
        if scaler.n_features_in_ != 19:
            print(f"    🔴 ERROR: Expected 19 features, got {scaler.n_features_in_}")
            return False
    except Exception as e:
        print(f"  ❌ Failed to load scaler: {e}")
        return False
    
    return True


# ============================================================
# PHASE 4: THRESHOLD ANALYSIS
# ============================================================
def analyze_thresholds():
    """Analyze decision thresholds and their calibration."""
    
    print(f"\n{'=' * 80}")
    print("PHASE 4: THRESHOLD CALIBRATION ANALYSIS")
    print("=" * 80)
    
    # Check .env for threshold settings
    env_file = Path(".env")
    thresholds = {
        "DECISION_THRESHOLD_GRANT": 0.22,
        "DECISION_THRESHOLD_DENY": 0.47
    }
    
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                for key in thresholds:
                    if line.startswith(key):
                        value = line.split("=")[1].strip()
                        try:
                            thresholds[key] = float(value)
                        except:
                            pass
    
    print(f"\nThresholds configured:")
    print(f"  GRANT threshold (normal): {thresholds['DECISION_THRESHOLD_GRANT']:.3f}")
    print(f"  DENY threshold (anomaly): {thresholds['DECISION_THRESHOLD_DENY']:.3f}")
    print(f"  DELAYED zone: {thresholds['DECISION_THRESHOLD_GRANT']:.3f} - {thresholds['DECISION_THRESHOLD_DENY']:.3f}")
    
    # Analysis
    if thresholds['DECISION_THRESHOLD_GRANT'] >= thresholds['DECISION_THRESHOLD_DENY']:
        print(f"\n🔴 CRITICAL: GRANT threshold >= DENY threshold! Thresholds misconfigured.")
        return False
    
    gap = thresholds['DECISION_THRESHOLD_DENY'] - thresholds['DECISION_THRESHOLD_GRANT']
    print(f"  Gap (delayed zone): {gap:.3f}")
    
    if gap < 0.1:
        print(f"  ⚠️  SMALL GAP: Very few decisions go to DELAYED")
    elif gap > 0.5:
        print(f"  ⚠️  LARGE GAP: Too many decisions go to DELAYED")
    else:
        print(f"  ✓ Gap looks reasonable")
    
    return True


# ============================================================
# MAIN DIAGNOSTIC
# ============================================================
def main():
    """Run full diagnostic suite."""
    
    results = {
        "data_quality": None,
        "feature_extraction": None,
        "models_ok": False,
        "thresholds_ok": False
    }
    
    try:
        # Phase 1
        results["data_quality"] = analyze_data_quality()
        
        # Phase 2
        results["feature_extraction"] = analyze_feature_extraction()
        
        # Phase 3
        results["models_ok"] = verify_models()
        
        # Phase 4
        results["thresholds_ok"] = analyze_thresholds()
        
    except Exception as e:
        print(f"\n❌ Diagnostic failed: {e}")
        import traceback
        traceback.print_exc()
        return
    
    # Summary
    print(f"\n{'=' * 80}")
    print("DIAGNOSTIC SUMMARY")
    print("=" * 80)
    
    issues_found = []
    
    if results["data_quality"]:
        dq = results["data_quality"]
        if dq["weak_features"] > 0:
            issues_found.append(f"Data Quality: {dq['weak_features']} weak signal features")
    
    if results["feature_extraction"]:
        fe = results["feature_extraction"]
        if fe["distribution_drift"] > 0:
            issues_found.append(f"Feature Extraction: {fe['distribution_drift']} features with drift")
    
    if not results["models_ok"]:
        issues_found.append("Models: Some model files missing or incompatible")
    
    if not results["thresholds_ok"]:
        issues_found.append("Thresholds: Threshold configuration invalid")
    
    if issues_found:
        print(f"\n🔴 ISSUES FOUND ({len(issues_found)}):")
        for issue in issues_found:
            print(f"  • {issue}")
    else:
        print(f"\n✓ No critical issues detected in diagnostic")
    
    print(f"\n{'=' * 80}")
    print("NEXT STEPS:")
    print("=" * 80)
    print(f"""
1. If weak data features: Regenerate data with stronger anomaly signals
2. If feature drift: Update scaler on production data
3. If model issues: Retrain ensemble models
4. If threshold issues: Fix .env configuration and re-tune thresholds
5. Test on 100+ scenarios (normal + anomaly) to verify fixes work
    """)


if __name__ == "__main__":
    main()
