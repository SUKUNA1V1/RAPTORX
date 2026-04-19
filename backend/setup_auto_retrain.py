#!/usr/bin/env python
import sys
sys.path.insert(0, '.')

# Import all models first to ensure they're registered
from app.models import (
    Organization, User, Building, AccessPolicy, OnboardingDraft, OrgDataSetting,
    AccessLog, AuditLog, MFASecret, RefreshToken, LoginAttempt, AccessPoint,
    AccessRule, DeviceCertificate, AnomalyAlert
)

from app.database import Base, engine
from sqlalchemy import inspect

# Create all tables
print("Creating/updating all tables...")
Base.metadata.create_all(bind=engine)

# Verify organizations table
inspector = inspect(engine)
columns = inspector.get_columns('organizations')
col_names = [c['name'] for c in columns]

print("\n✅ Organizations table columns:")
for col in sorted(col_names):
    marker = "✨" if col in ['last_training_date', 'next_retrain_date', 'auto_retrain_enabled'] else "  "
    print(f"  {marker} {col}")

# Check if all required columns exist
required = ['last_training_date', 'next_retrain_date', 'auto_retrain_enabled']
missing = [c for c in required if c not in col_names]

if not missing:
    print("\n✅ All auto-retrain columns created successfully!")
    print("\nAuto-retrain feature is ready to use:")
    print("  • Models will track last training date")
    print("  • Next retrain date will be calculated (40 days)")
    print("  • Auto-retrain can be toggled on/off")
    print("  • Manual retrain can be triggered anytime")
else:
    print(f"\n❌ Missing columns: {missing}")
    sys.exit(1)
