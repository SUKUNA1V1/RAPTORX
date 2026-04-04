from app.database import SessionLocal
from app.models import User

db = SessionLocal()
try:
    admins = db.query(User).filter(User.role.in_(["admin", "security"])).all()
    print("Admin/Security users:")
    for user in admins:
        print(f"  ID: {user.id}, Email: {user.email}, Role: {user.role}, Active: {user.is_active}, Badge: {user.badge_id}")
except Exception as e:
    print("Error:", e)
finally:
    db.close()
