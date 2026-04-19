#!/usr/bin/env python
import sys
sys.path.insert(0, '.')

from app.database import engine
from sqlalchemy import text

print("Setting up auto-retrain columns...")
print("=" * 60)

with engine.connect() as conn:
    columns_to_add = [
        ("last_training_date", "TIMESTAMP WITH TIME ZONE"),
        ("next_retrain_date", "TIMESTAMP WITH TIME ZONE"),
        ("auto_retrain_enabled", "BOOLEAN NOT NULL DEFAULT true")
    ]
    
    for col_name, col_type in columns_to_add:
        try:
            conn.execute(text(f"ALTER TABLE organizations ADD COLUMN {col_name} {col_type}"))
            print(f"✅ Added column: {col_name}")
        except Exception as e:
            error_msg = str(e).lower()
            if "already exists" in error_msg or "duplicate" in error_msg:
                print(f"ℹ️  Column already exists: {col_name}")
            else:
                print(f"❌ Error adding {col_name}: {e}")
    
    conn.commit()

print("\n" + "=" * 60)
print("✅ Auto-retrain database setup complete!")
print("\nNew columns added to organizations table:")
print("  • last_training_date - Tracks last training completion")
print("  • next_retrain_date - Calculates next retrain (40 days)")
print("  • auto_retrain_enabled - Toggle auto-retrain feature")
