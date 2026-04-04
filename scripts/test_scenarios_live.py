#!/usr/bin/env python3
"""Simulate realistic access scenarios to test model accuracy using REAL badge IDs."""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

class ScenarioTester:
    """Test scenarios against backend models."""
    
    def __init__(self):
        self.results = {
            "passed": [],
            "failed": [],
            "total": 0
        }
    
    def test_scenario(self, name: str, badge_id: str, access_point_id: int, expected_decision: str, expected_risk: str):
        """Send a scenario to backend and verify result."""
        
        payload = {
            "badge_id": badge_id,
            "access_point_id": access_point_id,
        }
        
        try:
            resp = requests.post(f"{BASE_URL}/api/access/request", json=payload, timeout=5)
            
            if resp.status_code != 200:
                self.results["failed"].append({
                    "scenario": name,
                    "issue": f"HTTP {resp.status_code}",
                    "response": resp.text[:100]
                })
                self.results["total"] += 1
                print(f"✗ {name:50s} | HTTP {resp.status_code}: {resp.text[:80]}")
                return False
            
            data = resp.json()
            decision = data.get("decision", "").lower()
            risk_score = data.get("risk_score", 0)
            mode = data.get("mode", "unknown")
            
            # Determine risk level from score
            if risk_score > 0.7:
                risk_level = "critical"
            elif risk_score > 0.5:
                risk_level = "high"
            elif risk_score > 0.3:
                risk_level = "medium"
            else:
                risk_level = "low"
            
            passed = decision == expected_decision.lower() and risk_level == expected_risk.lower()
            
            result = {
                "scenario": name,
                "decision": decision,
                "expected_decision": expected_decision.lower(),
                "risk_score": risk_score,
                "risk_level": risk_level,
                "expected_risk": expected_risk.lower(),
                "mode": mode,
                "passed": passed
            }
            
            if passed:
                self.results["passed"].append(result)
                print(f"✓ {name:50s} | {decision:10s} | Risk: {risk_level:10s} | Mode: {mode:12s} | Score: {risk_score:.3f}")
            else:
                self.results["failed"].append(result)
                print(f"✗ {name:50s} | Got {decision:10s} (exp {expected_decision:7s}) | {risk_level:10s} (exp {expected_risk:7s})")
            
            self.results["total"] += 1
            return passed
            
        except Exception as e:
            self.results["failed"].append({
                "scenario": name,
                "issue": str(e)
            })
            self.results["total"] += 1
            print(f"✗ {name:50s} | ERROR: {str(e)}")
            return False
    
    def print_summary(self):
        """Print test results summary."""
        total = self.results["total"]
        passed = len(self.results["passed"])
        failed = len(self.results["failed"])
        
        accuracy = (passed / total * 100) if total > 0 else 0
        
        print("\n" + "="*90)
        print(f"TEST SUMMARY: {passed}/{total} passed ({accuracy:.1f}%)")
        print("="*90)
        
        if accuracy >= 90:
            print(f"\n✅ EXCELLENT: {accuracy:.1f}% accuracy - Models are working well!")
        elif accuracy >= 75:
            print(f"\n🟡 GOOD: {accuracy:.1f}% accuracy - Models performing reasonably")
        elif accuracy >= 50:
            print(f"\n⚠️  FAIR: {accuracy:.1f}% accuracy - Models need tuning")
        else:
            print(f"\n🔴 POOR: {accuracy:.1f}% accuracy - Models need significant work")
        
        if failed > 0:
            print(f"\nFailed tests: {failed}")
            for r in self.results["failed"][:3]:
                if "issue" in r:
                    print(f"  • {r['scenario']}: {r['issue']}")
                else:
                    print(f"  • {r['scenario']}: Got {r['decision']}, expected {r['expected_decision']}")

def main():
    print("="*90)
    print("RAPTORX MODEL TEST SCENARIOS - USING REAL BADGE IDs")
    print("="*90)
    print(f"Backend URL: {BASE_URL}")
    print(f"Test time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    # Check backend is running
    try:
        resp = requests.get(f"{BASE_URL}/api/health", timeout=2)
        print(f"✓ Backend is running\n")
    except:
        print(f"❌ Backend is not running at {BASE_URL}")
        print("   Start with: cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000")
        return
    
    # Get actual badge IDs and access points from backend
    try:
        users_resp = requests.get(f"{BASE_URL}/api/users", timeout=5)
        users = users_resp.json() if users_resp.status_code == 200 else []
        badges = [u.get('badge_id') for u in users if u.get('badge_id')][:15]
        
        points_resp = requests.get(f"{BASE_URL}/api/access-points", timeout=5)
        points = points_resp.json() if points_resp.status_code == 200 else []
        
        print(f"✓ Found {len(badges)} real badge IDs and {len(points)} access points")
        print(f"  Sample badges: {badges[:3]}")
        print(f"  Sample points: {[p.get('name') for p in points[:3]]}\n")
    except Exception as e:
        print(f"❌ Could not fetch backend data: {e}")
        return
    
    if not badges or not points:
        print("❌ Insufficient data to run tests")
        return
    
    tester = ScenarioTester()
    
    # ==== NORMAL ACCESS SCENARIOS (should be GRANTED, LOW risk) ====
    print("-"*90)
    print("NORMAL ACCESS SCENARIOS (Expected: GRANTED, Low Risk)")
    print("-"*90)
    
    for i in range(min(3, len(badges))):
        point_id = points[i % len(points)].get('id')
        tester.test_scenario(
            f"User {badges[i]} - Normal daytime access",
            badge_id=badges[i],
            access_point_id=point_id,
            expected_decision="granted",
            expected_risk="low"
        )
    
    # ==== ANOMALOUS ACCESS SCENARIOS (same users, different/restricted points) ====
    print("\n" + "-"*90)
    print("ANOMALOUS ACCESS SCENARIOS (Expected: DENIED/DELAYED, High/Critical Risk)")
    print("-"*90) 
    # Use server room or restricted area (usually point ID 4 or similar)
    restricted_point_id = points[3].get('id') if len(points) > 3 else points[0].get('id')
    
    for i in range(3, min(6, len(badges))):
        tester.test_scenario(
            f"User {badges[i]} - Access to restricted area",
            badge_id=badges[i],
            access_point_id=restricted_point_id,
            expected_decision="denied",
            expected_risk="high"
        )
    
    # ==== EDGE CASES ====
    print("\n" + "-"*90)
    print("EDGE CASE SCENARIOS")
    print("-"*90)
    
    if len(badges) > 6:
        for i in [6]:
            point_id = points[(i+1) % len(points)].get('id')
            tester.test_scenario(
                f"User {badges[i]} - Different department access",
                badge_id=badges[i],
                access_point_id=point_id,
                expected_decision="granted",
                expected_risk="low"
            )
    
    # Print summary
    tester.print_summary()

if __name__ == "__main__":
    main()
