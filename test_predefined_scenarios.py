#!/usr/bin/env python3
"""
Test simulator with predefined scenarios.
This tests the exact flow that fails in the frontend.
"""

import requests
import json
from datetime import datetime, timezone, timedelta
from pathlib import Path
from dotenv import load_dotenv
import os

load_dotenv(Path(__file__).parent / ".env")

BASE_URL = "http://localhost:8000"

def get_csrf_token():
    """Get CSRF token for requests."""
    try:
        resp = requests.get(f"{BASE_URL}/api/auth/csrf-token")
        if resp.status_code == 200:
            return resp.json().get("csrf_token")
    except:
        pass
    return None

def test_predefined_scenario():
    """Test predefined scenario requests."""
    print("="*70)
    print("TESTING PREDEFINED SIMULATOR SCENARIOS")
    print("="*70)
    
    session = requests.Session()
    csrf_token = get_csrf_token()
    if csrf_token:
        session.headers.update({"X-CSRF-Token": csrf_token})
    
    # These are the exact timestamp patterns that the simulator uses
    # for different scenarios
    test_cases = [
        {
            "name": "Normal scenario (current time)",
            "badge_id": "BADGE_000000",
            "access_point_id": 1,
            "timestamp": datetime.now(timezone.utc).isoformat()
        },
        {
            "name": "Unusual hour scenario (11 PM)",
            "badge_id": "BADGE_000001",
            "access_point_id": 2,
            "timestamp": datetime.now(timezone.utc).replace(hour=23, minute=0, second=0, microsecond=0).isoformat()
        },
        {
            "name": "Early morning scenario (6 AM)",
            "badge_id": "BADGE_000000",
            "access_point_id": 3,
            "timestamp": datetime.now(timezone.utc).replace(hour=6, minute=30, second=0, microsecond=0).isoformat()
        },
        {
            "name": "Early morning yesterday (to avoid future)",
            "badge_id": "BADGE_000001",
            "access_point_id": 1,
            "timestamp": (datetime.now(timezone.utc) - timedelta(days=1)).replace(hour=6, minute=30, second=0, microsecond=0).isoformat()
        },
    ]
    
    results = []
    
    for test_case in test_cases:
        print(f"\n📋 {test_case['name']}")
        print(f"   Timestamp: {test_case['timestamp']}")
        
        payload = {
            "badge_id": test_case["badge_id"],
            "access_point_id": test_case["access_point_id"],
            "timestamp": test_case["timestamp"]
        }
        
        try:
            response = session.post(
                f"{BASE_URL}/api/access/request",
                json=payload,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"   ✓ PASS - Decision: {data.get('decision').upper()}, Score: {data.get('risk_score'):.4f}")
                results.append({"test": test_case["name"], "status": "PASS"})
            else:
                error_detail = response.json().get("detail", "Unknown error")
                print(f"   ✗ FAIL - Status: {response.status_code}")
                if isinstance(error_detail, list) and error_detail:
                    print(f"          Error: {error_detail[0].get('msg', 'Unknown')}")
                else:
                    print(f"          Error: {error_detail}")
                results.append({"test": test_case["name"], "status": "FAIL", "code": response.status_code})
        
        except Exception as e:
            print(f"   ✗ EXCEPTION: {str(e)}")
            results.append({"test": test_case["name"], "status": "ERROR", "error": str(e)})
    
    # Summary
    print(f"\n{'='*70}")
    print("SUMMARY")
    print(f"{'='*70}")
    passed = sum(1 for r in results if r["status"] == "PASS")
    failed = sum(1 for r in results if r["status"] == "FAIL")
    errors = sum(1 for r in results if r["status"] == "ERROR")
    
    print(f"Passed: {passed}/{len(results)}")
    print(f"Failed: {failed}/{len(results)}")
    print(f"Errors: {errors}/{len(results)}")
    
    if passed == len(results):
        print("\n✓ All tests PASSED!")
    else:
        print("\n✗ Some tests FAILED - check details above")
    
    return passed == len(results)

if __name__ == "__main__":
    success = test_predefined_scenario()
    exit(0 if success else 1)
