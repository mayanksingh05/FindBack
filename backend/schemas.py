"""Pydantic request and response schemas for FindBack."""
from typing import Optional, List
from datetime import datetime, date
from pydantic import BaseModel, EmailStr

# ----- Auth & User Schemas -----
class UserBase(BaseModel):
    college_id: str
    name: str
    email: EmailStr
    role: str = "student"

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: str
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class TokenData(BaseModel):
    user_id: Optional[str] = None
    role: Optional[str] = None


# ----- Report Schemas -----
class LostReportCreate(BaseModel):
    category: str
    item_name: str
    description: str
    location: Optional[str] = None
    location_unknown: bool = False
    date_lost: Optional[date] = None
    distinguishing_info: Optional[str] = None
    image_path: Optional[str] = None

class LostReportResponse(BaseModel):
    id: str
    report_number: str
    user_id: str
    category: str
    item_name: str
    description: str
    location: Optional[str] = None
    location_unknown: bool = False
    date_lost: Optional[date] = None
    distinguishing_info: Optional[str] = None
    image_path: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class FoundReportCreate(BaseModel):
    category: str
    item_name: str
    description: str
    location_found: str
    date_found: Optional[date] = None
    image_path: Optional[str] = None

class FoundReportResponse(BaseModel):
    id: str
    report_number: str
    submitted_by: str
    category: str
    item_name: str
    description: str
    location_found: str
    date_found: Optional[date] = None
    image_path: Optional[str] = None
    status: str
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    # Populated dynamically
    submitted_by_name: Optional[str] = None
    submitted_by_college_id: Optional[str] = None
    class Config:
        from_attributes = True


# ----- Match Schemas -----
class MatchResponse(BaseModel):
    id: str
    lost_report_id: str
    found_report_id: str
    text_score: Optional[float] = 0.0
    image_score: Optional[float] = 0.0
    metadata_score: Optional[float] = 0.0
    combined_score: Optional[float] = 0.0
    explanation: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None
    lost_report: Optional[LostReportResponse] = None
    found_report: Optional[FoundReportResponse] = None
    class Config:
        from_attributes = True


# ----- Claim Schemas -----
class ClaimCreate(BaseModel):
    match_id: str

class ClaimResponse(BaseModel):
    id: str
    match_id: str
    student_id: str
    found_report_id: str
    status: str
    admin_id: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    # Populated dynamically for admin view
    student_name: Optional[str] = None
    student_college_id: Optional[str] = None
    item_name: Optional[str] = None
    combined_score: Optional[float] = None
    lost_item_name: Optional[str] = None
    lost_image: Optional[str] = None
    found_image: Optional[str] = None
    class Config:
        from_attributes = True

class ClaimStatusUpdate(BaseModel):
    status: str  # 'VERIFIED' | 'FAILED'


# ----- Notification Schemas -----
class NotificationResponse(BaseModel):
    id: str
    user_id: str
    type: str
    title: str
    message: str
    reference_id: Optional[str] = None
    reference_type: Optional[str] = None
    is_read: bool = False
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True
