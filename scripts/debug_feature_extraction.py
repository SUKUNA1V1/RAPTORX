#!/usr/bin/env python3
"""Debug feature extraction for 2 AM request."""

import sys
sys.path.insert(0, 'backend')
sys.path.insert(0, 'scripts')

from datetime import datetime
from app.services.access_service import extract_features

# Simulate a 2 AM request
class MockUser:
    badge_id = 'B002'
    name = 'Test User'
    department = 'Engineering'
    clearance_level = 4
    is_active = True

class MockPoint:
    id = 1
    name = 'Main Entrance'
    building = 'A'
    required_clearance = 1
    is_restricted = False

user = MockUser()
point = MockPoint()

# 2 AM timestamp
timestamp = datetime(2026, 4, 1, 2, 0, 0)

print("="*70)
print("FEATURE EXTRACTION DEBUG: 2 AM REQUEST")
print("="*70)

try:
    features = extract_features(user, point, timestamp, mode='feature_19')
    print(f'\nFeatures extracted at 2 AM:')
    print(f'Feature count: {len(features["list"])}')
    
    feature_names = [
        'hour', 'day_of_week', 'is_weekend', 'access_frequency_24h',
        'time_since_last_access_min', 'location_match', 'role_level',
        'is_restricted_area', 'is_first_access_today', 'sequential_zone_violation',
        'access_attempt_count', 'time_of_week', 'hour_deviation_from_norm',
        'velocity_km_per_min', 'zone_distance_km', 'concurrent_sessions',
        'dept_mismatch', 'access_pattern_deviation', 'badge_risk_score'
    ]
    
    print('\n  Feature Values:')
    for i, feat in enumerate(features['list']):
        fname = feature_names[i] if i < len(feature_names) else f'feature_{i}'
        print(f'  [{i:2d}] {fname:30s} = {feat:.4f}')
    
    print(f'\nRaw features (first 5): {features.get("raw_list", [])[:5] if "raw_list" in features else "N/A"}')
    
except Exception as e:
    import traceback
    print(f'Error: {type(e).__name__}: {e}')
    traceback.print_exc()

print("\n" + "="*70)
print("COMPARISON: Daytime vs 2 AM")
print("="*70)

# Also test daytime
timestamp_day = datetime(2026, 4, 1, 10, 0, 0)

try:
    features_day = extract_features(user, point, timestamp_day, mode='feature_19')
    
    print(f'\nDAYTIME (10 AM):')
    for i, feat in enumerate(features_day['list'][:6]):
        fname = feature_names[i] if i < len(feature_names) else f'feature_{i}'
        print(f'  {fname:30s} = {feat:.4f}')
    
    print(f'\n2 AM:')
    for i, feat in enumerate(features['list'][:6]):
        fname = feature_names[i] if i < len(feature_names) else f'feature_{i}'
        print(f'  {fname:30s} = {feat:.4f}')
    
    print(f'\nDifferences:')
    for i in range(6):
        diff = features['list'][i] - features_day['list'][i]
        fname = feature_names[i] if i < len(feature_names) else f'feature_{i}'
        print(f'  {fname:30s} : 2AM={features["list"][i]:.4f}, DAY={features_day["list"][i]:.4f}, DIFF={diff:+.4f}')
    
except Exception as e:
    import traceback
    print(f'Error: {type(e).__name__}: {e}')
    traceback.print_exc()
