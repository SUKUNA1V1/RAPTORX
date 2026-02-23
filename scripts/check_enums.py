"""Check what ENUM values are valid"""
import os
from pathlib import Path
from sqlalchemy import create_engine, text

# Load env
backend_env_path = Path(__file__).parent / 'backend' / '.env'
if backend_env_path.exists():
    with open(backend_env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key.strip()] = value.strip()

engine = create_engine(os.environ.get('DATABASE_URL'))

# Check enum types
with engine.connect() as conn:
    print("Valid access_result enum values:")
    result = conn.execute(text(
        "SELECT enumlabel FROM pg_enum WHERE enumtypid = 'access_result'::regtype ORDER BY enumsortorder"
    ))
    for row in result:
        print(f"  - {row[0]}")
    
    print("\nValid user_role enum values:")
    result = conn.execute(text(
        "SELECT enumlabel FROM pg_enum WHERE enumtypid = 'user_role'::regtype ORDER BY enumsortorder"
    ))
    for row in result:
        print(f"  - {row[0]}")
