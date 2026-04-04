#!/usr/bin/env python3
"""Debug backend database state."""

import requests
import json

BASE_URL = "http://localhost:8000"

def debug_backend():
    print("="*90)
    print("BACKEND STATE DIAGNOSTIC")
    print("="*90)
    
    # Check users
    print("\n1. Checking users in database...")
    try:
        resp = requests.get(f"{BASE_URL}/api/users", timeout=5)
        if resp.status_code == 200:
            users = resp.json()
            print(f"   Found {len(users)} users")
            for user in users[:5]:
                print(f"   - {user.get('name')} (badge: {user.get('badge_id')})")
        else:
            print(f"   ✗ Error: {resp.status_code}")
    except Exception as e:
        print(f"   ✗ Error: {e}")
    
    # Check access points
    print("\n2. Checking access points in database...")
    try:
        resp = requests.get(f"{BASE_URL}/api/access-points", timeout=5)
        if resp.status_code == 200:
            points = resp.json()
            print(f"   Found {len(points)} access points")
            for point in points[:5]:
                print(f"   - {point.get('name')} (ID: {point.get('id')})")
        else:
            print(f"   ✗ Error: {resp.status_code}")
    except Exception as e:
        print(f"   ✗ Error: {e}")
    
    # Check access logs
    print("\n3. Checking recent access logs...")
    try:
        resp = requests.get(f"{BASE_URL}/api/access/logs?limit=5", timeout=5)
        if resp.status_code == 200:
            logs = resp.json()
            print(f"   Found {len(logs)} recent logs")
            for log in logs[:3]:
                print(f"   - {log.get('user_name')} → {log.get('access_point_name')} | Decision: {log.get('decision')} | Risk: {log.get('risk_score'):.3f}")
        else:
            print(f"   ✗ Error: {resp.status_code}")
    except Exception as e:
        print(f"   ✗ Error: {e}")
    
    # Check ML status
    print("\n4. Checking ML model status...")
    try:
        resp = requests.get(f"{BASE_URL}/api/ml/status", timeout=5)
        if resp.status_code == 200:
            status = resp.json()
            print(f"   Model ready: {status.get('model_ready')}")
            print(f"   Threshold: {status.get('threshold', 'N/A')}")
            print(f"   Response: {json.dumps(status, indent=2)}")
        else:
            print(f"   ✗ Error: {resp.status_code}")
    except Exception as e:
        print(f"   ✗ Error: {e}")
    
    # Try a direct access request and see the full response
    print("\n5. Testing single access request (will likely be denied)...")
    try:
        # Get first access point
        ap_resp = requests.get(f"{BASE_URL}/api/access-points", timeout=5)
        if ap_resp.status_code == 200:
            points = ap_resp.json()
            if points:
                ap_id = points[0].get('id')
                
                payload = {
                    "badge_id": "TEST_USER",
                    "access_point_id": ap_id,
                }
                
                resp = requests.post(f"{BASE_URL}/api/access/request", json=payload, timeout=5)
                print(f"   Status: {resp.status_code}")
                print(f"   Response: {json.dumps(resp.json(), indent=2)}")
    except Exception as e:
        print(f"   ✗ Error: {e}")

if __name__ == "__main__":
    debug_backend()
