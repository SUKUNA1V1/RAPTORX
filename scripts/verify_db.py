from sqlalchemy import inspect
from app.database import engine

inspector = inspect(engine)
columns = inspector.get_columns('organizations')

print("Organizations table columns:")
for col in columns:
    print(f"  - {col['name']}: {col['type']}")

col_names = [c['name'] for c in columns]
if 'decision_mode' in col_names:
    print("\n✅ decision_mode column exists!")
else:
    print("\n❌ decision_mode column MISSING!")
