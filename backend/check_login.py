from app.database import SessionLocal
from app.models import User
from app.utils.password import verify_password

db = SessionLocal()
try:
    # Check for admin user
    admin_user = db.query(User).filter(User.email == "admin@company.com").first()
    if admin_user:
        is_valid = verify_password("admin", admin_user.pin_hash)
        print(f"Found admin@company.com: password 'admin' valid = {is_valid}")
    else:
        print("No admin@company.com user found")
    
    # Try alice.martin
    alice = db.query(User).filter(User.email == "alice.martin@coOmpany.com").first()
    if alice:
        print(f"Found alice.martin@coOmpany.com (ID: {alice.id}, Role: {alice.role})")
        print(f"  Password hash exists: {alice.pin_hash is not None}")
except Exception as e:
    print("Error:", e)
finally:
    db.close()
