"""SQLAlchemy ORM models for FindBack."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Boolean, Date, Float, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from backend.database import Base

def generate_uuid():
    return str(uuid.uuid4())

def get_utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    college_id = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="student")  # 'student' | 'admin'
    
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    # Relationships
    lost_reports = relationship("LostReport", back_populates="user")
    found_reports = relationship("FoundReport", back_populates="user", foreign_keys="[FoundReport.user_id]")


class LostReport(Base):
    __tablename__ = "lost_reports"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    report_number = Column(String(20), unique=True, nullable=False)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    
    category = Column(String(50))
    item_name = Column(String(100))
    description = Column(Text)
    location = Column(String(200), nullable=True)
    location_unknown = Column(Boolean, default=False)
    date_lost = Column(Date)
    image_path = Column(String(500), nullable=True)
    distinguishing_info = Column(Text, nullable=True)
    
    status = Column(String(30), default="ACTIVE")
    
    text_embedding = Column(Vector(384))
    image_embedding = Column(Vector(512))
    
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    # Relationships
    user = relationship("User", back_populates="lost_reports")
    matches = relationship("Match", back_populates="lost_report")


class FoundReport(Base):
    __tablename__ = "found_reports"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    report_number = Column(String(20), unique=True, nullable=False)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    
    category = Column(String(50))
    item_name = Column(String(100))
    description = Column(Text)
    location_found = Column(String(200))
    date_found = Column(Date)
    image_path = Column(String(500), nullable=True)
    
    status = Column(String(30), default="PENDING_RECEIPT")
    
    received_by = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)
    received_at = Column(DateTime, nullable=True)
    
    text_embedding = Column(Vector(384))
    image_embedding = Column(Vector(512))
    
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    # Relationships
    user = relationship("User", back_populates="found_reports", foreign_keys=[user_id])
    receiver = relationship("User", foreign_keys=[received_by])
    matches = relationship("Match", back_populates="found_report")


class Match(Base):
    __tablename__ = "matches"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    lost_report_id = Column(UUID(as_uuid=False), ForeignKey("lost_reports.id"), nullable=False)
    found_report_id = Column(UUID(as_uuid=False), ForeignKey("found_reports.id"), nullable=False)
    
    text_score = Column(Float)
    image_score = Column(Float)
    metadata_score = Column(Float)
    combined_score = Column(Float)
    
    explanation = Column(Text, nullable=True)
    status = Column(String(30), default="PENDING")
    
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    # Relationships
    lost_report = relationship("LostReport", back_populates="matches")
    found_report = relationship("FoundReport", back_populates="matches")


class Claim(Base):
    __tablename__ = "claims"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    match_id = Column(UUID(as_uuid=False), ForeignKey("matches.id"), nullable=False)
    student_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    found_report_id = Column(UUID(as_uuid=False), ForeignKey("found_reports.id"), nullable=False)
    
    status = Column(String(30), default="PENDING_VERIFICATION")
    
    admin_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)
    admin_notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    
    type = Column(String(50))
    title = Column(String(200))
    message = Column(Text)
    
    reference_id = Column(UUID(as_uuid=False), nullable=True)
    reference_type = Column(String(30), nullable=True)
    
    is_read = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)
