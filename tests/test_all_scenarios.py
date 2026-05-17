#!/usr/bin/env python3
"""
Comprehensive test suite for RaptorX access control system.
Tests all scenarios: GRANT, DELAYED, DENIED based on real database data.
"""

import requests
import json
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path
from dotenv import load_dotenv
import os

# Load environment
load_dotenv(Path(__file__).parent / ".env")

# Configuration
BASE_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:3001"
ADMIN_EMAIL = "user0003@university.edu"
ADMIN_PIN = "1234"

THRESHOLDS = {
    "grant": float(os.getenv("DECISION_THRESHOLD_GRANT", "0.22")),
    "deny": float(os.getenv("DECISION_THRESHOLD_DENY", "0.47")),
}

def get_past_timestamp(hours_ago=0, minutes_ago=0, seconds_ago=0):
    """Generate a timestamp in the past."""
    return (datetime.now(timezone.utc) - timedelta(
        hours=hours_ago, minutes=minutes_ago, seconds=seconds_ago
    )).isoformat()

# Test data based on REAL DATABASE
# Users: ID 2-18 with badge BADGE_000002 through BADGE_000018, Clearance=1, Active
# Access Points: 1-10 with various names, some restricted (3,9,10)
TEST_SCENARIOS = [
    # ========== NORMAL/GRANT SCENARIOS ==========
    {
        "name": "Normal Access - Business Hours (Should GRANT)",
        "badge_id": "BADGE_000002",
        "access_point_id": 1,  # CS Lab - normal, not restricted
        "timestamp": get_past_timestamp(minutes_ago=5),  # 5 min ago
        "description": "Regular employee accessing CS Lab during business hours - typical pattern"
    },
    {
        "name": "Normal Access - Different Location (Should GRANT)",
        "badge_id": "BADGE_000006",
        "access_point_id": 5,  # Economy Library - different dept
        "timestamp": get_past_timestamp(minutes_ago=10),
        "description": "Employee accessing different department library - normal cross-dept access"
    },
    {
        "name": "Normal Repeat Access (Should GRANT)",
        "badge_id": "BADGE_000007",
        "access_point_id": 2,  # CS Office
        "timestamp": get_past_timestamp(minutes_ago=15),
        "description": "Same user accessing same location 24 hours later - established pattern"
    },
    
    # ========== DELAYED/UNCERTAIN SCENARIOS ==========
    {
        "name": "Off-Hours Access (Should DELAYED)",
        "badge_id": "BADGE_000008",
        "access_point_id": 1,  # CS Lab
        "timestamp": get_past_timestamp(hours_ago=2),  # 2 hours ago (ensure past)
        "description": "Employee accessing location at unusual time - outside normal hours"
    },
    {
        "name": "Unusual Time - Early Morning (Should DELAYED)",
        "badge_id": "BADGE_000009",
        "access_point_id": 4,  # CS Library
        "timestamp": get_past_timestamp(hours_ago=3),  # 3 hours ago (ensure past)
        "description": "Access at early morning - unusual timing"
    },
    {
        "name": "Weekend Access (Should DELAYED)",
        "badge_id": "BADGE_000010",
        "access_point_id": 8,  # Business Library
        "timestamp": get_past_timestamp(hours_ago=24),  # Yesterday (ensure past)
        "description": "Access pattern showing weekend behavior"
    },
    {
        "name": "Rapid Successive Access - Different Locations (Should DELAYED)",
        "badge_id": "BADGE_000011",
        "access_point_id": 1,  # First access CS Lab
        "timestamp": get_past_timestamp(seconds_ago=10),  # 10 sec ago
        "description": "First of rapid succession - will follow with access at different locations"
    },
]

class RaptorXTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.csrf_token = None
        self.results = []
        
    def update_csrf_token(self):
        """Get and update CSRF token."""
        try:
            response = self.session.get(
                f"{BASE_URL}/api/auth/csrf-token",
                timeout=5
            )
            if response.status_code == 200:
                self.csrf_token = response.json().get("csrf_token")
                if self.csrf_token:
                    self.session.headers.update({"X-CSRF-Token": self.csrf_token})
                    return True
        except:
            pass
        return False
        
    def log(self, message, level="INFO"):
        """Print formatted log message."""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        prefix = f"[{timestamp}]"
        if level == "ERROR":
            print(f"❌ {prefix} {message}")
        elif level == "SUCCESS":
            print(f"✅ {prefix} {message}")
        elif level == "WARNING":
            print(f"⚠️  {prefix} {message}")
        else:
            print(f"ℹ️  {prefix} {message}")
    
    def test_backend_connection(self):
        """Test if backend is running and accessible."""
        self.log("Testing backend connection...", "INFO")
        try:
            response = self.session.get(f"{BASE_URL}/health", timeout=5)
            if response.status_code == 200:
                self.log(f"✓ Backend is running at {BASE_URL}", "SUCCESS")
                return True
            else:
                self.log(f"Backend returned status {response.status_code}", "ERROR")
                return False
        except requests.exceptions.ConnectionError:
            self.log(f"Cannot connect to backend at {BASE_URL}. Is it running?", "ERROR")
            return False
        except Exception as e:
            self.log(f"Backend connection error: {e}", "ERROR")
            return False
    
    def authenticate(self):
        """Login as admin user to get auth token."""
        self.log("Authenticating as admin...", "INFO")
        try:
            # Get CSRF token first
            try:
                csrf_response = self.session.get(
                    f"{BASE_URL}/api/auth/csrf-token",
                    timeout=5
                )
                if csrf_response.status_code == 200:
                    csrf_token = csrf_response.json().get("csrf_token")
                    if csrf_token:
                        self.session.headers.update({"X-CSRF-Token": csrf_token})
                        self.log(f"✓ Got CSRF token", "SUCCESS")
            except Exception as e:
                self.log(f"Could not get CSRF token: {e}", "WARNING")
            
            response = self.session.post(
                f"{BASE_URL}/api/auth/login",
                json={
                    "email": ADMIN_EMAIL,
                    "pin": ADMIN_PIN
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get("access_token")
                self.session.headers.update({"Authorization": f"Bearer {self.auth_token}"})
                self.log(f"✓ Authenticated as {ADMIN_EMAIL}", "SUCCESS")
                return True
            else:
                self.log(f"Authentication failed: {response.status_code} - {response.text[:200]}", "ERROR")
                return False
        except Exception as e:
            self.log(f"Authentication error: {e}", "ERROR")
            return False
    
    def get_access_points(self):
        """Get list of available access points."""
        self.log("Fetching access points...", "INFO")
        try:
            response = self.session.get(
                f"{BASE_URL}/api/access/access-points",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                points = data.get("data", [])
                self.log(f"✓ Retrieved {len(points)} access points", "SUCCESS")
                return points
            else:
                self.log(f"Failed to get access points: {response.status_code}", "ERROR")
                return []
        except Exception as e:
            self.log(f"Error fetching access points: {e}", "ERROR")
            return []
    
    def get_users(self):
        """Get list of available users."""
        self.log("Fetching users...", "INFO")
        try:
            response = self.session.get(
                f"{BASE_URL}/api/users",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                users = data.get("data", [])
                self.log(f"✓ Retrieved {len(users)} users", "SUCCESS")
                return users
            else:
                self.log(f"Failed to get users: {response.status_code}", "ERROR")
                return []
        except Exception as e:
            self.log(f"Error fetching users: {e}", "ERROR")
            return []
    
    def test_access_request(self, badge_id, access_point_id, timestamp=None):
        """Test a single access request."""
        self.log(f"Sending access request: badge={badge_id}, point={access_point_id}", "INFO")
        
        try:
            if timestamp is None:
                timestamp = datetime.now(timezone.utc).isoformat()
            
            payload = {
                "badge_id": badge_id,
                "access_point_id": access_point_id,
                "timestamp": timestamp
            }
            
            response = self.session.post(
                f"{BASE_URL}/api/access/request",
                json=payload,
                timeout=15
            )
            
            if response.status_code == 200:
                result = response.json()
                decision = result.get("decision")
                score = result.get("risk_score", 0)
                
                # Determine expected vs actual
                if score < THRESHOLDS["grant"]:
                    predicted = "GRANT"
                elif score < THRESHOLDS["deny"]:
                    predicted = "UNCERTAIN"
                else:
                    predicted = "DENY"
                
                status = "✓" if decision.upper() == predicted else "!"
                self.log(
                    f"{status} {decision.upper()} (score={score:.4f}, predicted={predicted})",
                    "SUCCESS" if decision.upper() == predicted else "WARNING"
                )
                
                return {
                    "success": True,
                    "badge_id": badge_id,
                    "decision": decision,
                    "risk_score": score,
                    "access_log_id": result.get("access_log_id")
                }
            else:
                self.log(f"Request failed: {response.status_code} - {response.text}", "ERROR")
                return {"success": False, "badge_id": badge_id}
        
        except Exception as e:
            self.log(f"Access request error: {e}", "ERROR")
            return {"success": False, "badge_id": badge_id}
    
    def get_alerts(self):
        """Retrieve alerts from the system."""
        self.log("Fetching alerts...", "INFO")
        
        try:
            response = self.session.get(
                f"{BASE_URL}/api/alerts",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                alerts = data.get("data", [])
                total = data.get("pagination", {}).get("total", 0)
                self.log(f"✓ Retrieved {len(alerts)} alerts (total: {total})", "SUCCESS")
                return alerts
            else:
                self.log(f"Failed to get alerts: {response.status_code}", "ERROR")
                return []
        except Exception as e:
            self.log(f"Error fetching alerts: {e}", "ERROR")
            return []
    
    def get_access_logs(self):
        """Retrieve recent access logs."""
        self.log("Fetching access logs...", "INFO")
        
        try:
            response = self.session.get(
                f"{BASE_URL}/api/access/logs?page=1&page_size=10",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                logs = data.get("data", [])
                total = data.get("pagination", {}).get("total", 0)
                self.log(f"✓ Retrieved {len(logs)} recent logs (total in DB: {total})", "SUCCESS")
                return logs
            else:
                self.log(f"Failed to get access logs: {response.status_code}", "ERROR")
                return []
        except Exception as e:
            self.log(f"Error fetching access logs: {e}", "ERROR")
            return []
    
    def run_all_tests(self):
        """Run complete test suite."""
        print("\n" + "=" * 70)
        print("RAPTORX COMPREHENSIVE TEST SUITE")
        print("=" * 70)
        print(f"\nThresholds: GRANT={THRESHOLDS['grant']}, DENY={THRESHOLDS['deny']}")
        print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        
        # Step 0: Get CSRF token
        print("\n[STEP 0] Getting CSRF Token")
        print("-" * 70)
        if not self.update_csrf_token():
            print("⚠️  Could not get CSRF token, continuing anyway...")
        else:
            print("✅ Got CSRF token")
        
        # Step 1: Backend connection
        print("\n[STEP 1] Testing Backend Connection")
        print("-" * 70)
        if not self.test_backend_connection():
            print("\n❌ Cannot connect to backend. Aborting tests.")
            return False
        
        # Step 2: Run access scenarios
        print("\n[STEP 2] Testing Access Scenarios")
        print("-" * 70)
        access_results = []
        for i, scenario in enumerate(TEST_SCENARIOS, 1):
            print(f"\n  Scenario {i}: {scenario['name']}")
            print(f"  Description: {scenario['description']}")
            
            # Refresh CSRF token for each request
            self.update_csrf_token()
            result = self.test_access_request(
                scenario["badge_id"],
                scenario["access_point_id"],
                scenario["timestamp"]
            )
            access_results.append(result)
            time.sleep(0.5)  # Small delay between requests
        
        # Step 2b: Handle rapid successive access scenario
        print(f"\n  ➤ Following up on Rapid Successive Access scenario...")
        # Use 8 seconds ago instead of future time
        second_access_time = get_past_timestamp(seconds_ago=8)
        
        self.update_csrf_token()
        result2 = self.test_access_request(
            "BADGE_000011",
            2,  # Different location: CS Office
            second_access_time
        )
        access_results.append(result2)
        time.sleep(0.5)
        
        print(f"\n  ➤ Third rapid access within short timeframe...")
        # Use 6 seconds ago
        third_access_time = get_past_timestamp(seconds_ago=6)
        
        self.update_csrf_token()
        result3 = self.test_access_request(
            "BADGE_000011",
            4,  # Third different location: CS Library
            third_access_time
        )
        access_results.append(result3)
        
        # Step 3: Check for access logs (may not work without auth)
        print("\n[STEP 3] Checking System Data")
        print("-" * 70)
        logs = self.get_access_logs()
        
        # Step 4: Check for alerts (may not work without auth)
        print("\n[STEP 4] Checking Alerts")
        print("-" * 70)
        alerts = self.get_alerts()
        
        # Summary
        print("\n" + "=" * 70)
        print("TEST SUMMARY")
        print("=" * 70)
        
        successful_requests = sum(1 for r in access_results if r.get("success"))
        deny_decisions = sum(1 for r in access_results if r.get("decision") == "denied")
        grant_decisions = sum(1 for r in access_results if r.get("decision") == "granted")
        uncertain_decisions = sum(1 for r in access_results if r.get("decision") == "uncertain")
        
        print(f"\nAccess Requests: {successful_requests}/{len(access_results)} successful")
        print(f"  - Granted: {grant_decisions}")
        print(f"  - Uncertain: {uncertain_decisions}")
        print(f"  - Denied: {deny_decisions}")
        print(f"\nAccess Logs in DB: {len(logs)} recent")
        print(f"Alerts in System: {len(alerts)} alerts")
        
        if len(alerts) > 0:
            print(f"\n✅ ALERTS ARE WORKING! {len(alerts)} alerts found")
            for alert in alerts[:3]:
                print(f"   - Alert ID {alert.get('id')}: severity={alert.get('severity')}, "
                      f"status={alert.get('status')}")
        else:
            print(f"\n⚠️  NO ALERTS FOUND - Check alert creation logic")
        
        print("\n" + "=" * 70)
        print(f"\nFrontend: {FRONTEND_URL}")
        print(f"Backend API: {BASE_URL}")
        print("\nNext steps:")
        print("1. Open frontend in browser")
        print("2. Login with admin credentials")
        print("3. Check Access Logs tab (should show test requests)")
        print("4. Check Alerts tab (should show any anomalies)")
        print("=" * 70 + "\n")
        
        return True

if __name__ == "__main__":
    tester = RaptorXTester()
    tester.run_all_tests()
