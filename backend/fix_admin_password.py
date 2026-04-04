import sys
sys.path.insert(0, '/e/RAPTORX/backend')

from app.database import SessionLocal
from app.models import User
from app.utils.password import hash_password

db = SessionLocal()
try:
    # Update admin@system.local with new password
    admin = db.query(User).filter(User.email == "admin@system.local").first()
    if admin:
        admin.pin_hash = hash_password("admin")
        db.commit()
        print(f"✓ Updated admin@system.local password")
    else:
        print("✗ admin@system.local not found")
    
    # Also update omar.admin@raptorx.com
    omar = db.query(User).filter(User.email == "omar.admin@raptorx.com").first()
    if omar:
        omar.pin_hash = hash_password("admin")
        db.commit()
        print(f"✓ Updated omar.admin@raptorx.com password")
    else:
        print("✗ omar.admin@raptorx.com not found")
        
except Exception as e:
    print(f"Error: {e}")
    db.rollback()
finally:
    db.close()
