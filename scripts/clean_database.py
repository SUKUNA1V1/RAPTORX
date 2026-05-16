"""
Clear database for fresh start - removes all access logs, users, and access points
"""
import sys
import os
from pathlib import Path

# Load env
backend_env_path = Path(__file__).parent.parent / 'backend' / '.env'
if backend_env_path.exists():
    with open(backend_env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key.strip()] = value.strip()

from sqlalchemy import create_engine, text

DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    print("❌ DATABASE_URL not found in .env")
    sys.exit(1)

print(f"Database: {DATABASE_URL}\n")

engine = create_engine(DATABASE_URL)

try:
    with engine.connect() as conn:
        # List current record counts
        print("Current record counts:")
        tables = ['access_logs', 'users', 'access_points', 'organizations']
        for table in tables:
            try:
                result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = result.scalar()
                print(f"  {table}: {count:,}")
            except:
                pass
        
        print("\n" + "="*60)
        print("CLEARING DATABASE...")
        print("="*60 + "\n")
        
        # Option 1: Just DELETE (keeps schema)
        print("Option 1: DELETE records (keep schema)")
        conn.execute(text("DELETE FROM access_logs"))
        conn.execute(text("DELETE FROM access_points"))
        conn.execute(text("DELETE FROM users"))
        # Don't delete organizations - might have configs
        conn.commit()
        print("  ✓ Deleted all access_logs")
        print("  ✓ Deleted all access_points")
        print("  ✓ Deleted all users")
        print("  ✓ Kept organizations table\n")
        
        # Verify
        print("Verification - new counts:")
        for table in tables:
            try:
                result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = result.scalar()
                print(f"  {table}: {count:,}")
            except:
                pass
        
        print("\n" + "="*60)
        print("✅ Database cleared successfully!")
        print("="*60)
        print("\nReady to generate fresh university data!")

except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
finally:
    engine.dispose()
