from app.database import SessionLocal
from app.models import User
from app.utils.password import hash_password
from datetime import datetime

db = SessionLocal()
try:
    # Check if admin exists
    admin = db.query(User).filter(User.email == "admin@system.local").first()
    
    if admin:
        print(f"Admin user already exists with ID {admin.id}")
    else:
        # Create admin user
        admin = User(
            badge_id="ADMIN_SYSTEM",
            first_name="System",
            last_name="Admin",
            email="admin@system.local",
            phone=None,
            role="admin",
            department="Administration",
            clearance_level=3,
            is_active=True,
            pin_hash=hash_password("admin"),
        )
        db.add(admin)
        db.commit()
        print(f"Created admin user with ID {admin.id}, Email: admin@system.local, Password: admin")
except Exception as e:
    print(f"Error: {e}")
    db.rollback()
finally:
    db.close()
