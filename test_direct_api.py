#!/usr/bin/env python3
"""Test API endpoints directly"""
import requests
import sys

# First, get a valid token
print("Getting authentication token...")
login_response = requests.post(
    'http://localhost:8000/api/auth/login',
    json={
        'email': 'admin@raptorx.local',
        'pin': 'admin123'
    }
)

if login_response.status_code != 200:
    print(f"Login failed: {login_response.status_code}")
    print(login_response.text)
    sys.exit(1)

token_data = login_response.json()
token = token_data['access_token']
headers = {'Authorization': f'Bearer {token}'}
print(f"✓ Token obtained: {token[:50]}...")

# Test each endpoint
endpoints = [
    ('/api/access/logs', {'page': 1, 'page_size': 10}),
    ('/api/alerts', {'page': 1, 'page_size': 10}),
    ('/api/users', {'page': 1, 'page_size': 10}),
    ('/api/access-points', {'page': 1, 'page_size': 10}),
]

for endpoint, params in endpoints:
    print(f"\n{'='*60}")
    print(f"Testing: {endpoint}")
    print(f"{'='*60}")
    
    try:
        response = requests.get(
            f'http://localhost:8000{endpoint}',
            params=params,
            headers=headers,
            timeout=10
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            items_count = len(data.get('data', []))
            total = data.get('pagination', {}).get('total', 0)
            print(f"✓ SUCCESS: Got {items_count} items, total: {total}")
        else:
            print(f"✗ FAILED: {response.status_code}")
            print(f"Response: {response.text[:200]}")
    except Exception as e:
        print(f"✗ ERROR: {e}")

print("\n" + "="*60)
print("API Testing Complete")
print("="*60)
