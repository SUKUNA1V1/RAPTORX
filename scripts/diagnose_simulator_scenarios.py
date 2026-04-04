#!/usr/bin/env python3
"""Diagnostic script to identify issues in simulator scenarios."""

import requests
import json
from datetime import datetime, timedelta
from collections import defaultdict

BASE_URL = "http://localhost:8000"

def diagnose_scenarios():
    print("="*90)
    print("SIMULATOR SCENARIO DIAGNOSTICS")
    print("="*90)
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    # Get data
    users_resp = requests.get(f"{BASE_URL}/api/users", timeout=5)
    users = users_resp.json() if users_resp.status_code == 200 else []
    
    points_resp = requests.get(f"{BASE_URL}/api/access-points", timeout=5)
    points = points_resp.json() if points_resp.status_code == 200 else []
    
    print(f"📊 DATA LOADED:")
    print(f"   Users: {len(users)} total")
    print(f"   - Clearance Level 1: {len([u for u in users if (u.get('clearance_level') or 1) == 1])}")
    print(f"   - Clearance Level 2: {len([u for u in users if (u.get('clearance_level') or 1) == 2])}")
    print(f"   - Clearance Level 3+: {len([u for u in users if (u.get('clearance_level') or 1) >= 3])}")
    print(f"   Access Points: {len(points)} total")
    print(f"   - Restricted: {len([p for p in points if p.get('is_restricted')])}")
    print(f"   - Normal: {len([p for p in points if not p.get('is_restricted')])}\n")
    
    # Check each scenario's assumptions
    scenarios = {
        'normal': {
            'desc': 'Normal Traffic (daytime, low risk)',
            'test': normal_traffic_check,
            'expected_decision': 'granted',
            'expected_risk': '<0.3',
        },
        'repeat_normal': {
            'desc': 'Repeated Normal Access (5x same user/location)',
            'test': repeat_normal_check,
            'expected_decision': 'granted',
            'expected_risk': '<0.3 (consistent)',
        },
        'weekend_normal': {
            'desc': 'Weekend Normal (regular employee, weekend)',
            'test': weekend_normal_check,
            'expected_decision': 'granted',
            'expected_risk': '<0.4',
        },
        'cross_dept': {
            'desc': 'Cross-Department Manager (manager accessing other depts)',
            'test': cross_dept_check,
            'expected_decision': 'granted',
            'expected_risk': '<0.35',
        },
        'early_morning': {
            'desc': 'Early Morning Access (6-7 AM)',
            'test': early_morning_check,
            'expected_decision': 'granted',
            'expected_risk': '<0.35',
        },
        'unusual_hours': {
            'desc': 'Unusual Hours (2-4 AM, 11 PM)',
            'test': unusual_hours_check,
            'expected_decision': 'denied',
            'expected_risk': '>0.7',
        },
        'badge_cloning': {
            'desc': 'Badge Cloning (2 locations, 30sec apart)',
            'test': badge_cloning_check,
            'expected_decision': 'denied',
            'expected_risk': '>0.7',
        },
        'restricted_access': {
            'desc': 'Restricted Access (low-clearance user to restricted area)',
            'test': restricted_access_check,
            'expected_decision': 'denied',
            'expected_risk': '>0.7',
        },
        'sequential_restricted': {
            'desc': 'Sequential Restricted (low-clearance, 3 restricted areas)',
            'test': sequential_restricted_check,
            'expected_decision': 'denied',
            'expected_risk': '>0.7',
        },
        'high_frequency': {
            'desc': 'High Frequency (5 rapid requests, 4sec apart)',
            'test': high_frequency_check,
            'expected_decision': 'denied',
            'expected_risk': '>0.5',
        },
    }
    
    for scenario_key, scenario_info in scenarios.items():
        print(f"\n{'='*90}")
        print(f"SCENARIO: {scenario_info['desc']}")
        print(f"Expected: {scenario_info['expected_decision'].upper()} | Risk: {scenario_info['expected_risk']}")
        print(f"{'='*90}")
        
        try:
            scenario_info['test'](users, points, BASE_URL)
        except Exception as e:
            print(f"❌ ERROR: {str(e)}")

def normal_traffic_check(users, points, base_url):
    """Test normal daytime access."""
    active_users = [u for u in users if u.get('is_active')]
    if not active_users:
        print("❌ NO ACTIVE USERS")
        return
    
    user = active_users[0]
    user_clearance = user.get('clearance_level', 1)
    
    # Find accessible points
    accessible = [p for p in points if p.get('status') == 'active' and (p.get('required_clearance', 1) <= user_clearance)]
    if not accessible:
        print(f"❌ USER {user['badge_id']} (clearance {user_clearance}) has NO accessible points")
        return
    
    point = accessible[0]
    
    print(f"✓ User: {user['badge_id']} (clearance {user_clearance})")
    print(f"✓ Point: {point['name']} (required {point.get('required_clearance', 1)})")
    print(f"✓ Time: Current (daytime)")
    
    resp = requests.post(f"{base_url}/api/access/request", json={
        'badge_id': user['badge_id'],
        'access_point_id': point['id'],
    }, timeout=5)
    
    if resp.status_code == 200:
        data = resp.json()
        decision = data.get('decision')
        risk = data.get('risk_score', 0)
        print(f"\n📊 Result: {decision.upper()} | Risk: {risk:.3f}")
        print(f"   Mode: {data.get('mode')}")
        print(f"   Reasoning: {data.get('reasoning')}")
        
        # Check if correct
        if decision == 'granted' and risk < 0.3:
            print(f"✅ CORRECT")
        else:
            print(f"⚠️ UNEXPECTED (expected granted, risk <0.3)")
    else:
        print(f"❌ API ERROR: {resp.status_code}")

def repeat_normal_check(users, points, base_url):
    """Test same user accessing same point 3 times."""
    active_users = [u for u in users if u.get('is_active')]
    if not active_users:
        print("❌ NO ACTIVE USERS")
        return
    
    user = active_users[0]
    user_clearance = user.get('clearance_level', 1)
    
    accessible = [p for p in points if p.get('status') == 'active' and not p.get('is_restricted') and (p.get('required_clearance', 1) <= user_clearance)]
    if not accessible:
        print(f"❌ USER {user['badge_id']} has NO accessible non-restricted points")
        return
    
    point = accessible[0]
    
    print(f"✓ User: {user['badge_id']} (clearance {user_clearance})")
    print(f"✓ Point: {point['name']}")
    print(f"✓ Pattern: Same user, same location, 3 times (spaced 24min apart)")
    
    results = []
    for i in range(3):
        timestamp = (datetime.now() + timedelta(minutes=i*24)).isoformat()
        resp = requests.post(f"{base_url}/api/access/request", json={
            'badge_id': user['badge_id'],
            'access_point_id': point['id'],
            'timestamp': timestamp,
        }, timeout=5)
        
        if resp.status_code == 200:
            data = resp.json()
            results.append({
                'idx': i,
                'decision': data.get('decision'),
                'risk': data.get('risk_score', 0)
            })
    
    print(f"\n📊 Results ({len(results)} requests):")
    for r in results:
        print(f"   [{r['idx']}] {r['decision'].upper()} | Risk: {r['risk']:.3f}")
    
    # Check consistency
    all_granted = all(r['decision'] == 'granted' for r in results)
    consistently_low = all(r['risk'] < 0.3 for r in results)
    
    if all_granted and consistently_low:
        print(f"✅ CORRECT (all granted, consistent low risk)")
    else:
        print(f"⚠️ INCONSISTENT - should all be granted & low risk")

def weekend_normal_check(users, points, base_url):
    """Test normal employee on weekend."""
    active_users = [u for u in users if u.get('is_active')]
    if not active_users:
        print("❌ NO ACTIVE USERS")
        return
    
    user = active_users[0]
    user_clearance = user.get('clearance_level', 1)
    
    accessible = [p for p in points if p.get('status') == 'active' and not p.get('is_restricted') and (p.get('required_clearance', 1) <= user_clearance)]
    if not accessible:
        print(f"❌ USER {user['badge_id']} has NO accessible normal points")
        return
    
    point = accessible[0]
    
    # Set weekend timestamp
    now = datetime.now()
    days_until_saturday = (5 - now.weekday()) % 7
    if days_until_saturday == 0:
        days_until_saturday = 7
    weekend = now + timedelta(days=days_until_saturday)
    weekend = weekend.replace(hour=10, minute=0, second=0)
    
    print(f"✓ User: {user['badge_id']} (clearance {user_clearance})")
    print(f"✓ Point: {point['name']}")
    print(f"✓ Time: {weekend.strftime('%A %H:%M')} (weekend)")
    
    resp = requests.post(f"{base_url}/api/access/request", json={
        'badge_id': user['badge_id'],
        'access_point_id': point['id'],
        'timestamp': weekend.isoformat(),
    }, timeout=5)
    
    if resp.status_code == 200:
        data = resp.json()
        decision = data.get('decision')
        risk = data.get('risk_score', 0)
        print(f"\n📊 Result: {decision.upper()} | Risk: {risk:.3f}")
        
        if decision in ['granted', 'delayed'] and risk < 0.5:
            print(f"✅ CORRECT (should allow weekend work)")
        else:
            print(f"⚠️ FALSE POSITIVE (weekend work wrongly denied)")
    else:
        print(f"❌ API ERROR: {resp.status_code}")

def cross_dept_check(users, points, base_url):
    """Test high-clearance manager accessing other departments."""
    high_clearance = [u for u in users if u.get('is_active') and (u.get('clearance_level', 1) >= 3)]
    if not high_clearance:
        print("❌ NO HIGH-CLEARANCE USERS (>=3)")
        return
    
    user = high_clearance[0]
    user_clearance = user.get('clearance_level', 1)
    
    # Pick different departments
    normal_points = [p for p in points if p.get('status') == 'active' and not p.get('is_restricted')]
    if len(normal_points) < 2:
        print(f"❌ Less than 2 normal access points available")
        return
    
    point = normal_points[0]
    
    print(f"✓ User: {user['badge_id']} (HIGH clearance {user_clearance})")
    print(f"✓ Point: {point['name']}")
    print(f"✓ Pattern: Manager accessing another department")
    
    resp = requests.post(f"{base_url}/api/access/request", json={
        'badge_id': user['badge_id'],
        'access_point_id': point['id'],
    }, timeout=5)
    
    if resp.status_code == 200:
        data = resp.json()
        decision = data.get('decision')
        risk = data.get('risk_score', 0)
        print(f"\n📊 Result: {decision.upper()} | Risk: {risk:.3f}")
        
        if decision == 'granted' and risk < 0.4:
            print(f"✅ CORRECT (manager should access other depts)")
        else:
            print(f"⚠️ FALSE POSITIVE (manager wrongly denied)")
    else:
        print(f"❌ API ERROR: {resp.status_code}")

def early_morning_check(users, points, base_url):
    """Test legitimate early morning access (6-7 AM)."""
    active_users = [u for u in users if u.get('is_active')]
    if not active_users:
        print("❌ NO ACTIVE USERS")
        return
    
    user = active_users[0]
    point = [p for p in points if p.get('status') == 'active' and not p.get('is_restricted')][0] if any(p.get('status') == 'active' and not p.get('is_restricted') for p in points) else None
    
    if not point:
        print("❌ NO NORMAL ACCESS POINTS")
        return
    
    # Set 6 AM timestamp
    now = datetime.now()
    early = now.replace(hour=6, minute=30, second=0)
    
    print(f"✓ User: {user['badge_id']}")
    print(f"✓ Point: {point['name']}")
    print(f"✓ Time: {early.strftime('%H:%M')} (early morning - first shift)")
    
    resp = requests.post(f"{base_url}/api/access/request", json={
        'badge_id': user['badge_id'],
        'access_point_id': point['id'],
        'timestamp': early.isoformat(),
    }, timeout=5)
    
    if resp.status_code == 200:
        data = resp.json()
        decision = data.get('decision')
        risk = data.get('risk_score', 0)
        print(f"\n📊 Result: {decision.upper()} | Risk: {risk:.3f}")
        
        if decision == 'granted' and risk < 0.4:
            print(f"✅ CORRECT (early shift should be allowed)")
        else:
            print(f"⚠️ FALSE POSITIVE (early shift wrongly denied)")
    else:
        print(f"❌ API ERROR: {resp.status_code}")

def unusual_hours_check(users, points, base_url):
    """Test truly anomalous unusual hours (2 AM)."""
    user = [u for u in users if u.get('is_active')][0] if any(u.get('is_active') for u in users) else None
    point = [p for p in points if p.get('status') == 'active'][0] if any(p.get('status') == 'active' for p in points) else None
    
    if not user or not point:
        print("❌ NO USERS OR POINTS")
        return
    
    # Set 2 AM timestamp
    now = datetime.now()
    late_night = now.replace(hour=2, minute=0, second=0)
    
    print(f"✓ User: {user['badge_id']}")
    print(f"✓ Point: {point['name']}")
    print(f"✓ Time: {late_night.strftime('%H:%M')} (deep night - off-hours)")
    
    resp = requests.post(f"{base_url}/api/access/request", json={
        'badge_id': user['badge_id'],
        'access_point_id': point['id'],
        'timestamp': late_night.isoformat(),
    }, timeout=5)
    
    if resp.status_code == 200:
        data = resp.json()
        decision = data.get('decision')
        risk = data.get('risk_score', 0)
        print(f"\n📊 Result: {decision.upper()} | Risk: {risk:.3f}")
        
        if decision == 'denied' and risk > 0.7:
            print(f"✅ CORRECT (off-hours should be flagged as anomalous)")
        elif decision == 'delayed':
            print(f"⚠️ PARTIAL (allowed with delay - acceptable)")
        else:
            print(f"⚠️ FALSE NEGATIVE (off-hours wrongly allowed)")
    else:
        print(f"❌ API ERROR: {resp.status_code}")

def badge_cloning_check(users, points, base_url):
    """Test rapid multi-location access (badge cloning)."""
    user = [u for u in users if u.get('is_active')][0] if any(u.get('is_active') for u in users) else None
    active_points = [p for p in points if p.get('status') == 'active']
    
    if not user or len(active_points) < 2:
        print("❌ NOT ENOUGH DATA (need user + 2 points)")
        return
    
    point1 = active_points[0]
    point2 = active_points[1]
    
    print(f"✓ User: {user['badge_id']}")
    print(f"✓ Point 1: {point1['name']}")
    print(f"✓ Point 2: {point2['name']}")
    print(f"✓ Time delta: 30 seconds apart (physically impossible)")
    
    # First access
    now = datetime.now()
    resp1 = requests.post(f"{base_url}/api/access/request", json={
        'badge_id': user['badge_id'],
        'access_point_id': point1['id'],
        'timestamp': now.isoformat(),
    }, timeout=5)
    
    # Second access 30 seconds later
    later = now + timedelta(seconds=30)
    resp2 = requests.post(f"{base_url}/api/access/request", json={
        'badge_id': user['badge_id'],
        'access_point_id': point2['id'],
        'timestamp': later.isoformat(),
    }, timeout=5)
    
    print(f"\n📊 Results:")
    if resp1.status_code == 200:
        data1 = resp1.json()
        print(f"   [1] {data1.get('decision').upper()} | Risk: {data1.get('risk_score', 0):.3f}")
    if resp2.status_code == 200:
        data2 = resp2.json()
        print(f"   [2] {data2.get('decision').upper()} | Risk: {data2.get('risk_score', 0):.3f}")
        
        if data2.get('decision') == 'denied' or data2.get('risk_score', 0) > 0.7:
            print(f"✅ CORRECT (rapid movement flagged)")
        else:
            print(f"⚠️ FALSE NEGATIVE (cloning not detected)")

def restricted_access_check(users, points, base_url):
    """Test low-level user accessing restricted area."""
    low_clearance = [u for u in users if u.get('is_active') and (u.get('clearance_level', 1) <= 2)]
    restricted_points = [p for p in points if p.get('status') == 'active' and (p.get('is_restricted') or p.get('required_clearance', 1) >= 3)]
    
    if not low_clearance or not restricted_points:
        print(f"❌ MISSING: low-clearance={len(low_clearance)}, restricted_points={len(restricted_points)}")
        return
    
    user = low_clearance[0]
    point = restricted_points[0]
    
    print(f"✓ User: {user['badge_id']} (LOW clearance {user.get('clearance_level', 1)})")
    print(f"✓ Point: {point['name']} (RESTRICTED, requires {point.get('required_clearance', 1)})")
    
    resp = requests.post(f"{base_url}/api/access/request", json={
        'badge_id': user['badge_id'],
        'access_point_id': point['id'],
    }, timeout=5)
    
    if resp.status_code == 200:
        data = resp.json()
        decision = data.get('decision')
        risk = data.get('risk_score', 0)
        print(f"\n📊 Result: {decision.upper()} | Risk: {risk:.3f}")
        
        if decision == 'denied' and risk > 0.7:
            print(f"✅ CORRECT (unauthorized access denied)")
        else:
            print(f"⚠️ FALSE NEGATIVE (unauthorized access allowed!)")
    else:
        print(f"❌ API ERROR: {resp.status_code}")

def sequential_restricted_check(users, points, base_url):
    """Test low-level user accessing multiple restricted areas."""
    low_clearance = [u for u in users if u.get('is_active') and (u.get('clearance_level', 1) <= 2)]
    restricted_points = [p for p in points if p.get('status') == 'active' and (p.get('is_restricted') or p.get('required_clearance', 1) >= 3)]
    
    if not low_clearance or len(restricted_points) < 2:
        print(f"❌ MISSING: low-clearance={len(low_clearance)}, restricted_points={len(restricted_points)}")
        return
    
    user = low_clearance[0]
    
    print(f"✓ User: {user['badge_id']} (LOW clearance {user.get('clearance_level', 1)})")
    print(f"✓ Pattern: Attempting 3 restricted areas in 15 minutes")
    
    results = []
    base_time = datetime.now()
    for i, point in enumerate(restricted_points[:3]):
        timestamp = (base_time + timedelta(minutes=i*5)).isoformat()
        resp = requests.post(f"{base_url}/api/access/request", json={
            'badge_id': user['badge_id'],
            'access_point_id': point['id'],
            'timestamp': timestamp,
        }, timeout=5)
        
        if resp.status_code == 200:
            data = resp.json()
            results.append({
                'point': point['name'],
                'decision': data.get('decision'),
                'risk': data.get('risk_score', 0)
            })
    
    print(f"\n📊 Results ({len(results)} attempts):")
    for r in results:
        print(f"   {r['point']:30s} | {r['decision'].upper():8s} | Risk: {r['risk']:.3f}")
    
    all_denied = all(r['decision'] == 'denied' for r in results)
    if all_denied:
        print(f"✅ CORRECT (lateral movement blocked)")
    else:
        print(f"⚠️ FALSE NEGATIVES (some allowed when should be blocked)")

def high_frequency_check(users, points, base_url):
    """Test high-frequency rapid requests."""
    user = [u for u in users if u.get('is_active')][0] if any(u.get('is_active') for u in users) else None
    point = [p for p in points if p.get('status') == 'active'][0] if any(p.get('status') == 'active' for p in points) else None
    
    if not user or not point:
        print("❌ NO USERS OR POINTS")
        return
    
    print(f"✓ User: {user['badge_id']}")
    print(f"✓ Point: {point['name']}")
    print(f"✓ Pattern: 5 requests in 20 seconds (spam/brute-force)")
    
    results = []
    base_time = datetime.now()
    for i in range(5):
        timestamp = (base_time + timedelta(seconds=i*4)).isoformat()
        resp = requests.post(f"{base_url}/api/access/request", json={
            'badge_id': user['badge_id'],
            'access_point_id': point['id'],
            'timestamp': timestamp,
        }, timeout=5)
        
        if resp.status_code == 200:
            data = resp.json()
            results.append({
                'idx': i,
                'decision': data.get('decision'),
                'risk': data.get('risk_score', 0)
            })
    
    print(f"\n📊 Results ({len(results)} requests):")
    for r in results:
        print(f"   [{r['idx']}] {r['decision'].upper():8s} | Risk: {r['risk']:.3f}")
    
    # Expect later ones to be flagged more
    late_denied = any(r['decision'] == 'denied' for r in results[2:])
    if late_denied:
        print(f"✅ PARTIAL (high-frequency eventually flagged)")
    else:
        print(f"⚠️ FALSE NEGATIVE (spam not detected)")

if __name__ == "__main__":
    diagnose_scenarios()
