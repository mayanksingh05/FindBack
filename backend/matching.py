"""Matches and Claims API + Semantic AI Vector Matching Engine.
- Uses Sentence-Transformers (384-dim) & OpenCLIP (512-dim) vector similarity.
- Multi-factor scoring: Text (0.40) + Image (0.40) + Metadata (0.20) or Text (0.70) + Metadata (0.30).
- Admin does NOT browse raw AI matches; student initiates claim -> Admin verifies in queue.
"""
import logging
import numpy as np
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from backend.config import settings
from backend.database import get_db
from backend.models import User, Match, Claim, LostReport, FoundReport, Notification
from backend.schemas import MatchResponse, ClaimResponse, ClaimCreate, ClaimStatusUpdate
from backend.auth import get_current_user, get_current_admin
from backend.embeddings import embedding_service
from backend.rag import generate_match_explanation

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/matches", tags=["Matches & Claims"])


# ============================================================
# Math & Similarity Scoring Utilities
# ============================================================

def compute_cosine_similarity(vec1, vec2) -> float:
    """Calculate cosine similarity between two float vectors. Clamped to [0.0, 1.0]."""
    if vec1 is None or vec2 is None:
        return 0.0
    try:
        a = np.array(vec1, dtype=float)
        b = np.array(vec2, dtype=float)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        sim = float(np.dot(a, b) / (norm_a * norm_b))
        return max(0.0, min(1.0, sim))
    except Exception as e:
        logger.error(f"Error computing cosine similarity: {e}")
        return 0.0


def compute_metadata_similarity(lost_report: LostReport, found_report: FoundReport) -> float:
    """Evaluate metadata similarity based on category match, date proximity, and location overlap."""
    score = 0.0

    # 1. Category match (50% of metadata weight)
    cat1 = (lost_report.category or "").strip().lower()
    cat2 = (found_report.category or "").strip().lower()
    if cat1 and cat2 and cat1 == cat2:
        score += 0.50

    # 2. Date proximity (30% of metadata weight)
    if lost_report.date_lost and found_report.date_found:
        days_diff = abs((found_report.date_found - lost_report.date_lost).days)
        if days_diff == 0:
            score += 0.30
        elif days_diff <= 3:
            score += 0.25
        elif days_diff <= 7:
            score += 0.15
        elif days_diff <= 14:
            score += 0.05
    else:
        score += 0.15  # Neutral default if dates missing

    # 3. Location overlap (20% of metadata weight)
    loc1 = (lost_report.location or "").lower()
    loc2 = (found_report.location_found or "").lower()
    if loc1 and loc2:
        words1 = {w for w in loc1.replace(",", " ").split() if len(w) > 3}
        words2 = {w for w in loc2.replace(",", " ").split() if len(w) > 3}
        if words1 and words2:
            overlap = len(words1.intersection(words2))
            if overlap > 0:
                score += 0.20
            else:
                score += 0.05
        else:
            score += 0.10
    else:
        score += 0.10

    return round(score, 4)


def compute_combined_score(text_score: float, image_score: Optional[float], meta_score: float) -> float:
    """Compute weighted composite similarity score."""
    if image_score is not None:
        # Both text and image present
        combined = (
            settings.TEXT_SIMILARITY_WEIGHT * text_score
            + settings.IMAGE_SIMILARITY_WEIGHT * image_score
            + settings.METADATA_WEIGHT * meta_score
        )
    else:
        # No image: reweight across text (70%) and metadata (30%)
        combined = 0.70 * text_score + 0.30 * meta_score
    return round(max(0.0, min(1.0, combined)), 4)


# ============================================================
# Core AI Matching Execution
# ============================================================

def run_matching_for_lost_report(lost_report_id: str, db: Session) -> List[Match]:
    """Search all items currently AT_SECURITY_DESK against this lost report.
    Creates or updates Match records exceeding MATCH_THRESHOLD and notifies student.
    """
    lost_report = db.query(LostReport).filter(LostReport.id == lost_report_id).first()
    if not lost_report:
        return []

    # Ensure lost report has text embedding
    if lost_report.text_embedding is None:
        text = embedding_service.build_item_text(
            lost_report.item_name,
            lost_report.category,
            lost_report.description,
            lost_report.distinguishing_info,
            lost_report.location,
        )
        lost_report.text_embedding = embedding_service.generate_text_embedding(text)
        if lost_report.image_path and lost_report.image_embedding is None:
            lost_report.image_embedding = embedding_service.generate_image_embedding(lost_report.image_path)
        db.commit()
        db.refresh(lost_report)

    if lost_report.text_embedding is None:
        logger.warning(f"Could not generate text embedding for lost report {lost_report_id}")
        return []

    # Search found items physically in custody at the security desk
    candidate_found_items = (
        db.query(FoundReport)
        .filter(FoundReport.status == "AT_SECURITY_DESK")
        .all()
    )

    matches_found = []

    for found in candidate_found_items:
        # Ensure found item has embeddings
        if found.text_embedding is None:
            text = embedding_service.build_item_text(
                found.item_name,
                found.category,
                found.description,
                location=found.location_found,
            )
            found.text_embedding = embedding_service.generate_text_embedding(text)
            if found.image_path and found.image_embedding is None:
                found.image_embedding = embedding_service.generate_image_embedding(found.image_path)
            db.commit()
            db.refresh(found)

        if found.text_embedding is None:
            continue

        text_score = compute_cosine_similarity(lost_report.text_embedding, found.text_embedding)

        image_score = None
        if lost_report.image_embedding is not None and found.image_embedding is not None:
            image_score = compute_cosine_similarity(lost_report.image_embedding, found.image_embedding)

        meta_score = compute_metadata_similarity(lost_report, found)
        combined_score = compute_combined_score(text_score, image_score, meta_score)

        if combined_score >= settings.MATCH_THRESHOLD:
            # Check existing match
            existing_match = db.query(Match).filter(
                Match.lost_report_id == lost_report.id,
                Match.found_report_id == found.id,
            ).first()

            explanation = generate_match_explanation(
                lost_report, found, text_score, image_score, meta_score, combined_score
            )

            if existing_match:
                existing_match.text_score = text_score
                existing_match.image_score = image_score
                existing_match.metadata_score = meta_score
                existing_match.combined_score = combined_score
                existing_match.explanation = explanation
                matches_found.append(existing_match)
            else:
                new_match = Match(
                    lost_report_id=lost_report.id,
                    found_report_id=found.id,
                    text_score=text_score,
                    image_score=image_score,
                    metadata_score=meta_score,
                    combined_score=combined_score,
                    explanation=explanation,
                    status="PENDING",
                )
                db.add(new_match)
                db.flush()

                # Notify student
                score_pct = round(combined_score * 100)
                db.add(Notification(
                    user_id=lost_report.user_id,
                    type="MATCH_FOUND",
                    title=f"AI Match Found ({score_pct}%)",
                    message=f"An item matching your lost '{lost_report.item_name}' was found at the Security Desk!",
                    reference_id=new_match.id,
                    reference_type="MATCH",
                ))
                matches_found.append(new_match)

    db.commit()
    return matches_found


def run_matching_for_found_report(found_report_id: str, db: Session) -> List[Match]:
    """Called when an admin approves a found item into AT_SECURITY_DESK status.
    Scans all ACTIVE lost reports to notify waiting students.
    """
    found_report = db.query(FoundReport).filter(FoundReport.id == found_report_id).first()
    if not found_report or found_report.status != "AT_SECURITY_DESK":
        return []

    # Ensure embeddings exist
    if found_report.text_embedding is None:
        text = embedding_service.build_item_text(
            found_report.item_name,
            found_report.category,
            found_report.description,
            location=found_report.location_found,
        )
        found_report.text_embedding = embedding_service.generate_text_embedding(text)
        if found_report.image_path and found_report.image_embedding is None:
            found_report.image_embedding = embedding_service.generate_image_embedding(found_report.image_path)
        db.commit()
        db.refresh(found_report)

    if found_report.text_embedding is None:
        return []

    active_lost_reports = db.query(LostReport).filter(LostReport.status == "ACTIVE").all()
    matches_found = []

    for lost in active_lost_reports:
        if lost.text_embedding is None:
            text = embedding_service.build_item_text(
                lost.item_name, lost.category, lost.description, lost.distinguishing_info, lost.location
            )
            lost.text_embedding = embedding_service.generate_text_embedding(text)
            if lost.image_path and lost.image_embedding is None:
                lost.image_embedding = embedding_service.generate_image_embedding(lost.image_path)
            db.commit()
            db.refresh(lost)

        if lost.text_embedding is None:
            continue

        text_score = compute_cosine_similarity(lost.text_embedding, found_report.text_embedding)
        image_score = None
        if lost.image_embedding is not None and found_report.image_embedding is not None:
            image_score = compute_cosine_similarity(lost.image_embedding, found_report.image_embedding)

        meta_score = compute_metadata_similarity(lost, found_report)
        combined_score = compute_combined_score(text_score, image_score, meta_score)

        if combined_score >= settings.MATCH_THRESHOLD:
            existing = db.query(Match).filter(
                Match.lost_report_id == lost.id,
                Match.found_report_id == found_report.id,
            ).first()

            explanation = generate_match_explanation(
                lost, found_report, text_score, image_score, meta_score, combined_score
            )

            if existing:
                existing.text_score = text_score
                existing.image_score = image_score
                existing.metadata_score = meta_score
                existing.combined_score = combined_score
                existing.explanation = explanation
                matches_found.append(existing)
            else:
                new_match = Match(
                    lost_report_id=lost.id,
                    found_report_id=found_report.id,
                    text_score=text_score,
                    image_score=image_score,
                    metadata_score=meta_score,
                    combined_score=combined_score,
                    explanation=explanation,
                    status="PENDING",
                )
                db.add(new_match)
                db.flush()

                # Notify student
                score_pct = round(combined_score * 100)
                db.add(Notification(
                    user_id=lost.user_id,
                    type="MATCH_FOUND",
                    title=f"AI Match Found ({score_pct}%)",
                    message=f"A newly received item at the Security Desk matches your lost '{lost.item_name}'!",
                    reference_id=new_match.id,
                    reference_type="MATCH",
                ))
                matches_found.append(new_match)

    db.commit()
    return matches_found


# ============================================================
# API Endpoints
# ============================================================

@router.get("", response_model=List[MatchResponse])
def list_matches(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Students see their own AI matches. Admin does NOT use this endpoint."""
    if current_user.role == "admin":
        return []

    student_lost_ids = [
        r.id for r in db.query(LostReport.id).filter(LostReport.user_id == current_user.id).all()
    ]
    matches = (
        db.query(Match)
        .options(joinedload(Match.lost_report), joinedload(Match.found_report))
        .filter(Match.lost_report_id.in_(student_lost_ids))
        .order_by(Match.combined_score.desc())
        .all()
    )
    return matches


@router.post("/find-matches/{lost_report_id}", response_model=List[MatchResponse])
def find_matches_on_demand(
    lost_report_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Trigger an on-demand AI vector scan for a specific lost item."""
    lost_report = db.query(LostReport).filter(LostReport.id == lost_report_id).first()
    if not lost_report:
        raise HTTPException(status_code=404, detail="Lost report not found")

    if current_user.role != "admin" and lost_report.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to run matching on this report")

    matches = run_matching_for_lost_report(lost_report_id, db)
    return matches


@router.get("/{match_id}", response_model=MatchResponse)
def get_match_detail(
    match_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    match = (
        db.query(Match)
        .options(joinedload(Match.lost_report), joinedload(Match.found_report))
        .filter(Match.id == match_id)
        .first()
    )
    if not match:
        raise HTTPException(status_code=404, detail="Match record not found")

    if current_user.role != "admin" and match.lost_report.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this match")

    return match


@router.post("/{match_id}/claim", response_model=ClaimResponse, status_code=status.HTTP_201_CREATED)
def submit_claim(
    match_id: str,
    claim_in: Optional[ClaimCreate] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Student submits a verification claim with proof details. This appears in admin's queue."""
    match = (
        db.query(Match)
        .options(joinedload(Match.lost_report), joinedload(Match.found_report))
        .filter(Match.id == match_id)
        .first()
    )
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    existing = db.query(Claim).filter(
        Claim.match_id == match_id, Claim.student_id == current_user.id
    ).first()
    if existing:
        return _build_claim_response(existing, current_user, match, db)

    proof_desc = claim_in.proof_description if claim_in else None
    proof_img = claim_in.proof_image_path if claim_in else None
    student_phone = claim_in.student_phone if claim_in else None

    claim = Claim(
        match_id=match.id,
        student_id=current_user.id,
        found_report_id=match.found_report_id,
        proof_description=proof_desc,
        proof_image_path=proof_img,
        student_phone=student_phone,
        status="PENDING_VERIFICATION",
    )
    db.add(claim)
    match.status = "CLAIM_PENDING"

    admins = db.query(User).filter(User.role == "admin").all()
    score_pct = round((match.combined_score or 0) * 100)
    for admin in admins:
        db.add(Notification(
            user_id=admin.id,
            type="VERIFICATION_REQUEST",
            title=f"Verification Request ({score_pct}% match)",
            message=f"Student {current_user.name} ({current_user.college_id}) claims '{match.found_report.item_name}' matches their lost '{match.lost_report.item_name}'.",
            reference_id=claim.id,
            reference_type="CLAIM",
        ))

    db.commit()
    db.refresh(claim)
    return _build_claim_response(claim, current_user, match, db)


@router.get("/claims/all", response_model=List[ClaimResponse])
def list_claims(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Claim)
    if current_user.role != "admin":
        query = query.filter(Claim.student_id == current_user.id)

    claims = query.order_by(Claim.created_at.desc()).all()
    result = []
    for c in claims:
        student = db.query(User).filter(User.id == c.student_id).first()
        match = (
            db.query(Match)
            .options(joinedload(Match.lost_report), joinedload(Match.found_report))
            .filter(Match.id == c.match_id)
            .first()
        )
        result.append(_build_claim_response(c, student, match, db))
    return result


@router.patch("/claims/{claim_id}", response_model=ClaimResponse)
def update_claim_status(
    claim_id: str,
    update_in: ClaimStatusUpdate,
    admin_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Admin clicks Verified or Failed."""
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    claim.status = update_in.status
    claim.admin_id = admin_user.id
    claim.resolved_at = datetime.now(timezone.utc)
    if update_in.handover_notes:
        claim.handover_notes = update_in.handover_notes

    # Auto-generate digital property release receipt number on verification
    if update_in.status == "VERIFIED" and not claim.receipt_number:
        import random
        claim.receipt_number = f"REC-{datetime.now().year}-{random.randint(10000, 99999)}"

    match = (
        db.query(Match)
        .options(joinedload(Match.lost_report), joinedload(Match.found_report))
        .filter(Match.id == claim.match_id)
        .first()
    )

    if match:
        if update_in.status == "VERIFIED":
            match.status = "VERIFIED"
            if match.lost_report:
                match.lost_report.status = "RESOLVED"
            if match.found_report:
                match.found_report.status = "RETURNED_TO_OWNER"
        else:
            match.status = "REJECTED"

    if update_in.status == "VERIFIED":
        msg = f"Your verification was successful! Receipt #{claim.receipt_number} issued. Please collect your item from the Campus Security Desk."
    else:
        msg = "Verification was unsuccessful. The item details did not match during in-person verification."

    db.add(Notification(
        user_id=claim.student_id,
        type="CLAIM_RESULT",
        title=f"Verification {'Successful' if update_in.status == 'VERIFIED' else 'Unsuccessful'}",
        message=msg,
        reference_id=claim.id,
        reference_type="CLAIM",
    ))

    db.commit()
    db.refresh(claim)

    student = db.query(User).filter(User.id == claim.student_id).first()
    return _build_claim_response(claim, student, match, db)


def _build_claim_response(claim, student, match, db) -> ClaimResponse:
    return ClaimResponse(
        id=claim.id,
        match_id=claim.match_id,
        student_id=claim.student_id,
        found_report_id=claim.found_report_id,
        status=claim.status,
        proof_description=claim.proof_description,
        proof_image_path=claim.proof_image_path,
        student_phone=claim.student_phone,
        handover_notes=claim.handover_notes,
        receipt_number=claim.receipt_number,
        admin_id=claim.admin_id,
        resolved_at=claim.resolved_at,
        created_at=claim.created_at,
        student_name=student.name if student else "Student",
        student_college_id=student.college_id if student else "N/A",
        item_name=match.found_report.item_name if match and match.found_report else "Item",
        combined_score=match.combined_score if match else None,
        lost_item_name=match.lost_report.item_name if match and match.lost_report else None,
        lost_image=match.lost_report.image_path if match and match.lost_report else None,
        found_image=match.found_report.image_path if match and match.found_report else None,
    )
