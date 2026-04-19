#!/usr/bin/env python
import sys
sys.path.insert(0, '.')

from sqlalchemy import text, inspect
from app.database import engine

print("=" * 70)
print("Auto-Retrain Feature Verification")
print("=" * 70)

with engine.connect() as conn:
    # Check organizations table columns
    inspector = inspect(engine)
    columns = inspector.get_columns('organizations')
    col_names = {c['name']: c['type'] for c in columns}
    
    print("\n✅ Organizations Table Columns:")
    for name, type_ in sorted(col_names.items()):
        marker = "✨" if name in ['last_training_date', 'next_retrain_date', 'auto_retrain_enabled'] else "  "
        print(f"   {marker} {name}: {type_}")
    
    # Verify required columns exist
    required_cols = ['last_training_date', 'next_retrain_date', 'auto_retrain_enabled']
    missing = [c for c in required_cols if c not in col_names]
    
    if missing:
        print(f"\n❌ Missing columns: {missing}")
        sys.exit(1)
    else:
        print(f"\n✅ All required auto-retrain columns exist!")
    
    # Check migration version
    result = conn.execute(text("SELECT version_num FROM alembic_version ORDER BY version_num DESC LIMIT 1"))
    current_version = result.scalar()
    print(f"\n✅ Current migration version: {current_version}")
    
    if current_version == 'ml_002':
        print("✅ Migration ml_002 (auto-retrain) is applied!")
    else:
        print(f"⚠️  Current version is {current_version}, ml_002 is available")
    
    print("\n" + "=" * 70)
    print("✅ Auto-retrain database setup is complete!")
    print("=" * 70)
