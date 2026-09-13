"""Reports API: Lost and Found reports management with automated AI embedding generation and matching triggers."""
import os
import uuid
import random
import logging
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from backend.config import settings
from backend.database import get_db
from backend.models import User, LostReport, FoundReport, Notification
from backend.schemas import (
    LostReportCreate,
    LostReportResponse,
    FoundReportCreate,
    FoundReportResponse,
    CatalogSearchRequest,
    SearchResultResponse,
)
from backend.auth import get_current_user, get_current_admin
from backend.embeddings import embedding_service
from backend.matching import (
    run_matching_for_lost_report,
    run_matching_for_found_report,
    compute_cosine_similarity,
)

logger = logging.getLogger(__name__)

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

    # Generate AI vector embeddings
    text_prompt = embedding_service.build_item_text(
        item_name=report_in.item_name,
        category=report_in.category,
        description=report_in.description,
        distinguishing_info=report_in.distinguishing_info,
        location=report_in.location,
    )
    text_vec = embedding_service.generate_text_embedding(text_prompt)

    img_vec = None
    if report_in.image_path:
        img_vec = embedding_service.generate_image_embedding(report_in.image_path)

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
        text_embedding=text_vec,
        image_embedding=img_vec,
        status="ACTIVE",
    )
    db.add(lost_report)
    db.commit()
    db.refresh(lost_report)

    # Automatically trigger matching against items currently at security desk
    try:
        run_matching_for_lost_report(lost_report.id, db)
    except Exception as e:
        logger.error(f"Error running automatic matching for lost report {lost_report.id}: {e}")

    return lost_report


# ── Found Reports ────────────────────────────────

@router.get("/found", response_model=List[FoundReportResponse])
def list_found_reports(
    mine: bool = False,
    catalog: bool = False,
    category: Optional[str] = None,
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

    if category:
        query = query.filter(FoundReport.category == category)

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

    # If admin submits, auto-approve to AT_SECURITY_DESK. If student submits, needs admin approval.
    initial_status = "AT_SECURITY_DESK" if current_user.role == "admin" else "PENDING_APPROVAL"

    # Generate AI vector embeddings
    text_prompt = embedding_service.build_item_text(
        item_name=report_in.item_name,
        category=report_in.category,
        description=report_in.description,
        location=report_in.location_found,
    )
    text_vec = embedding_service.generate_text_embedding(text_prompt)

    img_vec = None
    if report_in.image_path:
        img_vec = embedding_service.generate_image_embedding(report_in.image_path)

    found_report = FoundReport(
        report_number=report_no,
        submitted_by=current_user.id,
        category=report_in.category,
        item_name=report_in.item_name,
        description=report_in.description,
        location_found=report_in.location_found,
        date_found=report_in.date_found,
        image_path=report_in.image_path,
        text_embedding=text_vec,
        image_embedding=img_vec,
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

    # If item is already at security desk (e.g. logged directly by admin), trigger matching against active lost reports
    if initial_status == "AT_SECURITY_DESK":
        try:
            run_matching_for_found_report(found_report.id, db)
        except Exception as e:
            logger.error(f"Error running automatic matching for found report {found_report.id}: {e}")

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

    # Trigger AI matching against all waiting lost reports now that the item is at the desk
    try:
        run_matching_for_found_report(report.id, db)
    except Exception as e:
        logger.error(f"Error running matching on approved found report {report.id}: {e}")

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


# ── Multi-Modal Catalog Search ───────────────────

@router.post("/search", response_model=List[SearchResultResponse])
def search_found_catalog(
    search_req: CatalogSearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Multi-modal semantic search on approved found items catalog.
    Supports natural language text embeddings and visual OpenCLIP similarity.
    """
    query = db.query(FoundReport).filter(FoundReport.status == "AT_SECURITY_DESK")
    if search_req.category:
        query = query.filter(FoundReport.category == search_req.category)
    if search_req.location:
        query = query.filter(FoundReport.location_found.ilike(f"%{search_req.location}%"))

    items = query.all()
    if not items:
        return []

    has_text_query = bool(search_req.query and search_req.query.strip())
    has_image_query = bool(search_req.image_path and search_req.image_path.strip())

    if not has_text_query and not has_image_query:
        results = []
        for item in sorted(items, key=lambda x: x.created_at, reverse=True):
            data = SearchResultResponse.model_validate(item)
            data.similarity_score = 1.0
            data.match_type = "catalog"
            submitter = db.query(User).filter(User.id == item.submitted_by).first()
            if submitter:
                data.submitted_by_name = submitter.name
                data.submitted_by_college_id = submitter.college_id
            results.append(data)
        return results

    # Generate query embeddings
    query_text_vec = None
    if has_text_query:
        try:
            query_text_vec = embedding_service.generate_text_embedding(search_req.query.strip())
        except Exception as e:
            logger.error(f"Error encoding search text query: {e}")

    query_img_vec = None
    if has_image_query:
        try:
            query_img_vec = embedding_service.generate_image_embedding(search_req.image_path.strip())
        except Exception as e:
            logger.error(f"Error encoding search image query: {e}")

    min_score = search_req.min_score or 0.25
    scored_results = []

    for item in items:
        text_sim = 0.0
        img_sim = 0.0
        match_type = "catalog"

        if query_text_vec is not None:
            if item.text_embedding is not None:
                text_sim = compute_cosine_similarity(query_text_vec, item.text_embedding)
            else:
                item_text = embedding_service.build_item_text(
                    item.item_name, item.category, item.description, location=item.location_found
                )
                item.text_embedding = embedding_service.generate_text_embedding(item_text)
                db.commit()
                text_sim = compute_cosine_similarity(query_text_vec, item.text_embedding)

            # Keyword presence bonus (0.08) if terms appear directly in item_name or description
            q_lower = search_req.query.lower()
            if any(term in item.item_name.lower() or term in item.description.lower() for term in q_lower.split() if len(term) > 2):
                text_sim = min(1.0, text_sim + 0.08)

        if query_img_vec is not None and item.image_path:
            if item.image_embedding is None:
                item.image_embedding = embedding_service.generate_image_embedding(item.image_path)
                db.commit()
            if item.image_embedding is not None:
                img_sim = compute_cosine_similarity(query_img_vec, item.image_embedding)

        if has_text_query and has_image_query:
            if img_sim > 0.0:
                final_score = (text_sim * 0.55) + (img_sim * 0.45)
                match_type = "hybrid"
            else:
                final_score = text_sim
                match_type = "text"
        elif has_image_query:
            final_score = img_sim
            match_type = "image"
        else:
            final_score = text_sim
            match_type = "text"

        if final_score >= min_score:
            data = SearchResultResponse.model_validate(item)
            data.similarity_score = round(final_score, 4)
            data.match_type = match_type
            submitter = db.query(User).filter(User.id == item.submitted_by).first()
            if submitter:
                data.submitted_by_name = submitter.name
                data.submitted_by_college_id = submitter.college_id
            scored_results.append((final_score, data))

    # Sort descending by similarity score
    scored_results.sort(key=lambda x: x[0], reverse=True)
    return [r[1] for r in scored_results[:50]]

