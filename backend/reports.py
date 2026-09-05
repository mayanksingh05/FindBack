"""Reports API: Lost and Found reports management."""
import os
import uuid
import random
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from backend.config import settings
from backend.database import get_db
from backend.models import User, LostReport, FoundReport, Notification
from backend.schemas import LostReportCreate, LostReportResponse, FoundReportCreate, FoundReportResponse
from backend.auth import get_current_user, get_current_admin

router = APIRouter(prefix="/reports", tags=["Reports"])

CATEGORIES = [
    "Electronics & Gadgets",
    "College ID Cards & Wallets",
    "Books & Notebooks",
    "Keys & Keychains",
    "Bags & Backpacks",
    "Water Bottles & Flasks",
    "Eyewear & Glasses",
    "Clothing & Jackets",
    "Umbrellas",
    "Other Personal Items",
]


def generate_report_no(prefix: str) -> str:
    return f"{prefix}-{random.randint(1000, 9999)}"


@router.get("/categories", response_model=List[str])
def get_categories():
    return CATEGORIES


# ── Lost Reports ────────────────────────────────

@router.get("/lost", response_model=List[LostReportResponse])
def list_lost_reports(
    mine: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(LostReport)
    if mine:
        query = query.filter(LostReport.user_id == current_user.id)
    return query.order_by(LostReport.created_at.desc()).all()


@router.post("/lost", response_model=LostReportResponse, status_code=status.HTTP_201_CREATED)
def create_lost_report(
    report_in: LostReportCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    report_no = generate_report_no("LST")
    while db.query(LostReport).filter(LostReport.report_number == report_no).first():
        report_no = generate_report_no("LST")

    lost_report = LostReport(
        report_number=report_no,
        user_id=current_user.id,
        category=report_in.category,
        item_name=report_in.item_name,
        description=report_in.description,
        location=report_in.location,
        location_unknown=report_in.location_unknown,
        date_lost=report_in.date_lost,
        distinguishing_info=report_in.distinguishing_info,
        image_path=report_in.image_path,
        status="ACTIVE",
    )
    db.add(lost_report)
    db.commit()
    db.refresh(lost_report)
    return lost_report


# ── Found Reports ────────────────────────────────

@router.get("/found", response_model=List[FoundReportResponse])
def list_found_reports(
    mine: bool = False,
    catalog: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(FoundReport)

    if mine:
        # Student viewing their own submitted found reports (all statuses)
        query = query.filter(FoundReport.submitted_by == current_user.id)
    elif catalog:
        # Public catalog: only approved items at security desk
        query = query.filter(FoundReport.status == "AT_SECURITY_DESK")
    elif current_user.role == "admin":
        # Admin sees everything
        pass
    else:
        # Student default: only approved items
        query = query.filter(FoundReport.status == "AT_SECURITY_DESK")

    results = query.order_by(FoundReport.created_at.desc()).all()

    # Populate submitter info
    response = []
    for r in results:
        data = FoundReportResponse.model_validate(r)
        submitter = db.query(User).filter(User.id == r.submitted_by).first()
        if submitter:
            data.submitted_by_name = submitter.name
            data.submitted_by_college_id = submitter.college_id
        response.append(data)
    return response


@router.post("/found", response_model=FoundReportResponse, status_code=status.HTTP_201_CREATED)
def create_found_report(
    report_in: FoundReportCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    report_no = generate_report_no("FND")
    while db.query(FoundReport).filter(FoundReport.report_number == report_no).first():
        report_no = generate_report_no("FND")

    # If admin submits, auto-approve. If student submits, needs admin approval.
    initial_status = "AT_SECURITY_DESK" if current_user.role == "admin" else "PENDING_APPROVAL"

    found_report = FoundReport(
        report_number=report_no,
        submitted_by=current_user.id,
        category=report_in.category,
        item_name=report_in.item_name,
        description=report_in.description,
        location_found=report_in.location_found,
        date_found=report_in.date_found,
        image_path=report_in.image_path,
        status=initial_status,
        approved_by=current_user.id if current_user.role == "admin" else None,
        approved_at=datetime.now(timezone.utc) if current_user.role == "admin" else None,
    )
    db.add(found_report)

    # Notify admins if student submitted
    if current_user.role != "admin":
        admins = db.query(User).filter(User.role == "admin").all()
        for admin in admins:
            db.add(Notification(
                user_id=admin.id,
                type="FOUND_ITEM_SUBMITTED",
                title="New Found Item Submission",
                message=f"{current_user.name} ({current_user.college_id}) reported finding a '{report_in.item_name}' at {report_in.location_found}. Please verify and approve once item is received at desk.",
                reference_type="FOUND_REPORT",
            ))

    db.commit()
    db.refresh(found_report)

    data = FoundReportResponse.model_validate(found_report)
    data.submitted_by_name = current_user.name
    data.submitted_by_college_id = current_user.college_id
    return data


@router.patch("/found/{report_id}/approve", response_model=FoundReportResponse)
def approve_found_report(
    report_id: str,
    admin_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Admin approves a found report once the item is physically received at the desk."""
    report = db.query(FoundReport).filter(FoundReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Found report not found")
    if report.status != "PENDING_APPROVAL":
        raise HTTPException(status_code=400, detail="Report already processed")

    report.status = "AT_SECURITY_DESK"
    report.approved_by = admin_user.id
    report.approved_at = datetime.now(timezone.utc)

    # Notify the student who submitted it
    db.add(Notification(
        user_id=report.submitted_by,
        type="FOUND_REPORT_APPROVED",
        title="Found Item Report Approved",
        message=f"Your found item report for '{report.item_name}' has been approved. The item is now at the Security Desk. Thank you for turning it in!",
        reference_id=report.id,
        reference_type="FOUND_REPORT",
    ))

    db.commit()
    db.refresh(report)

    data = FoundReportResponse.model_validate(report)
    submitter = db.query(User).filter(User.id == report.submitted_by).first()
    if submitter:
        data.submitted_by_name = submitter.name
        data.submitted_by_college_id = submitter.college_id
    return data


# ── Image Upload ────────────────────────────────

@router.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    allowed_exts = {".jpg", ".jpeg", ".png", ".webp"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_exts:
        raise HTTPException(status_code=400, detail="Invalid image type. Use JPG, PNG or WEBP.")

    unique_filename = f"{uuid.uuid4().hex}{ext}"
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)

    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)

    return {"image_url": f"/uploads/{unique_filename}"}
