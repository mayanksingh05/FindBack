"""Database initialization script to create tables and extensions."""
import sys
import os

# Add the project root to sys.path so we can import backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from backend.database import engine, Base
from backend.models import User, LostReport, FoundReport, Match, Claim, Notification

def init_db():
    print("Connecting to database...")
    
    # First, we need to ensure the vector extension is created
    # We must do this outside a transaction or within an autocommit block
    with engine.connect() as conn:
        print("Creating pgvector extension if it doesn't exist...")
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()

    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")

if __name__ == "__main__":
    init_db()
