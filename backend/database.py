"""Database engine, session management, and base declarative class."""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from backend.config import settings

# Create database engine
# Note: For pgvector, we can just use the standard postgresql driver.
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,  # Ensure connections are alive
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for ORM models
Base = declarative_base()

def get_db():
    """Dependency to get a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
