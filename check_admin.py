#!/usr/bin/env python3
"""Check admin users in database."""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / 'backend'))

from app.database import SessionLocal
from app.models import User

db = SessionLocal()

# Get all users with role admin
admins = db.query(User).filter(User.role == 'admin').all()

print(f"Found {len(admins)} admin users:")
for admin in admins:
    print(f"  - ID: {admin.id}, Email: {admin.email}, Badge: {admin.badge_id}, Active: {admin.is_active}")

# Get all users to see what's there
all_users = db.query(User).limit(10).all()
print(f"\nFirst 10 users:")
for user in all_users:
    print(f"  - ID: {user.id}, Email: {user.email}, Role: {user.role}, Badge: {user.badge_id}")

db.close()
