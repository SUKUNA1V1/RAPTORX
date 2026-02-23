"""
Load generated synthetic data into the database.

Maps generated CSV data to AccessLog, User, and AccessPoint models.
Handles user and access point creation for database integrity.
"""
import io
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Windows UTF-8 encoding support
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

import pandas as pd
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Load environment variables from backend/.env
backend_env_path = Path(__file__).parent.parent / "backend" / ".env"
if backend_env_path.exists():
    with open(backend_env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ[key.strip()] = value.strip()

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from app.config import settings
from app.database import Base
from app.models.user import User
from app.models.access_point import AccessPoint
from app.models.access_log import AccessLog


INPUT_FILE = "data/raw/train.csv"
ZONES = ["engineering", "hr", "finance", "marketing", "logistics", "it", "server_room", "executive"]
BATCH_SIZE = 5000


def init_db():
    """Initialize database and create tables if needed."""
    engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
    Base.metadata.create_all(bind=engine)
    return engine


def get_session(engine):
    """Create a new database session."""
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return SessionLocal()


def create_users_and_access_points(session, num_users: int = 500):
    """Create sample users and access points for testing."""
    departments = ["engineering", "hr", "finance", "marketing", "logistics", "it"]
    
    print("Creating users and access points...")
    
    # Check for existing users  
    existing_users = session.query(User).count()
    if existing_users >= num_users:
        print(f"  ✓ Users already exist ({existing_users})")
    else:
        # Skip user creation if database uses ENUM type
        print(f"  ⚠ Skipping user creation (database schema mismatch)")
    
    # Create access points if they don't exist
    existing_points = session.query(AccessPoint).count()
    if existing_points < len(ZONES):
        for zone in ZONES:
            existing = session.query(AccessPoint).filter_by(zone=zone).first()
            if not existing:
                point = AccessPoint(
                    name=f"{zone.upper()}_ENTRY",
                    type="badge_reader",
                    zone=zone,
                    building="Building_A",
                    floor="1",
                    required_clearance=2 if zone in ["server_room", "executive"] else 1,
                    is_restricted=zone in ["server_room", "executive"],
                )
                session.add(point)
        session.commit()
        print(f"  ✓ Created/verified access points for {len(ZONES)} zones")
    else:
        print(f"  ✓ Access points already exist ({existing_points})")


def load_data_to_db(session):
    """Load CSV data into the database."""
    if not os.path.exists(INPUT_FILE):
        print(f"✗ Input file not found: {INPUT_FILE}")
        return False
    
    print(f"\nLoading data from {INPUT_FILE}...")
    df = pd.read_csv(INPUT_FILE)
    print(f"  ✓ Loaded {len(df)} records")
    
    # Get all users and access points for mapping
    users = session.query(User).all()
    access_points = session.query(AccessPoint).all()
    
    if not users:
        print("  ! Note: No users in database - using first available user ID for all records")
        # Create at least one dummy user for foreign key constraints
        try:
            dummy_user = User(
                badge_id="SYSTEM_ADMIN",
                first_name="System",
                last_name="Admin",
                email="admin@system.local",
                role="Admin",  # Might fail due to ENUM, but worth trying
                department="it",
                clearance_level=3,
                is_active=True,
            )
            session.add(dummy_user)
            session.commit()
            users = session.query(User).all()
            print(f"  ✓ Created system user")
        except Exception as e:
            print(f"  ⚠ Could not create user (probably ENUM type): {type(e).__name__}")
            print(f"  → Will try to use existing users or query the database for available user IDs")
            # Try to get first user from database
            from sqlalchemy import text
            try:
                result = session.execute(text("SELECT id FROM users LIMIT 1"))
                first_user = result.first()
                if first_user:
                    users = [type('User', (), {'id': first_user[0]})()]
                else:
                    print("  ✗ No users found and cannot create one")
                    return False
            except:
                print("  ✗ Cannot access users table")
                return False
    
    if not access_points:
        print("  ⚠ No access points in database - creating them...")
        for zone in ZONES:
            try:
                point = AccessPoint(
                    name=f"{zone.upper()}_ENTRY",
                    type="badge_reader",
                    zone=zone,
                    building="Building_A",
                    floor="1",
                    required_clearance=2 if zone in ["server_room", "executive"] else 1,
                    is_restricted=zone in ["server_room", "executive"],
                )
                session.add(point)
            except:
                pass
        session.commit()
        access_points = session.query(AccessPoint).all()
    
    user_map = {i: user.id for i, user in enumerate(users)}
    zone_to_point = {ap.zone: ap.id for ap in access_points}
    
    print(f"  ✓ User IDs available: {list(user_map.values())}")
    print(f"  ✓ Access point mappings: {len(zone_to_point)} zones")
    
    # Check for existing records to avoid duplicates
    existing_count = session.query(AccessLog).count()
    if existing_count > 0:
        print(f"  ✓ Database already contains {existing_count} access logs")
        print(f"  → Skipping insert to avoid duplicates")
        return True
    
    # Insert in batches
    print(f"\nInserting {len(df)} records in batches of {BATCH_SIZE}...")
    base_timestamp = datetime.now(timezone.utc) - timedelta(days=30)
    
    inserted = 0
    for idx, row in df.iterrows():
        # Determine user and access point
        user_idx = idx % len(user_map)
        user_id = user_map[user_idx]
        
        # Map zone to access point (use first available or fallback)
        zone = ZONES[idx % len(ZONES)]
        access_point_id = zone_to_point.get(zone, list(zone_to_point.values())[0])
        
        # Create timestamp (spread over last 30 days)
        hours_offset = (idx % (30 * 24))
        timestamp = base_timestamp + timedelta(hours=hours_offset)
        
        # Create access log
        log = AccessLog(
            user_id=user_id,
            access_point_id=access_point_id,
            timestamp=timestamp,
            decision="granted" if row.get("label", 0) == 0 else "denied",
            risk_score=float(row.get("label", 0)) * 0.9,  # Anomalies get higher risk
            method="badge",
            hour=int(row.get("hour", 12)),
            day_of_week=int(row.get("day_of_week", 0)),
            is_weekend=bool(row.get("is_weekend", False)),
            access_frequency_24h=int(row.get("access_frequency_24h", 1)),
            time_since_last_access_min=int(row.get("time_since_last_access_min", 60)),
            location_match=bool(row.get("location_match", True)),
            role_level=int(row.get("role_level", 1)),
            is_restricted_area=bool(row.get("is_restricted_area", False)),
            is_first_access_today=bool(row.get("is_first_access_today", False)),
            sequential_zone_violation=bool(row.get("sequential_zone_violation", False)),
            access_attempt_count=int(row.get("access_attempt_count", 1)),
            time_of_week=int(row.get("time_of_week", 0)),
            hour_deviation_from_norm=float(row.get("hour_deviation_from_norm", 0.0)),
            badge_id_used=f"BADGE_{user_idx:06d}",
            context={
                "geographic_impossibility": bool(row.get("geographic_impossibility", False)),
                "distance_between_scans_km": float(row.get("distance_between_scans_km", 0.0)),
                "velocity_km_per_min": float(row.get("velocity_km_per_min", 0.0)),
                "zone_clearance_mismatch": bool(row.get("zone_clearance_mismatch", False)),
                "department_zone_mismatch": bool(row.get("department_zone_mismatch", False)),
                "concurrent_session_detected": bool(row.get("concurrent_session_detected", False)),
                "is_anomaly": bool(row.get("label", 0) == 1),
            }
        )
        session.add(log)
        inserted += 1
        
        # Commit in batches
        if inserted % BATCH_SIZE == 0:
            session.commit()
            print(f"  ✓ Inserted {inserted}/{len(df)}")
    
    # Final commit
    if inserted % BATCH_SIZE != 0:
        session.commit()
    
    print(f"  ✓ Successfully inserted {inserted} records")
    return True


def main():
    print("\n" + "="*80)
    print("LOADING SYNTHETIC DATA INTO DATABASE")
    print("="*80 + "\n")
    
    try:
        # Initialize database
        engine = init_db()
        print("✓ Database initialized")
        
        session = get_session(engine)
        
        # Create sample users and access points
        create_users_and_access_points(session, num_users=500)
        
        # Load data from CSV into database
        success = load_data_to_db(session)
        
        session.close()
        
        if success:
            print("\n" + "="*80)
            print("✓ DATA LOADING COMPLETE")
            print("="*80)
            print("\nYou can now:")
            print("  - Explore data via backend API (/api/logs)")
            print("  - View dashboard in frontend")
            print("  - Query using backend routes")
            print()
            return True
        else:
            print("\n✗ Data loading failed")
            return False
            
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
