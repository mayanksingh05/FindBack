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
    
    # Safe migration: ensure new Claim columns exist if table was created previously
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE claims ADD COLUMN IF NOT EXISTS proof_description TEXT;"))
        conn.execute(text("ALTER TABLE claims ADD COLUMN IF NOT EXISTS proof_image_path VARCHAR(500);"))
        conn.execute(text("ALTER TABLE claims ADD COLUMN IF NOT EXISTS student_phone VARCHAR(20);"))
        conn.execute(text("ALTER TABLE claims ADD COLUMN IF NOT EXISTS handover_notes TEXT;"))
        conn.execute(text("ALTER TABLE claims ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(50);"))
        conn.commit()
        
    print("Database tables and migration checks completed successfully!")

if __name__ == "__main__":
    init_db()
