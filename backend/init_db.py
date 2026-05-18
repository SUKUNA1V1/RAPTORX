#!/usr/bin/env python3
"""Verify database connection (migrations handle schema creation)."""

import os
import sys
from sqlalchemy import create_engine, text

def init_db():
    """Verify database connection is working."""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL environment variable not set")
        sys.exit(1)

    print("Verifying database connection...")
    
    try:
        engine = create_engine(database_url)
        
        # Test connection
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            result.close()
        
        print("✅ Database connection verified")
        engine.dispose()
        return True
    except Exception as e:
        print(f"❌ Error connecting to database: {e}")
        return False

if __name__ == "__main__":
    success = init_db()
    sys.exit(0 if success else 1)
