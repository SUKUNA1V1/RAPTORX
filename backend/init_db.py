#!/usr/bin/env python3
"""Initialize database schema from SQLAlchemy models before running migrations."""

import os
import sys
from sqlalchemy import create_engine
from app.core.database import Base
from app.models import (  # Import all models to register them
    User,
    Role,
    Permission,
    RolePermission,
    AccessPoint,
    Zone,
    Floor,
    Building,
    AccessRule,
    AccessPolicy,
    AccessLog,
    AnomalyAlert,
    LoginAttempt,
    AuditLog,
    DeviceCertificate,
)

def init_db():
    """Create all tables from models."""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL environment variable not set")
        sys.exit(1)

    print(f"Initializing database from models...")
    print(f"Database URL: {database_url.split('@')[-1]}")
    
    try:
        engine = create_engine(database_url)
        
        # Create all tables
        Base.metadata.create_all(engine)
        print("✅ Database tables created successfully")
        
        engine.dispose()
        return True
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        return False

if __name__ == "__main__":
    success = init_db()
    sys.exit(0 if success else 1)
