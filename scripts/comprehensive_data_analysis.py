#!/usr/bin/env python3
"""Comprehensive data analysis across all dimensions."""

import pandas as pd
import numpy as np
from pathlib import Path
from collections import Counter

def analyze_comprehensive():
    """Deep dive analysis of data quality, profiles, users, and anomaly types."""
    
    # Load all data sources
    train_path = "data/raw/train.csv"
    test_path = "data/raw/test.csv"
    raw_path = "data/raw/access_data.csv"
    
    if not Path(train_path).exists():
        print(f"❌ Data not found")
        return
    
    df_train = pd.read_csv(train_path)
    df_test = pd.read_csv(test_path)
    df_raw = pd.read_csv(raw_path)
    
    print("=" * 90)
    print("COMPREHENSIVE DATA ANALYSIS - ALL DIMENSIONS")
    print("=" * 90)
    
    # =========== DATASET OVERVIEW ===========
    print(f"\n{'-'*90}")
    print("1. DATASET STRUCTURE & SPLIT")
    print(f"{'-'*90}")
    print(f"Total records: {len(df_raw):,}")
    print(f"Training set: {len(df_train):,} ({len(df_train)/len(df_raw)*100:.1f}%)")
    print(f"Test set: {len(df_test):,} ({len(df_test)/len(df_raw)*100:.1f}%)")
    
    train_normal = (df_train['label'] == 0).sum()
    train_anomaly = (df_train['label'] == 1).sum()
    test_normal = (df_test['label'] == 0).sum()
    test_anomaly = (df_test['label'] == 1).sum()
    
    print(f"\nTrain - Normal: {train_normal:,} ({train_normal/len(df_train)*100:.1f}%)")
    print(f"Train - Anomaly: {train_anomaly:,} ({train_anomaly/len(df_train)*100:.1f}%)")
    print(f"Test - Normal: {test_normal:,} ({test_normal/len(df_test)*100:.1f}%)")
    print(f"Test - Anomaly: {test_anomaly:,} ({test_anomaly/len(df_test)*100:.1f}%)")
    
    # Check stratification
    train_ratio = train_anomaly / len(df_train)
    test_ratio = test_anomaly / len(df_test)
    print(f"\nStratification quality: Train ratio {train_ratio:.4f} vs Test ratio {test_ratio:.4f}")
    if abs(train_ratio - test_ratio) < 0.005:
        print("✓ Stratification is good (< 0.5% difference)")
    else:
        print(f"⚠ Stratification imbalance: {abs(train_ratio - test_ratio)*100:.2f}%")
    
    # =========== FEATURE STATISTICS ===========
    print(f"\n{'-'*90}")
    print("2. FEATURE STATISTICS - ALL FEATURES")
    print(f"{'-'*90}")
    
    feature_cols = [c for c in df_train.columns if c != "label"]
    
    stats = []
    for col in feature_cols:
        stats.append({
            'Feature': col,
            'Min': df_train[col].min(),
            'Max': df_train[col].max(),
            'Mean': df_train[col].mean(),
            'Std': df_train[col].std(),
            'Unique': df_train[col].nunique(),
            'Type': 'Binary' if df_train[col].nunique() <= 2 else 'Continuous'
        })
    
    stats_df = pd.DataFrame(stats)
    print("\nTop features by variance:")
    for idx, row in stats_df.nlargest(8, 'Std').iterrows():
        print(f"  {row['Feature']:40s} | Mean: {row['Mean']:7.3f} | Std: {row['Std']:7.3f} | Range: [{row['Min']:6.1f}, {row['Max']:6.1f}]")
    
    print("\nLow variance features (potential issues):")
    low_var = stats_df[stats_df['Std'] < 0.1]
    if len(low_var) > 0:
        for idx, row in low_var.iterrows():
            print(f"  🔴 {row['Feature']:40s} | Std: {row['Std']:.6f} | Unique values: {row['Unique']}")
    else:
        print("  ✓ All features have adequate variance")
    
    # =========== ANOMALY TYPE DISTRIBUTION ===========
    print(f"\n{'-'*90}")
    print("3. ANOMALY PATTERN ANALYSIS")
    print(f"{'-'*90}")
    
    normal = df_train[df_train['label'] == 0]
    anomaly = df_train[df_train['label'] == 1]
    
    # Analyze key distinguishing features
    print("\nKey feature patterns by class:")
    key_features = [
        ('hour', 'Hour of day'),
        ('day_of_week', 'Day of week'),
        ('is_weekend', 'Is weekend'),
        ('access_attempt_count', 'Access attempts'),
        ('sequential_zone_violation', 'Zone violations'),
        ('location_match', 'Location match'),
        ('is_restricted_area', 'Restricted area'),
    ]
    
    for feat, label in key_features:
        if feat in df_train.columns:
            norm_mean = normal[feat].mean()
            anom_mean = anomaly[feat].mean()
            norm_std = normal[feat].std()
            anom_std = anomaly[feat].std()
            
            # Calculate separation
            if norm_std > 0:
                z_score = abs(norm_mean - anom_mean) / max(norm_std, anom_std, 0.01)
            else:
                z_score = 0
            
            quality = "✓ CLEAR" if z_score > 2.0 else "🟡 FAIR" if z_score > 1.0 else "🔴 WEAK"
            print(f"  {label:25s} | Normal: {norm_mean:6.2f}±{norm_std:5.2f} | Anomaly: {anom_mean:6.2f}±{anom_std:5.2f} | Separation: {z_score:.2f} {quality}")
    
    # =========== USER PROFILE DISTRIBUTION ===========
    print(f"\n{'-'*90}")
    print("4. USER & ROLE DISTRIBUTION")
    print(f"{'-'*90}")
    
    if 'role_level' in df_train.columns:
        print("\nRole level distribution:")
        role_counts = df_train['role_level'].value_counts().sort_index()
        for role, count in role_counts.items():
            pct = count / len(df_train) * 100
            print(f"  Level {int(role)}: {count:,} records ({pct:.1f}%)")
        
        # Check anomaly rate by role
        print("\nAnomaly rate by role:")
        for role in sorted(df_train['role_level'].unique()):
            role_data = df_train[df_train['role_level'] == role]
            anom_rate = (role_data['label'] == 1).sum() / len(role_data) * 100
            print(f"  Level {int(role)}: {anom_rate:.2f}% anomalies")
    
    # =========== TEMPORAL PATTERNS ===========
    print(f"\n{'-'*90}")
    print("5. TEMPORAL PATTERNS")
    print(f"{'-'*90}")
    
    if 'hour' in df_train.columns:
        print("\nHour distribution:")
        normal_hours = normal['hour'].value_counts().sort_index()
        anom_hours = anomaly['hour'].value_counts().sort_index()
        
        print("  Hour | Normal | Anomaly | Anomaly %")
        for hour in range(0, 24):
            n_count = normal_hours.get(hour, 0)
            a_count = anom_hours.get(hour, 0)
            total_at_hour = n_count + a_count
            anom_pct = (a_count / total_at_hour * 100) if total_at_hour > 0 else 0
            bar = "█" * int(anom_pct / 5) if anom_pct > 0 else ""
            if a_count > (len(anomaly) / 24 * 1.5):  # More than 1.5x average
                print(f"  {hour:2d}:00 | {n_count:6} | {a_count:7} | {anom_pct:6.1f}% {bar} ⚠️ HIGH")
            else:
                print(f"  {hour:2d}:00 | {n_count:6} | {a_count:7} | {anom_pct:6.1f}% {bar}")
    
    if 'day_of_week' in df_train.columns:
        print("\nDay of week distribution (0=Mon, 6=Sun):")
        for day in sorted(df_train['day_of_week'].unique()):
            day_data = df_train[df_train['day_of_week'] == day]
            anom_rate = (day_data['label'] == 1).sum() / len(day_data) * 100
            day_name = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][int(day)]
            print(f"  {day_name}: {anom_rate:.2f}% anomalies ({len(day_data):,} records)")
    
    # =========== GEOGRAPHIC PATTERNS ===========
    print(f"\n{'-'*90}")
    print("6. GEOSPATIAL PATTERNS")
    print(f"{'-'*90}")
    
    if 'distance_between_scans_km' in df_train.columns:
        print("\nDistance between scans:")
        print(f"  Normal  - Mean: {normal['distance_between_scans_km'].mean():.2f} km, Max: {normal['distance_between_scans_km'].max():.2f} km")
        print(f"  Anomaly - Mean: {anomaly['distance_between_scans_km'].mean():.2f} km, Max: {anomaly['distance_between_scans_km'].max():.2f} km")
        
        # Check for unrealistic velocities
        high_velocity_normal = (normal['velocity_km_per_min'] > 1.0).sum()
        high_velocity_anom = (anomaly['velocity_km_per_min'] > 1.0).sum()
        print(f"\n  High velocity (>1 km/min) cases:")
        print(f"    Normal: {high_velocity_normal} ({high_velocity_normal/len(normal)*100:.3f}%)")
        print(f"    Anomaly: {high_velocity_anom} ({high_velocity_anom/len(anomaly)*100:.2f}%)")
        
        if high_velocity_normal > len(normal) * 0.001:
            print(f"    🔴 ISSUE: Too many unrealistic velocities in normal data!")
    
    # =========== RESTRICTED AREA PATTERNS ===========
    print(f"\n{'-'*90}")
    print("7. RESTRICTED AREA & CLEARANCE PATTERNS")
    print(f"{'-'*90}")
    
    if 'is_restricted_area' in df_train.columns:
        print("\nRestricted area access:")
        normal_restricted = (normal['is_restricted_area'] == 1).sum() / len(normal) * 100
        anom_restricted = (anomaly['is_restricted_area'] == 1).sum() / len(anomaly) * 100
        print(f"  Normal: {normal_restricted:.2f}%")
        print(f"  Anomaly: {anom_restricted:.2f}%")
        if anom_restricted < 80:
            print(f"  🔴 ISSUE: Only {anom_restricted:.1f}% of anomalies in restricted areas (should be ~100%)")
        else:
            print(f"  ✓ Good separation")
    
    if 'zone_clearance_mismatch' in df_train.columns:
        print("\nClearance mismatch:")
        normal_mismatch = (normal['zone_clearance_mismatch'] == 1).sum() / len(normal) * 100
        anom_mismatch = (anomaly['zone_clearance_mismatch'] == 1).sum() / len(anomaly) * 100
        print(f"  Normal: {normal_mismatch:.3f}%")
        print(f"  Anomaly: {anom_mismatch:.2f}%")
    
    # =========== CORRELATION ANALYSIS ===========
    print(f"\n{'-'*90}")
    print("8. FEATURE CORRELATIONS")
    print(f"{'-'*90}")
    
    numeric_cols = df_train[feature_cols].select_dtypes(include=[np.number]).columns
    corr_matrix = df_train[numeric_cols].corr()
    
    print("\nHighly correlated features (>0.8):")
    highly_corr = []
    for i in range(len(corr_matrix.columns)):
        for j in range(i+1, len(corr_matrix.columns)):
            if abs(corr_matrix.iloc[i, j]) > 0.8:
                highly_corr.append((corr_matrix.columns[i], corr_matrix.columns[j], corr_matrix.iloc[i, j]))
    
    if highly_corr:
        for feat1, feat2, corr_val in sorted(highly_corr, key=lambda x: abs(x[2]), reverse=True):
            print(f"  {feat1:40s} ↔ {feat2:40s} : {corr_val:.3f}")
    else:
        print("  ✓ No high correlations found (features are independent)")
    
    # =========== DATA QUALITY SCORES ===========
    print(f"\n{'-'*90}")
    print("9. OVERALL DATA QUALITY SCORE")
    print(f"{'-'*90}")
    
    issues = 0
    
    # Check 1: Class imbalance
    if 0.05 < train_ratio < 0.10:
        print("✓ Class balance: Good")
    elif train_ratio < 0.05 or train_ratio > 0.15:
        print(f"🔴 Class balance: {train_ratio*100:.2f}% (target ~7%)")
        issues += 1
    
    # Check 2: Feature variance
    if len(low_var) == 0:
        print("✓ Feature variance: Good")
    else:
        print(f"🔴 Low variance features: {len(low_var)}")
        issues += 1
    
    # Check 3: Stratification
    if abs(train_ratio - test_ratio) < 0.005:
        print("✓ Train/Test stratification: Good")
    else:
        print(f"🔴 Train/Test stratification: {abs(train_ratio - test_ratio)*100:.2f}% difference")
        issues += 1
    
    # Check 4: Anomaly patterns
    if anom_restricted > 80:
        print("✓ Anomaly patterns: Clear")
    else:
        print(f"🔴 Anomaly patterns: Weak")
        issues += 1
    
    # Check 5: Temporal patterns
    if (normal['hour'].mean() > 8 and normal['hour'].mean() < 11 and 
        anomaly['hour'].mean() < 5):
        print("✓ Temporal patterns: Clear distinction")
    else:
        print(f"🔴 Temporal patterns: Weak (norm hour {normal['hour'].mean():.1f} vs anom {anomaly['hour'].mean():.1f})")
        issues += 1
    
    print(f"\n📊 QUALITY SCORE: {100 - (issues * 20)}/100")
    if issues == 0:
        print("   ✅ Excellent - Ready for model training")
    elif issues == 1:
        print("   🟡 Good - Minor issues")
    elif issues <= 2:
        print("   ⚠️  Fair - Some issues to address")
    else:
        print("   🔴 Poor - Significant issues")

if __name__ == "__main__":
    analyze_comprehensive()
