#!/usr/bin/env python3
"""
Test the full decide path with detailed error tracing.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / 'backend'))

from app.database import SessionLocal
from app.models import User, AccessPoint
from app.services import AccessDecisionEngine, extract_features
from datetime import datetime, timezone

db = SessionLocal()

# Get test data
user = db.query(User).first()
access_point = db.query(AccessPoint).first()

timestamp = datetime.now(timezone.utc)
features = extract_features(user, access_point, timestamp, db)

engine = AccessDecisionEngine()

print(f"Feature list type: {type(features['list'])}")
print(f"Feature list length: {len(features['list'])}")
print(f"Feature list: {features['list']}")
print(f"\nRaw features type: {type(features['raw'])}")
print(f"Raw features keys: {list(features['raw'].keys())}")

try:
    print(f"\nCalling decide()...")
    print(f"  - features['list']: {features['list']}")
    print(f"  - features['raw']: {features['raw']}")
    
    result = engine.decide(features["list"], features["raw"])
    
    print(f"\n✓ Decision successful!")
    print(f"  - Risk Score: {result['risk_score']} (type: {type(result['risk_score']).__name__})")
    print(f"  - Decision: {result['decision']}")
    print(f"  - Reasoning: {result['reasoning']}")

except Exception as e:
    print(f"\n✗ ERROR: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()

db.close()
