import requests
import json

token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzMiIsImVtYWlsIjoiYWRtaW5AcmFwdG9yeC5sb2NhbCIsInJvbGUiOiJhZG1pbiIsInR5cGUiOiJhY2Nlc3MiLCJleHAiOjE3NzY3MDAxNjIsImlhdCI6MTc3NjY5OTI2MiwibWZhX3ZlcmlmaWVkIjp0cnVlfQ.FaSP2m_XdDeblXmNyLBwJqaziUqn50nEsZb9H6YxiII'
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
