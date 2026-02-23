"""
Load generated synthetic data into the database using raw SQL.

Handles PostgreSQL ENUM types for role and decision columns.
"""
import io
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
import json

# Windows UTF-8 encoding support
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

import pandas as pd
from sqlalchemy import create_engine, text

INPUT_FILE = "data/raw/train.csv"
ZONES = ["engineering", "hr", "finance", "marketing", "logistics", "it", "server_room", "executive"]
BATCH_SIZE = 5000


def load_env():
    """Load environment variables from backend/.env"""
    backend_env_path = Path(__file__).parent.parent / "backend" / ".env"
    if backend_env_path.exists():
        with open(backend_env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    os.environ[key.strip()] = value.strip()


def main():
    print("\n" + "="*80)
    print("LOADING SYNTHETIC DATA INTO DATABASE")
    print("="*80 + "\n")
    
    load_env()
    
    try:
        # Initialize database
        engine = create_engine(os.environ.get("DATABASE_URL"), pool_pre_ping=True)
        print("✓ Database initialized")
        
        # Read CSV data
        if not os.path.exists(INPUT_FILE):
            print(f"✗ Input file not found: {INPUT_FILE}")
            return False
        
        print(f"\nLoading data from {INPUT_FILE}...")
        df = pd.read_csv(INPUT_FILE)
        print(f"  ✓ Loaded {len(df)} records")
        
        # Check if data already loaded
        with engine.connect() as conn:
            result = conn.execute(text("SELECT COUNT(*) FROM access_logs"))
            existing = result.scalar()
            if existing and existing > 0:
                print(f"  ✓ Database already contains {existing:,} access logs")
                print(f"  → Skipping insert to avoid duplicates")
                return True
        
        # Get first access point ID (we'll use this for all records since we don't have proper user/zone mapping)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT id FROM access_points LIMIT 1"))
            access_point_row = result.first()
            if not access_point_row:
                print("  ✗ No access points in database")
                return False
            access_point_id = access_point_row[0]
        
        # Get first user ID
        with engine.connect() as conn:
            result = conn.execute(text("SELECT id FROM users LIMIT 1"))
            user_row = result.first()
            if not user_row:
                print("  ✗ No users in database")
                return False
            user_id = user_row[0]
        
        print(f"  ✓ Using access_point_id={access_point_id}, user_id={user_id}")
        
        # Prepare SQL for bulk insert
        print(f"\nInserting {len(df)} records in batches of {BATCH_SIZE}...")
        base_timestamp = datetime.utcnow() - timedelta(days=30)
        
        inserted = 0
        with engine.connect() as conn:
            transaction = conn.begin()
            try:
                for idx, row in df.iterrows():
                    # Create timestamp (spread over last 30 days)
                    hours_offset = (idx % (30 * 24))
                    timestamp = base_timestamp + timedelta(hours=hours_offset)
                    
                    # Prepare values for insert
                    # Map anomaly label to decision: 0=granted, 1=denied
                    is_anomaly = row.get("label", 0) == 1
                    decision = "denied" if is_anomaly else "granted"
                    risk_score = float(row.get("label", 0)) * 0.9
                    
                    try:
                        # Use raw SQL to handle ENUM types properly
                        sql = text("""
                            INSERT INTO access_logs (
                                user_id, access_point_id, timestamp, decision, risk_score,
                                method, hour, day_of_week, is_weekend, access_frequency_24h,
                                time_since_last_access_min, location_match, role_level,
                                is_restricted_area, is_first_access_today, sequential_zone_violation,
                                access_attempt_count, time_of_week, hour_deviation_from_norm,
                                badge_id_used, context
                            ) VALUES (
                                :user_id, :access_point_id, :timestamp, CAST(:decision AS access_result), :risk_score,
                                :method, :hour, :day_of_week, :is_weekend, :access_frequency_24h,
                                :time_since_last_access_min, :location_match, :role_level,
                                :is_restricted_area, :is_first_access_today, :sequential_zone_violation,
                                :access_attempt_count, :time_of_week, :hour_deviation_from_norm,
                                :badge_id_used, CAST(:context AS jsonb)
                            )
                        """)
                        
                        conn.execute(sql, {
                            "user_id": user_id,
                            "access_point_id": access_point_id,
                            "timestamp": timestamp,
                            "decision": decision,
                            "risk_score": risk_score,
                            "method": "badge",
                            "hour": int(row.get("hour", 12)),
                            "day_of_week": int(row.get("day_of_week", 0)),
                            "is_weekend": bool(row.get("is_weekend", False)),
                            "access_frequency_24h": int(row.get("access_frequency_24h", 1)),
                            "time_since_last_access_min": int(row.get("time_since_last_access_min", 60)),
                            "location_match": bool(row.get("location_match", True)),
                            "role_level": int(row.get("role_level", 1)),
                            "is_restricted_area": bool(row.get("is_restricted_area", False)),
                            "is_first_access_today": bool(row.get("is_first_access_today", False)),
                            "sequential_zone_violation": bool(row.get("sequential_zone_violation", False)),
                            "access_attempt_count": int(row.get("access_attempt_count", 1)),
                            "time_of_week": int(row.get("time_of_week", 0)),
                            "hour_deviation_from_norm": float(row.get("hour_deviation_from_norm", 0.0)),
                            "badge_id_used": f"BADGE_{user_id:06d}",
                            "context": json.dumps({
                                "geographic_impossibility": bool(row.get("geographic_impossibility", False)),
                                "distance_between_scans_km": float(row.get("distance_between_scans_km", 0.0)),
                                "velocity_km_per_min": float(row.get("velocity_km_per_min", 0.0)),
                                "zone_clearance_mismatch": bool(row.get("zone_clearance_mismatch", False)),
                                "department_zone_mismatch": bool(row.get("department_zone_mismatch", False)),
                                "concurrent_session_detected": bool(row.get("concurrent_session_detected", False)),
                                "is_anomaly": bool(row.get("label", 0) == 1),
                            })
                        })
                        
                        inserted += 1
                        
                        # Commit in batches for progress
                        if inserted % BATCH_SIZE == 0:
                            transaction.commit()
                            transaction = conn.begin()
                            print(f"  ✓ Inserted {inserted:,}/{len(df):,}")
                            
                    except Exception as e:
                        print(f"  ✗ Error at row {idx}: {e}")
                        if inserted > 0:
                            print(f"  → Partial insert: {inserted} records loaded")
                        raise
                
                # Final commit if there are remaining records
                transaction.commit()
                
            except Exception as e:
                transaction.rollback()
                raise
        
        print(f"  ✓ Successfully inserted {inserted:,} records")
        
        print("\n" + "="*80)
        print("✓ DATA LOADING COMPLETE")
        print("="*80)
        print("\nYou can now:")
        print("  - Explore data via pgAdmin")
        print("  - Query using SQL")
        print("  - View in backend API")
        print()
        return True
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
