#!/usr/bin/env python3
"""
Minimal debug script to check feature extraction output types.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / 'backend'))

from app.database import SessionLocal
from app.models import User, AccessPoint
from app.services import extract_features
from app.services.ml_service import FEATURE_COLS
from datetime import datetime, timezone

db = SessionLocal()

# Get one user and access point
user = db.query(User).first()
access_point = db.query(AccessPoint).first()

if not user or not access_point:
    print("ERROR: No test data found")
    sys.exit(1)

print(f"Testing with User: {user.badge_id}, AP: {access_point.name}")

timestamp = datetime.now(timezone.utc)
features = extract_features(user, access_point, timestamp, db)

print(f"\nFeature Columns ({len(FEATURE_COLS)}): {FEATURE_COLS}")
print(f"\nRaw features (should all be numeric):")
for col in FEATURE_COLS:
    value = features['raw'].get(col, 'MISSING')
    value_type = type(value).__name__
    print(f"  {col}: {value} (type: {value_type})")

print(f"\nScaled list ({len(features['list'])} items):")
for i, val in enumerate(features['list'][:5]):  # Show first 5
    print(f"  [{i}] {val} (type: {type(val).__name__})")

# Try to convert all to float
print(f"\nTrying to convert all to float:")
try:
    converted = [float(v) for v in features['list']]
    print(f"✓ All {len(converted)} values converted successfully")
except Exception as e:
    print(f"✗ Conversion failed: {e}")

db.close()
