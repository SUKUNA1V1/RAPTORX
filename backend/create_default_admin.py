import os
import sys
from app.database import SessionLocal
from app.models import User
from app.utils.password import hash_password
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Get admin password from environment variable
default_password = os.getenv("DEFAULT_ADMIN_PASSWORD", None)

if not default_password:
    print("ERROR: DEFAULT_ADMIN_PASSWORD environment variable not set!")
    print("Please set a strong password in your .env file:")
    print("  DEFAULT_ADMIN_PASSWORD=your_strong_password_here")
    print("")
    print("To generate a strong password, run:")
    print("  python -c \"import secrets; print(secrets.token_urlsafe(32))\"")
    sys.exit(1)

if len(default_password) < 8:
    print("ERROR: DEFAULT_ADMIN_PASSWORD must be at least 8 characters long!")
    sys.exit(1)

db = SessionLocal()
try:
    # Check if admin exists
    admin = db.query(User).filter(User.email == "admin@system.local").first()
    
    if admin:
        print(f"Admin user already exists with ID {admin.id}")
        print(f"Email: {admin.email}")
        print("")
        print("To change the admin password, update DEFAULT_ADMIN_PASSWORD in .env")
        print("and run this script again.")
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
            pin_hash=hash_password(default_password),
        )
        db.add(admin)
        db.commit()
        print(f"✓ Created admin user with ID {admin.id}")
        print(f"  Email: admin@system.local")
        print(f"  Password: (set via DEFAULT_ADMIN_PASSWORD env var)")
        print("")
        print("SECURITY WARNING: Change the DEFAULT_ADMIN_PASSWORD immediately after first login!")
except Exception as e:
    print(f"Error: {e}")
    db.rollback()
finally:
    db.close()
