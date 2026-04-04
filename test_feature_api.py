#!/usr/bin/env python3
"""Test the feature importance endpoint."""

import requests
import json

try:
    response = requests.get('http://localhost:8000/explainations/feature-importance', timeout=5)
    print(f'HTTP Status: {response.status_code}')
    data = response.json()
    
    if isinstance(data, list):
        print(f'\n✓ SUCCESS! Returns array with {len(data)} features\n')
        for item in data[:5]:
            feat = item.get('feature', 'N/A')
            imp = item.get('importance', 0)
            rank = item.get('rank', 'N/A')
            print(f'  {rank}. {feat}: {imp:.3f}')
        print('\n✓ Explainability page should now show data!')
    else:
        print(f'\n✗ ERROR: Returns object instead of array')
        print(json.dumps(data, indent=2)[:300])
        
except Exception as e:
    print(f'\n✗ ERROR: {e}')
    print('Make sure backend is running at http://localhost:8000')
