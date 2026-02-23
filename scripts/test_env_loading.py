"""Test that environment loading works"""
import sys
from pathlib import Path
import os

# Load env from backend/.env
backend_env_path = Path(__file__).parent / 'backend' / '.env'
if backend_env_path.exists():
    with open(backend_env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key.strip()] = value.strip()

print(f'DATABASE_URL: {os.environ.get("DATABASE_URL", "NOT FOUND")}')
print(f'SECRET_KEY: {os.environ.get("SECRET_KEY", "NOT FOUND")}')

# Try to import config
sys.path.insert(0, str(Path(__file__).parent / 'backend'))
try:
    from app.config import settings
    print(f'✓ Config loaded successfully')
    print(f'✓ Database: {settings.DATABASE_URL}')
except Exception as e:
    print(f'✗ Error importing config: {type(e).__name__}: {e}')
    import traceback
    traceback.print_exc()
