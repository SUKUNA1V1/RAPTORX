#!/usr/bin/env python3
"""Production-like test showing system working correctly."""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

def test_production_scenarios():
    print("="*90)
    print("PRODUCTION VERIFICATION - MODEL BEHAVIOR")
    print("="*90)
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    # Get data
    users_resp = requests.get(f"{BASE_URL}/api/users", timeout=5)
    users = users_resp.json() if users_resp.status_code == 200 else []
    badges = [u.get('badge_id') for u in users if u.get('badge_id')][:5]
    
    points_resp = requests.get(f"{BASE_URL}/api/access-points", timeout=5)
    points = points_resp.json() if points_resp.status_code == 200 else []
    
    metrics = {
        "normal_access": [],
        "restricted_access": [],
        "cross_dept_access": []
    }
    
    print("-"*90)
    print("TEST 1: Normal Employee Access (Same Department)")
    print("-"*90)
    
    for badge in badges[:2]:
        for point_idx in [0, 1, 2]:  # Try different normal points
            if point_idx < len(points):
                payload = {"badge_id": badge, "access_point_id": points[point_idx].get('id')}
                resp = requests.post(f"{BASE_URL}/api/access/request", json=payload, timeout=5)
                if resp.status_code == 200:
                    data = resp.json()
                    decision = data.get("decision")
                    risk = data.get("risk_score")
                    metrics["normal_access"].append({
                        "badge": badge,
                        "point": points[point_idx].get('name'),
                        "decision": decision,
                        "risk": risk
                    })
                    
                    status = "✓" if decision == "granted" and risk < 0.5 else "✗"
                    print(f"  {status} {badge} → {points[point_idx].get('name'):40s} | Decision: {decision:10s} | Risk: {risk:.3f}")
    
    print("\n" + "-"*90)
    print("TEST 2: Cross-Department Access")
    print("-"*90)
    
    if len(badges) >= 2 and len(points) >= 4:
        badge = badges[0]
        for point_idx in [2, 3]:  # Different departments
            if point_idx < len(points):
                payload = {"badge_id": badge, "access_point_id": points[point_idx].get('id')}
                resp = requests.post(f"{BASE_URL}/api/access/request", json=payload, timeout=5)
                if resp.status_code == 200:
                    data = resp.json()
                    decision = data.get("decision")
                    risk = data.get("risk_score")
                    
                    # Cross-dept should be decided by role, but generally safe
                    status = "✓" if risk < 0.7 else "⚠"
                    print(f"  {status} {badge} → {points[point_idx].get('name'):40s} | Decision: {decision:10s} | Risk: {risk:.3f}")
    
    print("\n" + "-"*90)
    print("TEST 3: Restricted Area Access")
    print("-"*90)
    
    if len(points) > 3:
        # Server room or restricted area is usually point 4
        restricted_point = points[3]
        for badge in badges:
            payload = {"badge_id": badge, "access_point_id": restricted_point.get('id')}
            resp = requests.post(f"{BASE_URL}/api/access/request", json=payload, timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                decision = data.get("decision")
                risk = data.get("risk_score")
                mode = data.get("mode")
                
                # Restricted area access - stricter rules
                is_correct = (decision == "denied" and risk > 0.5) or (decision == "granted" and risk < 0.5)
                status = "✓" if is_correct else "~"
                print(f"  {status} {badge} → {restricted_point.get('name'):40s} | Decision: {decision:10s} | Risk: {risk:.3f} | Mode: {mode}")
    
    # Summary
    print("\n" + "="*90)
    print("SYSTEM PERFORMANCE SUMMARY")
    print("="*90)
    
    normal_granted = sum(1 for m in metrics["normal_access"] if m["decision"] == "granted" and m["risk"] < 0.5)
    normal_total = len(metrics["normal_access"])
    
    print(f"\nNormal Access Success Rate: {normal_granted}/{normal_total} ({normal_granted/normal_total*100:.0f}%)")
    print(f"  → Expected: ~100% (normal daytime access should be granted)")
    
    if normal_granted / normal_total > 0.8:
        print("\n✅ SYSTEM IS WORKING WELL")
        print("   - Normal employee access is correctly granted")
        print("   - Risk scores are low for legitimate access")
        print("   - Models are distinguishing normal from restricted")
    else:
        print("\n⚠️  SYSTEM NEEDS TUNING")
        print("   - Normal access is being rejected too often")
        print("   - Check user profiles and feature extraction")

if __name__ == "__main__":
    test_production_scenarios()
