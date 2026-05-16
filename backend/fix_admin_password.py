import sys
sys.path.insert(0, '/e/RAPTORX/backend')

from app.database import SessionLocal
from app.models import User
from app.utils.password import hash_password

db = SessionLocal()
try:
    # Update admin@system.local with new password
    admin = db.query(User).filter(User.email == "user0999@university.edu").first()
    if admin:
        admin.pin_hash = hash_password("admin")
        db.commit()
        print(f"✓ Updated user0999@university.edu password")
    else:
        print("✗ user0999@university.edu not found")
    
    # Also update omar.admin@raptorx.com
    omar = db.query(User).filter(User.email == "user0998@university.edu").first()
    if omar:
        omar.pin_hash = hash_password("admin")
        db.commit()
        print(f"✓ Updated user0998@university.edu password")
    else:
        print("✗ user0998@university.edu not found")
        
except Exception as e:
    print(f"Error: {e}")
    db.rollback()
finally:
    db.close()
