import requests
import json

token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5OTkiLCJlbWFpbCI6InVzZXIwOTk5QHVuaXZlcnNpdHkuZWR1Iiwicm9sZSI6ImFkbWluIiwidHlwZSI6ImFjY2VzcyIsImV4cCI6MTc3ODk0NDM0OCwiaWF0IjoxNzc4OTQzNDQ4LCJtZmFfdmVyaWZpZWQiOnRydWV9.FKXodZqCwyr_u_oEzeSTC-qYKN9bgsX8kayyanrKTM0'
headers = {'Authorization': f'Bearer {token}'}

# Test access logs
try:
    print('\n=== Testing Access Logs ===')
    response = requests.get('http://localhost:8000/api/access/logs?page=1&page_size=10', headers=headers)
    data = response.json()
    print(f'Status: {response.status_code}')
    if 'pagination' in data:
        print(f'Total: {data["pagination"]["total"]}')
    print(f'Items: {len(data.get("items", []))}')
    if response.status_code != 200:
        print(f'Error: {data}')
except Exception as e:
    print(f'Error: {e}')

# Test users
try:
    print('\n=== Testing Users ===')
    response = requests.get('http://localhost:8000/api/users?page=1&page_size=10', headers=headers)
    data = response.json()
    print(f'Status: {response.status_code}')
    if 'pagination' in data:
        print(f'Total: {data["pagination"]["total"]}')
    print(f'Items: {len(data.get("items", []))}')
    if response.status_code != 200:
        print(f'Error: {data}')
except Exception as e:
    print(f'Error: {e}')

# Test access points
try:
    print('\n=== Testing Access Points ===')
    response = requests.get('http://localhost:8000/api/access-points?page=1&page_size=10', headers=headers)
    data = response.json()
    print(f'Status: {response.status_code}')
    if 'pagination' in data:
        print(f'Total: {data["pagination"]["total"]}')
    print(f'Items: {len(data.get("items", []))}')
    if response.status_code != 200:
        print(f'Error: {data}')
except Exception as e:
    print(f'Error: {e}')

# Test alerts
try:
    print('\n=== Testing Alerts ===')
    response = requests.get('http://localhost:8000/api/alerts?page=1&page_size=10', headers=headers)
    data = response.json()
    print(f'Status: {response.status_code}')
    if 'pagination' in data:
        print(f'Total: {data["pagination"]["total"]}')
    print(f'Items: {len(data.get("items", []))}')
    if response.status_code != 200:
        print(f'Error: {data}')
except Exception as e:
    print(f'Error: {e}')
