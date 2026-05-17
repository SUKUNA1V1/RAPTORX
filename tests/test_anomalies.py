#!/usr/bin/env python3
"""
Test script to trigger alerts with anomalous scenarios.
"""

import requests
import json
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path
from dotenv import load_dotenv
import os

load_dotenv(Path(__file__).parent / ".env")

BASE_URL = "http://localhost:8000"

THRESHOLDS = {
    "grant": float(os.getenv("DECISION_THRESHOLD_GRANT", "0.22")),
    "deny": float(os.getenv("DECISION_THRESHOLD_DENY", "0.47")),
}

# Test anomalies that should trigger HIGH scores
ANOMALY_SCENARIOS = [
    {
        "name": "User accessing restricted zone (low clearance)",
        "badge_id": "BADGE_000000",  # Clearance 1
        "access_point_id": 3,  # CS Servers Room (high security)
        "reason": "Clearance mismatch should increase risk"
    },
    {
        "name": "Rapid successive access attempts",
        "badge_id": "BADGE_000001",
        "access_point_id": 1,
        "reason": "Multiple requests in short timeframe",
        "repeat": 3,  # Try 3 times
        "delay": 1  # 1 second apart
    },
    {
        "name": "Off-hours access",
        "badge_id": "BADGE_000000",
        "access_point_id": 5,
        "timestamp_offset": -600,  # 10 hours ago (3 AM)
        "reason": "Access during off-business hours"
    },
]

def get_csrf_token():
    """Get CSRF token for requests."""
    try:
        resp = requests.get(f"{BASE_URL}/api/auth/csrf-token")
        if resp.status_code == 200:
            return resp.json().get("csrf_token")
    except:
        pass
    return None

def test_anomaly_scenario(scenario):
    """Test a single anomaly scenario."""
    print(f"\n{'='*70}")
    print(f"ANOMALY SCENARIO: {scenario['name']}")
    print(f"Reason: {scenario['reason']}")
    print(f"{'='*70}")
    
    session = requests.Session()
    csrf_token = get_csrf_token()
    if csrf_token:
        session.headers.update({"X-CSRF-Token": csrf_token})
    
    badge_id = scenario["badge_id"]
    access_point_id = scenario["access_point_id"]
    repeat = scenario.get("repeat", 1)
    delay = scenario.get("delay", 0)
    
    results = []
    
    for attempt in range(repeat):
        # Calculate timestamp
        if "timestamp_offset" in scenario:
            timestamp = (datetime.now(timezone.utc) + timedelta(seconds=scenario["timestamp_offset"])).isoformat()
        else:
            timestamp = datetime.now(timezone.utc).isoformat()
        
        payload = {
            "badge_id": badge_id,
            "access_point_id": access_point_id,
            "timestamp": timestamp
        }
        
        try:
            print(f"\n  Attempt {attempt + 1}/{repeat}:")
            response = session.post(
                f"{BASE_URL}/api/access/request",
                json=payload,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                decision = data.get("decision")
                score = data.get("risk_score", 0)
                alert_created = data.get("alert_created", False)
                
                result_icon = "🚨" if alert_created else "📊"
                print(f"    {result_icon} Decision: {decision.upper()}")
                print(f"       Score: {score:.4f}")
                print(f"       Alert Created: {'YES ✓' if alert_created else 'NO'}")
                
                results.append({
                    "decision": decision,
                    "score": score,
                    "alert_created": alert_created
                })
            else:
                print(f"    ❌ Error: {response.status_code}")
        
        except Exception as e:
            print(f"    ❌ Exception: {e}")
        
        if delay and attempt < repeat - 1:
            time.sleep(delay)
    
    return results

def check_alerts():
    """Check if alerts exist in database."""
    print(f"\n{'='*70}")
    print("CHECKING DATABASE FOR ALERTS")
    print(f"{'='*70}")
    
    import sys
    sys.path.insert(0, str(Path(__file__).parent / 'backend'))
    
    try:
        from app.database import SessionLocal
        from app.models import AnomalyAlert
        
        db = SessionLocal()
        alerts = db.query(AnomalyAlert).all()
        
        print(f"\n✓ Total alerts in database: {len(alerts)}")
        
        if alerts:
            print("\nRecent alerts:")
            for alert in alerts[-5:]:
                print(f"  - Alert {alert.id}: severity={alert.severity}, status={alert.status}, score={alert.confidence:.4f}")
        else:
            print("  (No alerts yet - try increasing anomaly scenarios)")
        
        db.close()
    except Exception as e:
        print(f"❌ Could not check database: {e}")

if __name__ == "__main__":
    print("\n" + "="*70)
    print("RAPTORX ANOMALY DETECTION TEST")
    print("="*70)
    print(f"\nThresholds: GRANT={THRESHOLDS['grant']:.2f}, DENY={THRESHOLDS['deny']:.2f}")
    print(f"Alert trigger: DENIED or (DELAYED and score >= 0.50)")
    
    # Run anomaly scenarios
    all_results = []
    for scenario in ANOMALY_SCENARIOS:
        results = test_anomaly_scenario(scenario)
        all_results.extend(results)
    
    # Check for alerts
    time.sleep(1)
    check_alerts()
    
    # Summary
    print(f"\n{'='*70}")
    print("SUMMARY")
    print(f"{'='*70}")
    print(f"Total requests: {len(all_results)}")
    print(f"Denied: {sum(1 for r in all_results if r['decision'] == 'denied')}")
    print(f"Delayed: {sum(1 for r in all_results if r['decision'] == 'delayed')}")
    print(f"Granted: {sum(1 for r in all_results if r['decision'] == 'granted')}")
    print(f"Alerts created: {sum(1 for r in all_results if r['alert_created'])}")
    print(f"{'='*70}\n")
