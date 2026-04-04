"""
Diagnostic script to identify why ML models are making mistakes in production.
Tests common problem patterns and shows decision reasoning.
"""

import sys
import os
import joblib
import numpy as np

# Use the decision engine directly from scripts
from decision_engine import AccessDecisionEngine
import json

# Fix path to find models from workspace root
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load scaler to normalize test features
try:
    scaler = joblib.load('ml/models/scaler_13.pkl')
except:
    scaler = joblib.load('ml/models/scaler.pkl')

FEATURE_COLS = [
    "hour", "day_of_week", "is_weekend", "access_frequency_24h",
    "time_since_last_access_min", "location_match", "role_level",
    "is_restricted_area", "is_first_access_today", "sequential_zone_violation",
    "access_attempt_count", "time_of_week", "hour_deviation_from_norm",
]

def scale_features(raw_features):
    """Apply MinMaxScaler to raw feature values"""
    return scaler.transform([raw_features])[0].tolist()

print("=" * 70)
print("ML MODEL DIAGNOSTICS")
print("=" * 70)

engine = AccessDecisionEngine()

# Test cases representing common real-world patterns
test_cases = [
    {
        "name": "Legitimate night shift worker (2AM, 3 logins/day)",
        "expected": "granted",
        "raw_features": [2, 2, 0, 3, 120, 1, 2, 0, 1, 0, 1, 58, 1.6],
        "concurrent_session": False,
    },
    {
        "name": "Subtle data exfiltration (slow, authorized area)",
        "expected": "denied",
        "raw_features": [14, 1, 0, 8, 30, 0, 1, 1, 0, 0, 0, 34, 2.2],
        "concurrent_session": False,
    },
    {
        "name": "New employee first week (unusual patterns)",
        "expected": "granted",
        "raw_features": [9, 2, 0, 5, 60, 0.5, 1, 0, 1, 0, 1, 51, 1.8],
        "concurrent_session": False,
    },
    {
        "name": "After-hours weekend intruder",
        "expected": "denied",
        "raw_features": [2, 6, 1, 12, 8, 0, 1, 1, 1, 1, 3, 146, 7.5],
        "concurrent_session": False,
    },
    {
        "name": "Admin working Saturday (legitimate)",
        "expected": "granted",
        "raw_features": [10, 5, 1, 2, 200, 1, 3, 1, 1, 0, 0, 130, 0.5],
        "concurrent_session": False,
    },
    {
        "name": "Badge cloning detected (concurrent session)",
        "expected": "denied",
        "raw_features": [9, 0, 0, 15, 2, 0, 1, 0, 0, 1, 4, 9, 4.0],
        "concurrent_session": True,
    },
]

correct = 0
incorrect = 0
print()

for i, test in enumerate(test_cases, 1):
    # Scale raw features before calling decide()
    scaled_features = scale_features(test["raw_features"])
    # Add 6 more features for full 19-feature vector (location/velocity data)
    # Position 15: velocity_km_per_min, Position 18: concurrent_session
    full_features = scaled_features + [0]*6
    
    # Build unscaled raw features with proper hard rule flags
    raw_features_full = test["raw_features"] + [0]*6
    if test.get("concurrent_session"):
        raw_features_full[18] = 1  # Set concurrent_session flag
    
    result = engine.decide(full_features, features_unscaled=raw_features_full)
    decision = result["decision"]
    risk_score = result["risk_score"]
    
    # Check if correct
    is_correct = decision == test["expected"]
    if is_correct:
        correct += 1
        status = "✓ CORRECT"
    else:
        incorrect += 1
        status = "✗ WRONG"
    
    print(f"{i}. {test['name']}")
    print(f"   Expected: {test['expected'].upper():<10} Got: {decision.upper():<10} {status}")
    print(f"   Risk Score: {risk_score:.4f}")
    print(f"   Reasoning: {result.get('reasoning', 'N/A')}")
    print(f"   Mode: {result.get('mode', 'unknown')}")
    if result.get('if_score') and result.get('ae_score'):
        print(f"   IF Score: {result['if_score']:.4f}, AE Score: {result['ae_score']:.4f}")
    print()

print("=" * 70)
print(f"SUMMARY: {correct}/{len(test_cases)} correct ({correct*100//len(test_cases)}%)")
print("=" * 70)

if incorrect > 0:
    print("\n⚠️  MODEL ISSUES DETECTED:")
    print("   - Review threshold configuration (currently 0.30-0.60)")
    print("   - Check feature normalization/scaling")
    print("   - Consider retraining with better data")
    print("   - Validate hard rules (velocity, concurrent sessions)")
