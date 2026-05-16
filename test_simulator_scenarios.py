#!/usr/bin/env python3
"""
Test simulator scenarios directly to capture exact 500 error
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / 'backend'))

from app.database import SessionLocal
from app.models import User, AccessPoint
from app.services import extract_features
from datetime import datetime, timezone

db = SessionLocal()

# Get some test users and access points
users = db.query(User).limit(5).all()
access_points = db.query(AccessPoint).limit(5).all()

print(f"Found {len(users)} users and {len(access_points)} access points")

if not users or not access_points:
    print("ERROR: Not enough test data")
    sys.exit(1)

# Test feature extraction for each combination (this is what happens when simulator runs)
print("\n" + "="*70)
print("Testing feature extraction for simulator scenarios...")
print("="*70)

failed_scenarios = []

for user in users:
    for ap in access_points:
        try:
            timestamp = datetime.now(timezone.utc)
            features = extract_features(user, ap, timestamp, db)
            print(f"✓ User {user.badge_id} → AP {ap.name}: OK")
        except Exception as e:
            error_msg = f"✗ User {user.badge_id} → AP {ap.name}: {str(e)}"
            print(error_msg)
            failed_scenarios.append({
                "user_id": user.id,
                "user_badge": user.badge_id,
                "ap_id": ap.id,
                "ap_name": ap.name,
                "error": str(e)
            })

if failed_scenarios:
    print(f"\n{len(failed_scenarios)} failures found:")
    for scenario in failed_scenarios[:5]:  # Show first 5
        print(f"  - {scenario['user_badge']} → {scenario['ap_name']}: {scenario['error']}")
else:
    print(f"\n✓ All {len(users) * len(access_points)} scenarios successful!")

db.close()
