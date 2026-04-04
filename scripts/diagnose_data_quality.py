#!/usr/bin/env python3
"""Diagnose data quality issues that could cause false model results."""

import pandas as pd
import numpy as np
from pathlib import Path

def analyze_data_quality():
    """Analyze synthetic data for issues that cause poor model performance."""
    
    train_path = "data/raw/train.csv"
    if not Path(train_path).exists():
        print(f"❌ Training data not found at {train_path}")
        return
    
    df = pd.read_csv(train_path)
    normal = df[df["label"] == 0]
    anomalous = df[df["label"] == 1]
    
    print("=" * 80)
    print("DATA QUALITY ANALYSIS")
    print("=" * 80)
    
    print(f"\nDataset Size:")
    print(f"  Total: {len(df):,} records")
    print(f"  Normal: {len(normal):,} ({len(normal)/len(df)*100:.1f}%)")
    print(f"  Anomalous: {len(anomalous):,} ({len(anomalous)/len(df)*100:.1f}%)")
    
    # Issue 1: Check feature overlap between classes
    print(f"\n{'=' * 80}")
    print("ISSUE 1: Feature Overlap (Low distinction between classes)")
    print("=" * 80)
    print("If mean(normal) and mean(anomaly) are close, the model can't distinguish them.\n")
    
    feature_cols = [c for c in df.columns if c != "label"]
    overlaps = []
    
    for col in feature_cols:
        normal_mean = normal[col].mean()
        normal_std = normal[col].std()
        anomaly_mean = anomalous[col].mean()
        anomaly_std = anomalous[col].std()
        
        # Cohen's d effect size
        pooled_std = np.sqrt((normal_std**2 + anomaly_std**2) / 2)
        if pooled_std > 0:
            cohens_d = abs(normal_mean - anomaly_mean) / pooled_std
        else:
            cohens_d = 0
        
        signal_strength = "🔴 WEAK" if cohens_d < 0.5 else "🟡 MODERATE" if cohens_d < 1.0 else "🟢 STRONG"
        
        if cohens_d < 1.0:  # Flag weak signals
            overlaps.append((col, cohens_d, signal_strength))
            print(f"{col:40s} | Normal: {normal_mean:7.3f} | Anomaly: {anomaly_mean:7.3f} | Cohen's d: {cohens_d:5.2f} {signal_strength}")
    
    if overlaps:
        print(f"\n⚠️  WEAK SIGNAL FEATURES ({len(overlaps)}): These features don't distinguish classes well")
    else:
        print(f"\n✓ All features have moderate-to-strong distinction")
    
    # Issue 2: Check class imbalance
    print(f"\n{'=' * 80}")
    print("ISSUE 2: Class Imbalance")
    print("=" * 80)
    ratio = len(anomalous) / len(normal)
    if ratio < 0.05:
        print(f"🔴 SEVERE IMBALANCE: {100*ratio:.2f}% anomalies (target: ~7%)")
        print(f"   → Models tend to predict 'normal' for everything (high false negatives)\n")
    elif ratio < 0.07:
        print(f"🟡 SLIGHT IMBALANCE: {100*ratio:.2f}% anomalies (target: ~7%)")
    else:
        print(f"🟢 BALANCED: {100*ratio:.2f}% anomalies (target: ~7%)\n")
    
    # Issue 3: Check feature variance consistency
    print(f"{'=' * 80}")
    print("ISSUE 3: Feature Consistency (Weird anomaly patterns)")
    print("=" * 80)
    print("Some features should be completely deterministic for anomalies (e.g., sequential_zone_violation)\n")
    
    for col in ["sequential_zone_violation", "is_restricted_area", "concurrent_session_detected", "location_match"]:
        if col in df.columns:
            normal_pct = (normal[col] == 1).sum() / len(normal) * 100
            anomaly_pct = (anomalous[col] == 1).sum() / len(anomalous) * 100
            
            if col == "sequential_zone_violation":
                if anomaly_pct < 50:
                    print(f"🔴 {col:40s} | Normal: {normal_pct:5.1f}% | Anomaly: {anomaly_pct:5.1f}% | Should be ~100% in anomalies")
                else:
                    print(f"🟢 {col:40s} | Normal: {normal_pct:5.1f}% | Anomaly: {anomaly_pct:5.1f}%")
            elif col == "location_match":
                if normal_pct < 70:
                    print(f"🔴 {col:40s} | Normal: {normal_pct:5.1f}% | Anomaly: {anomaly_pct:5.1f}% | Should be >70% in normal")
                else:
                    print(f"🟢 {col:40s} | Normal: {normal_pct:5.1f}% | Anomaly: {anomaly_pct:5.1f}%")
            else:
                print(f"   {col:40s} | Normal: {normal_pct:5.1f}% | Anomaly: {anomaly_pct:5.1f}%")
    
    # Issue 4: Check access_attempt_count distribution
    print(f"\n{'=' * 80}")
    print("ISSUE 4: Access Attempt Count (Should distinguish normal/anomaly)")
    print("=" * 80)
    normal_attempts = normal["access_attempt_count"].mean()
    anomaly_attempts = anomalous["access_attempt_count"].mean()
    print(f"Normal attempts:  {normal_attempts:.2f} (expected ~0.05)")
    print(f"Anomaly attempts: {anomaly_attempts:.2f} (expected ~4-5)")
    if normal_attempts > 0.1 or anomaly_attempts < 1.0:
        print("🔴 WEAK SIGNAL: Attempts don't distinguish classes\n")
    else:
        print("🟢 GOOD SIGNAL\n")
    
    # Issue 5: Check is_first_access_today
    print(f"{'=' * 80}")
    print("ISSUE 5: First Access Today (Confuses the model)")
    print("=" * 80)
    normal_first = (normal["is_first_access_today"] == 1).sum() / len(normal) * 100
    anomaly_first = (anomalous["is_first_access_today"] == 1).sum() / len(anomalous) * 100
    print(f"Normal: {normal_first:.1f}% are first access")
    print(f"Anomaly: {anomaly_first:.1f}% are first access")
    if normal_first > 20:
        print("🔴 PROBLEM: Too many normal records marked as 'first access' - this is a noisy signal\n")
    else:
        print("🟢 OK\n")
    
    # Issue 6: Check hour deviation from norm
    print(f"{'=' * 80}")
    print("ISSUE 6: Hour Deviation (Should be high for anomalies)")
    print("=" * 80)
    normal_hour_dev = normal["hour_deviation_from_norm"].mean()
    anomaly_hour_dev = anomalous["hour_deviation_from_norm"].mean()
    print(f"Normal hour deviation:  {normal_hour_dev:.2f}")
    print(f"Anomaly hour deviation: {anomaly_hour_dev:.2f}")
    if anomaly_hour_dev <= normal_hour_dev * 1.5:
        print("🔴 WEAK SIGNAL: Anomalies don't deviate much from normal hours\n")
    else:
        print("🟢 GOOD SIGNAL\n")
    
    # Issue 7: Check geographic impossibility
    print(f"{'=' * 80}")
    print("ISSUE 7: Geographic Impossibility (Should only be in anomalies)")
    print("=" * 80)
    normal_geo = (normal["geographic_impossibility"] == 1).sum() / len(normal) * 100
    anomaly_geo = (anomalous["geographic_impossibility"] == 1).sum() / len(anomalous) * 100
    print(f"Normal: {normal_geo:.3f}% have geographic impossibility")
    print(f"Anomaly: {anomaly_geo:.1f}% have geographic impossibility")
    if normal_geo > 0.01 or anomaly_geo < 0.1:
        print("🔴 WEAK SIGNAL: Geographic impossibility isn't rare enough in normal OR common enough in anomalies\n")
    else:
        print("🟢 GOOD SIGNAL\n")
    
    # Summary recommendations
    print(f"{'=' * 80}")
    print("RECOMMENDATIONS")
    print("=" * 80)
    
    issues = []
    if ratio < 0.05:
        issues.append("• Increase anomaly ratio (currently too low) - regenerate with higher ratio")
    if normal_first > 20:
        issues.append("• Reduce is_first_access_today in normal records (too much noise)")
    if normal_attempts > 0.1:
        issues.append("• Reduce access_attempt_count in normal records")
    if anomaly_hour_dev <= normal_hour_dev * 1.5:
        issues.append("• Make anomalies happen at more unusual hours")
    if normal_geo > 0.01:
        issues.append("• Fix velocity calculation (geographic_impossibility too high in normal)")
    if len(overlaps) >= 5:
        issues.append("• Create stronger distinction between normal/anomaly patterns")
    
    if issues:
        for issue in issues:
            print(issue)
        print("\n🔧 ACTION: Run `python scripts/generate_data_fixed.py --profile dev` after fixes")
    else:
        print("✓ Data quality looks good! Issue may be in model training, not data.")

if __name__ == "__main__":
    analyze_data_quality()
