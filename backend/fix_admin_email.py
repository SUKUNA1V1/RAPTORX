from app.database import SessionLocal
from app.models import User

db = SessionLocal()
try:
    admin = db.query(User).filter(User.id == 23).first()
    if admin:
        admin.email = "admin@company.com"
        db.commit()
        print(f"Updated admin user email to: {admin.email}")
except Exception as e:
    print(f"Error: {e}")
    db.rollback()
finally:
    db.close()
