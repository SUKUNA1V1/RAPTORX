#!/usr/bin/env python3
"""Debug script to capture exact 500 error from /access/request endpoint."""

import requests
import json
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

def test_access_request():
    """Test access request endpoint."""
    session = requests.Session()
    csrf_token = get_csrf_token()
    if csrf_token:
        session.headers.update({"X-CSRF-Token": csrf_token})
    
    # Try with a simple, known user from our earlier tests
    payload = {
        "badge_id": "BADGE_000000",
        "access_point_id": 1,
        "timestamp": "2026-05-16T00:00:00Z"
    }
    
    print("Testing /access/request endpoint...")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    print()
    
    try:
        response = session.post(
            f"{BASE_URL}/api/access/request",
            json=payload,
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        print()
        
        try:
            resp_json = response.json()
            print(f"Response Body:\n{json.dumps(resp_json, indent=2)}")
        except:
            print(f"Response Body (raw):\n{response.text}")
    
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    test_access_request()
