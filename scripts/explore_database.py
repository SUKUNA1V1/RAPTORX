"""
Example queries for exploring loaded database data.

Run this after the pipeline completes to see data insights.
"""
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.models.user import User
from app.models.access_point import AccessPoint
from app.models.access_log import AccessLog


def init_db():
    """Initialize database connection."""
    engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
    SessionLocal = sessionmaker(bind=engine)
    return SessionLocal()


def show_stats():
    """Display database statistics."""
    session = init_db()
    
    print("\n" + "="*80)
    print("DATABASE STATISTICS")
    print("="*80 + "\n")
    
    # Count records
    user_count = session.query(User).count()
    point_count = session.query(AccessPoint).count()
    log_count = session.query(AccessLog).count()
    
    print(f"Users:           {user_count:,}")
    print(f"Access Points:   {point_count}")
    print(f"Access Logs:     {log_count:,}")
    print()
    
    # Anomaly statistics
    anomaly_count = session.query(AccessLog).filter_by(decision='flagged').count()
    normal_count = session.query(AccessLog).filter_by(decision='approved').count()
    
    print("Access Decisions:")
    print(f"  Normal:        {normal_count:,} ({100*normal_count/(normal_count+anomaly_count):.1f}%)")
    print(f"  Flagged:       {anomaly_count:,} ({100*anomaly_count/(normal_count+anomaly_count):.1f}%)")
    print()
    
    # Department distribution
    print("Users by Department:")
    from sqlalchemy import text
    depts = session.execute(
        text("SELECT department, COUNT(*) as count FROM users GROUP BY department ORDER BY count DESC")
    )
    for dept, count in depts:
        print(f"  {dept:15} {count:3}")
    print()
    
    # Risk score statistics
    avg_risk = session.query(func.avg(AccessLog.risk_score)).scalar()
    print(f"Average Risk Score: {avg_risk:.3f}")
    print()
    
    # Hourly access pattern
    print("Access Volume by Hour of Day:")
    hours = session.query(AccessLog.hour, func.count()).group_by(AccessLog.hour).order_by(AccessLog.hour).all()
    for hour, count in hours[:8]:  # Show first 8 hours
        bar = "█" * (count // 500)
        print(f"  {hour:2}:00 {bar} {count:,}")
    print(f"  ... ({len(hours)} hours total)")
    print()
    
    # Most active users
    print("Top 5 Most Active Users:")
    top_users = session.query(
        User.badge_id,
        User.first_name,
        func.count(AccessLog.id).label('access_count')
    ).join(AccessLog).group_by(User.id).order_by(func.count(AccessLog.id).desc()).limit(5).all()
    
    for badge, name, count in top_users:
        print(f"  {badge:15} {name:15} {count:5} accesses")
    print()
    
    # Anomalies by zone
    print("Top Anomalous Zones:")
    zones = session.execute(
        text("""
        SELECT ap.zone, COUNT(*) as anomaly_count
        FROM access_logs al
        JOIN access_points ap ON al.access_point_id = ap.id
        WHERE al.decision = 'flagged'
        GROUP BY ap.zone
        ORDER BY anomaly_count DESC
        LIMIT 5
        """)
    )
    for zone, count in zones:
        print(f"  {zone:15} {count:5} anomalies")
    print()
    
    session.close()


if __name__ == "__main__":
    try:
        show_stats()
        print("="*80)
        print("✓ Database exploration complete")
        print("="*80 + "\n")
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
