#!/usr/bin/env python3
"""
Debug script to test threat scenarios and capture full decision details.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / 'backend'))

from app.database import SessionLocal
from app.models import User, AccessPoint
from app.services import AccessDecisionEngine, extract_features
from datetime import datetime, timezone, timedelta

db = SessionLocal()

# Create decision engine instance
engine = AccessDecisionEngine()
print(f"Decision Engine:")
print(f"  - Grant Threshold: {engine.grant_threshold}")
print(f"  - Deny Threshold: {engine.deny_threshold}")
print()

# Get test users and access points
users = db.query(User).limit(10).all()
access_points = db.query(AccessPoint).limit(10).all()

# Test threat scenarios
threat_scenarios = [
    {
        "name": "Restricted Area Access (Low Clearance)",
        "user_badge": "BADGE_000000",  # Low clearance
        "access_point_id": 3,  # High security area
        "expected": "DENIED or HIGH DELAYED"
    },
    {
        "name": "Off-Hours Access",
        "user_badge": "BADGE_000001",
        "access_point_id": 1,
        "timestamp_offset": -3*3600,  # 3 AM
        "expected": "DELAYED (anomalous time)"
    },
    {
        "name": "Rapid Successive Access",
        "user_badge": "BADGE_000000",
        "access_point_id": 1,
        "repeat": 3,  # Multiple rapid attempts
        "expected": "DELAYED/DENIED (suspicious pattern)"
    },
]

print("="*80)
print("TESTING THREAT SCENARIOS")
print("="*80)

for scenario in threat_scenarios:
    print(f"\n📋 {scenario['name']}")
    print(f"   Expected: {scenario['expected']}")
    
    user = db.query(User).filter(User.badge_id == scenario['user_badge']).first()
    access_point = db.query(AccessPoint).filter(AccessPoint.id == scenario['access_point_id']).first()
    
    if not user or not access_point:
        print(f"   ✗ User or access point not found")
        continue
    
    # Calculate timestamp
    if "timestamp_offset" in scenario:
        timestamp = datetime.now(timezone.utc) + timedelta(seconds=scenario['timestamp_offset'])
    else:
        timestamp = datetime.now(timezone.utc)
    
    # Run multiple times if repeat scenario
    repeat = scenario.get("repeat", 1)
    for attempt in range(repeat):
        try:
            # Extract features
            features = extract_features(user, access_point, timestamp, db)
            
            # Get ML decision using the decide method (pass the list, not the dict)
            ml_decision = engine.decide(features["list"], features["raw"])
            
            print(f"\n   Attempt {attempt+1}/{repeat}:")
            print(f"     Risk Score: {ml_decision['risk_score']:.4f}")
            print(f"       - IF Score: {ml_decision.get('if_score', 'N/A')}")
            print(f"       - AE Score: {ml_decision.get('ae_score', 'N/A')}")
            print(f"     Decision: {ml_decision['decision'].upper()}")
            print(f"     Reasoning: {ml_decision['reasoning']}")
            
            # Show feature details
            print(f"     Key Features:")
            feature_details = features['raw']
            important_features = [
                'hour', 'day_of_week', 'is_weekend', 'location_match',
                'sequential_zone_violation', 'access_frequency_24h',
                'time_since_last_access_min', 'is_restricted_area'
            ]
            for feat in important_features:
                if feat in feature_details:
                    print(f"       - {feat}: {feature_details[feat]}")
        
        except Exception as e:
            print(f"   ✗ Error: {str(e)}")

db.close()
