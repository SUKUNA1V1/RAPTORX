"""
Load generated CSV data into PostgreSQL database.
Handles users, access points, and access logs.
"""
import sys
import os
from pathlib import Path
from datetime import datetime, timedelta, timezone
import pandas as pd

# Load env
backend_env_path = Path(__file__).parent.parent / 'backend' / '.env'
if backend_env_path.exists():
    with open(backend_env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key.strip()] = value.strip()

sys.path.insert(0, str(Path(__file__).parent.parent / 'backend'))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.models.user import User
from app.models.access_point import AccessPoint
from app.models.access_log import AccessLog

DATABASE_URL = settings.DATABASE_URL
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine)

# University structure from prompt
DEPARTMENTS = {
    "computer_science": ["cs_lab", "cs_office", "cs_servers_room", "cs_library"],
    "economy": ["economy_library", "economy_office"],
    "business": ["business_office", "business_library"],
    "research_labs": ["research_lab", "research_office", "research_storage"],
    "social_sciences": ["social_sciences_library", "social_sciences_office"],
    "sports": ["sports_GYM", "sports_office", "sports_storage", "sports_library"],
}

SHARED_ZONES = ["main_entrance", "admin_building", "security_office", "restaurant", "parking_lot_student", "parking_lot_staff"]

ROLES = {
    "students": ("Student", 1),
    "teachers": ("Teacher", 2),
    "researchers": ("Researcher", 3),
    "admin_low": ("Administrator", 2),
    "admin_high": ("Senior Admin", 3),
    "security": ("Security Guard", 3),
}


def load_data():
    """Load CSV data into database."""
    session = SessionLocal()
    
    try:
        # Check if data already exists
        existing_logs = session.query(AccessLog).count()
        if existing_logs > 0:
            print(f"❌ Database already has {existing_logs:,} access logs!")
            print("   Run: python scripts/clean_database.py")
            return False
        
        csv_path = "data/raw/access_data.csv"
        if not Path(csv_path).exists():
            print(f"❌ CSV file not found: {csv_path}")
            return False
        
        print(f"Loading from: {csv_path}\n")
        print("="*60)
        print("STEP 1: Creating Users & Access Points")
        print("="*60 + "\n")
        
        # Create 5000 users (based on generation script)
        users_created = 0
        for user_id in range(5000):
            role_idx = user_id % 6
            role_name = list(ROLES.keys())[role_idx]
            role_label, clearance = ROLES[role_name]
            
            # Assign departments
            if role_name == "researchers":
                dept = "research_labs"
            else:
                dept_list = list(DEPARTMENTS.keys())
                dept = dept_list[user_id % len(dept_list)]
            
            user = User(
                id=user_id,
                first_name=f"User",
                last_name=f"{user_id:04d}",
                email=f"user{user_id:04d}@university.edu",
                badge_id=f"BADGE_{user_id:06d}",
                role=role_label,
                department=dept,
                clearance_level=clearance,
                is_active=True,
            )
            session.add(user)
            users_created += 1
            
            if users_created % 100 == 0:
                session.flush()
                print(f"  ✓ Created {users_created} users...")
        
        session.commit()
        print(f"\n✅ Created {users_created} users\n")
        
        # Create access points for all zones
        print("Creating access points for all zones...")
        zone_id = 1
        
        # Map zones to point types
        def get_point_type(zone):
            if "server" in zone or zone == "security_office":
                return "server_room"
            elif "parking" in zone:
                return "parking"
            elif "GYM" in zone or "sports" in zone:
                return "turnstile"
            else:
                return "door"
        
        for dept, zones in DEPARTMENTS.items():
            for zone in zones:
                ap = AccessPoint(
                    id=zone_id,
                    name=zone.replace("_", " ").title(),
                    type=get_point_type(zone),
                    building=dept.replace("_", " ").title(),
                    zone=zone,
                    status="active",
                    required_clearance=1,
                    is_restricted=zone in ["cs_servers_room", "research_lab", "research_office", "research_storage", "security_office"],
                    installed_at=datetime.now(timezone.utc),
                )
                session.add(ap)
                zone_id += 1
        
        for zone in SHARED_ZONES:
            ap = AccessPoint(
                id=zone_id,
                name=zone.replace("_", " ").title(),
                type=get_point_type(zone),
                building="Shared",
                zone=zone,
                status="active",
                required_clearance=1,
                is_restricted=zone in ["security_office"],
                installed_at=datetime.now(timezone.utc),
            )
            session.add(ap)
            zone_id += 1
        
        session.commit()
        print(f"✅ Created {zone_id - 1} access points\n")
        
        print("="*60)
        print("STEP 2: Loading Access Logs from CSV")
        print("="*60 + "\n")
        
        # Load CSV
        df = pd.read_csv(csv_path)
        print(f"CSV records: {len(df):,}")
        print(f"Columns: {', '.join(df.columns.tolist())}\n")
        
        # Create zone to access_point mapping
        zone_mapping = {}
        all_zones = []
        for zones in DEPARTMENTS.values():
            all_zones.extend(zones)
        all_zones.extend(SHARED_ZONES)
        
        aps = session.query(AccessPoint).all()
        for ap in aps:
            zone_mapping[ap.zone] = ap.id
        
        # Batch insert access logs
        batch_size = 5000
        total_inserted = 0
        base_date = datetime.now() - timedelta(days=30)
        
        for idx, row in df.iterrows():
            # Simulate timestamp spread over last 30 days
            hours_offset = int(row.get('time_of_week', 0))
            timestamp = base_date + timedelta(hours=hours_offset % (30 * 24))
            
            # Get zone for this record (use first available if not found)
            access_point_id = list(zone_mapping.values())[int(row.get('is_restricted_area', 0)) % len(zone_mapping)]
            
            # Determine decision based on label
            is_anomaly = row.get('label', 0)
            decision = 'denied' if is_anomaly else 'granted'
            risk_score = float(row.get('access_frequency_24h', 0) / 10.0) if is_anomaly else 0.1
            
            log = AccessLog(
                user_id=int(row.get('user_id', int(row.get('hour', 0)) % 5000)),
                access_point_id=access_point_id,
                timestamp=timestamp,
                decision=decision,
                risk_score=min(1.0, max(0.0, risk_score)),
                method='badge',
                hour=int(row.get('hour', 0)),
                day_of_week=int(row.get('day_of_week', 0)),
                is_weekend=bool(row.get('is_weekend', 0)),
                access_frequency_24h=int(row.get('access_frequency_24h', 0)),
                time_since_last_access_min=int(row.get('time_since_last_access_min', 0)),
                location_match=bool(row.get('location_match', 0)),
                role_level=int(row.get('role_level', 1)),
                is_restricted_area=bool(row.get('is_restricted_area', 0)),
                is_first_access_today=bool(row.get('is_first_access_today', 0)),
                sequential_zone_violation=bool(row.get('sequential_zone_violation', 0)),
                access_attempt_count=int(row.get('access_attempt_count', 0)),
                time_of_week=int(row.get('time_of_week', 0)),
                hour_deviation_from_norm=float(row.get('hour_deviation_from_norm', 0.0)),
                badge_id_used=f"BADGE_{int(row.get('user_id', int(row.get('hour', 0)) % 5000)):06d}",
            )
            session.add(log)
            
            if (idx + 1) % batch_size == 0:
                session.commit()
                total_inserted = idx + 1
                print(f"  ✓ Inserted {total_inserted:,} access logs...")
        
        # Final commit
        session.commit()
        total_inserted = len(df)
        print(f"\n✅ Inserted {total_inserted:,} access logs\n")
        
        # Verify
        print("="*60)
        print("VERIFICATION")
        print("="*60 + "\n")
        
        user_count = session.query(User).count()
        ap_count = session.query(AccessPoint).count()
        log_count = session.query(AccessLog).count()
        
        print(f"Users:          {user_count:,}")
        print(f"Access Points:  {ap_count}")
        print(f"Access Logs:    {log_count:,}")
        
        # Anomaly stats
        anomaly_count = session.query(AccessLog).filter(AccessLog.decision != 'granted').count()
        print(f"\nAnomaly Logs:   {anomaly_count:,} ({100*anomaly_count/log_count:.2f}%)")
        
        print("\n" + "="*60)
        print("✅ Data loaded successfully!")
        print("="*60)
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        session.rollback()
        return False
    finally:
        session.close()


if __name__ == "__main__":
    success = load_data()
    sys.exit(0 if success else 1)
