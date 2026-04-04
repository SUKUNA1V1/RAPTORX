from app.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    result = db.execute(text("SELECT DISTINCT role FROM users ORDER BY role")).fetchall()
    roles = [r[0] for r in result]
    print("Valid roles in database:", roles)
except Exception as e:
    print("Error:", e)
finally:
    db.close()
