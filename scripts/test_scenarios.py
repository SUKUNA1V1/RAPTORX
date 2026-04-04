#!/usr/bin/env python3
"""Simulate realistic access scenarios to test model accuracy."""

import requests
import json
from datetime import datetime
import time

BASE_URL = "http://localhost:8000"

class ScenarioTester:
    """Test scenarios against backend models."""
    
    def __init__(self):
        self.results = {
            "passed": [],
            "failed": [],
            "total": 0
        }
    
    def test_scenario(self, name: str, badge_id: str, access_point: str, expected_decision: str, expected_risk: str):
        """Send a scenario to backend and verify result."""
        
        # First, get or create the access point ID
        try:
            ap_resp = requests.get(f"{BASE_URL}/api/access-points", timeout=5)
            if ap_resp.status_code != 200:
                print(f"✗ {name:50s} | Could not fetch access points: {ap_resp.status_code}")
                self.results["failed"].append({"scenario": name, "issue": "No access points"})
                self.results["total"] += 1
                return False
            
            points = ap_resp.json()
            access_point_id = None
            
            # Find access point by name
            for point in points:
                if point.get("name", "").lower() == access_point.lower():
                    access_point_id = point.get("id")
                    break
            
            if not access_point_id:
                # Use first available
                if points:
                    access_point_id = points[0].get("id")
                else:
                    print(f"✗ {name:50s} | No access points available")
                    self.results["failed"].append({"scenario": name, "issue": "No access points"})
                    self.results["total"] += 1
                    return False
        except Exception as e:
            print(f"✗ {name:50s} | Error fetching access points: {str(e)}")
            self.results["failed"].append({"scenario": name, "issue": f"AP fetch error: {str(e)}"})
            self.results["total"] += 1
            return False
        
        # Now make the access request
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
                "passed": passed
            }
            
            if passed:
                self.results["passed"].append(result)
                print(f"✓ {name:50s} | {decision:10s} | Risk: {risk_level:10s} | Score: {risk_score:.3f}")
            else:
                self.results["failed"].append(result)
                print(f"✗ {name:50s} | Got {decision:10s} (expected {expected_decision:10s}) | {risk_level:10s} (expected {expected_risk:10s})")
            
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
        
        if failed > 0:
            print(f"\n❌ FAILED TESTS ({failed}):")
            for result in self.results["failed"]:
                if "issue" in result:
                    print(f"  • {result['scenario']}: {result['issue']}")
                else:
                    print(f"  • {result['scenario']}: Got {result['decision']} (expected {result['expected_decision']})")
        
        if accuracy >= 90:
            print(f"\n✅ EXCELLENT: {accuracy:.1f}% accuracy - Models are working well!")
        elif accuracy >= 75:
            print(f"\n🟡 GOOD: {accuracy:.1f}% accuracy - Models performing reasonably")
        elif accuracy >= 50:
            print(f"\n⚠️  FAIR: {accuracy:.1f}% accuracy - Models need tuning")
        else:
            print(f"\n🔴 POOR: {accuracy:.1f}% accuracy - Models need significant work")

def main():
    print("="*90)
    print("RAPTORX MODEL TEST SCENARIOS")
    print("="*90)
    print(f"Backend URL: {BASE_URL}")
    print(f"Test time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    # Check backend is running
    try:
        resp = requests.get(f"{BASE_URL}/api/health", timeout=2)
        print(f"✓ Backend is running\n")
    except:
        print("❌ Backend is not running at {BASE_URL}")
        print("   Start with: cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000")
        return
    
    tester = ScenarioTester()
    
    # ==== NORMAL ACCESS SCENARIOS (should be GRANTED, LOW risk) ====
    print("-"*90)
    print("NORMAL ACCESS SCENARIOS (Expected: GRANTED, Low Risk)")
    print("-"*90)
    
    tester.test_scenario(
        "Regular employee morning access",
        badge_id="EMP001",
        access_point="engineering",
        expected_decision="granted",
        expected_risk="low"
    )
    
    tester.test_scenario(
        "Manager access to office during work hours",
        badge_id="MGR001",
        access_point="executive",
        expected_decision="granted",
        expected_risk="low"
    )
    
    tester.test_scenario(
        "IT staff accessing IT department",
        badge_id="IT001",
        access_point="it",
        expected_decision="granted",
        expected_risk="low"
    )
    
    tester.test_scenario(
        "Employee accessing different department (allowed)",
        badge_id="EMP002",
        access_point="marketing",
        expected_decision="granted",
        expected_risk="low"
    )
    
    tester.test_scenario(
        "Finance staff to finance office",
        badge_id="FIN001",
        access_point="finance",
        expected_decision="granted",
        expected_risk="low"
    )
    
    # ==== SUSPICIOUS ACCESS SCENARIOS (should be DENIED, HIGH/CRITICAL risk) ====
    print("\n" + "-"*90)
    print("ANOMALOUS ACCESS SCENARIOS (Expected: DENIED, High/Critical Risk)")
    print("-"*90)
    
    tester.test_scenario(
        "Server room access at 2 AM",
        badge_id="EMP003",
        access_point="server_room",
        expected_decision="denied",
        expected_risk="critical"
    )
    
    tester.test_scenario(
        "Executive access at 3 AM on weekend",
        badge_id="MGR002",
        access_point="executive",
        expected_decision="denied",
        expected_risk="critical"
    )
    
    tester.test_scenario(
        "Low-level employee to restricted server room",
        badge_id="EMP004",
        access_point="server_room",
        expected_decision="denied",
        expected_risk="high"
    )
    
    tester.test_scenario(
        "Access from impossible distance (badge cloning)",
        badge_id="EMP001",
        access_point="executive",  # Far from usual zone
        expected_decision="denied",
        expected_risk="high"
    )
    
    tester.test_scenario(
        "Repeated failed access attempts",
        badge_id="UNKNOWN",
        access_point="server_room",
        expected_decision="denied",
        expected_risk="high"
    )
    
    tester.test_scenario(
        "Access during off-hours to sensitive area",
        badge_id="IT002",
        access_point="finance",
        expected_decision="denied",
        expected_risk="critical"
    )
    
    tester.test_scenario(
        "Unauthorized zone access (low clearance)",
        badge_id="EMP005",
        access_point="executive",
        expected_decision="denied",
        expected_risk="high"
    )
    
    tester.test_scenario(
        "Late night access to server room",
        badge_id="IT003",
        access_point="server_room",
        expected_decision="delayed",  # May be delayed for review
        expected_risk="high"
    )
    
    # ==== EDGE CASES ====
    print("\n" + "-"*90)
    print("EDGE CASE SCENARIOS")
    print("-"*90)
    
    tester.test_scenario(
        "First time access to new location (authorized)",
        badge_id="EMP006",
        access_point="hr",
        expected_decision="granted",
        expected_risk="low"
    )
    
    tester.test_scenario(
        "Contractor afternoon access (should be low risk)",
        badge_id="CONT001",
        access_point="engineering",
        expected_decision="granted",
        expected_risk="low"
    )
    
    # Print summary
    tester.print_summary()
    
    # Additional insights
    if tester.results["total"] > 0:
        print("\n" + "="*90)
        print("DETAILED RESULTS")
        print("="*90)
        
        if tester.results["passed"]:
            print(f"\n✓ PASSED ({len(tester.results['passed'])}):")
            for r in tester.results["passed"][:5]:  # Show first 5
                print(f"  {r['scenario']:50s} | {r['decision']:10s} | {r['risk_level']}")
        
        if tester.results["failed"]:
            print(f"\n✗ FAILED ({len(tester.results['failed'])}):")
            for r in tester.results["failed"][:5]:  # Show first 5
                if "issue" not in r:
                    print(f"  {r['scenario']:50s} | Got: {r['decision']:10s}, Expected: {r['expected_decision']}")
                else:
                    print(f"  {r['scenario']:50s} | {r.get('issue', 'Unknown error')}")

if __name__ == "__main__":
    main()
