from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from .config import settings
from .monitoring import init_query_monitoring


engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Initialize query performance monitoring
init_query_monitoring(engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
