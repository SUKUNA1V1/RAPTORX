#!/usr/bin/env python
import sys
sys.path.insert(0, '.')

from app.database import engine, Base
from sqlalchemy import text

print("=" * 60)
print("Database Status Check")
print("=" * 60)

# List existing tables
with engine.connect() as conn:
    result = conn.execute(text("SELECT tablename FROM pg_tables WHERE schemaname='public'"))
    tables = sorted([row[0] for row in result])
    print(f"\nExisting tables in database ({len(tables)}):")
    if tables:
        for t in tables:
            print(f"  ✓ {t}")
    else:
        print("  (none)")

# Try to create all tables from models
print(f"\nImporting models...")
try:
    from app import models  # This should import all model definitions
    print("✓ Models imported successfully")
except Exception as e:
    print(f"✗ Error importing models: {e}")
    sys.exit(1)

# Create tables
print(f"\nCreating tables from Base metadata...")
try:
    Base.metadata.create_all(bind=engine)
    print("✓ Tables created/updated")
except Exception as e:
    print(f"✗ Error creating tables: {e}")
    sys.exit(1)

# Verify
with engine.connect() as conn:
    result = conn.execute(text("SELECT tablename FROM pg_tables WHERE schemaname='public'"))
    tables = sorted([row[0] for row in result])
    print(f"\nTables after creation ({len(tables)}):")
    for t in tables:
        print(f"  ✓ {t}")
    
    # Check organizations table specifically
    if 'organizations' in tables:
        result = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='organizations' ORDER BY ordinal_position"))
        cols = result.fetchall()
        print(f"\nOrganizations table columns:")
        for col_name, col_type in cols:
            marker = "✓" if col_name != 'decision_mode' else "✅"
            print(f"  {marker} {col_name}: {col_type}")
        
        col_names = [c[0] for c in cols]
        if 'decision_mode' in col_names:
            print("\n✅ SUCCESS: decision_mode column exists!")
        else:
            print("\n⚠️  WARNING: decision_mode column NOT found")
    else:
        print("\n❌ ERROR: organizations table NOT found!")
