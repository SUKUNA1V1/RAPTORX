from app.database import SessionLocal
from app.models import User

db = SessionLocal()
try:
    users = db.query(User).filter(User.pin_hash != None).all()
    print(f"Total users with password hash: {len(users)}\n")
    
    # Show first 10
    for user in users[:10]:
        print(f"ID: {user.id}, Email: {user.email}, Role: {user.role}, Active: {user.is_active}")
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
