from app.database import SessionLocal
from app.utils.password import verify_password
from app.models import User

db = SessionLocal()
try:
    admins = db.query(User).filter(User.role == "admin").all()
    print("Testing admin passwords:\n")
    
    passwords_to_test = ["admin", "password", "123456", "admin123", "Admin@123"]
    
    for user in admins[:3]:  # Check first 3 admins
        print(f"Email: {user.email}")
        if user.pin_hash:
            for pwd in passwords_to_test:
                if verify_password(pwd, user.pin_hash):
                    print(f"  ✓ Password: {pwd}")
                    break
            else:
                print(f"  ✗ Password not in test list (hash exists)")
        else:
            print(f"  ✗ No password set")
        print()
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
