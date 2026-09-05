"""Matches and Claims API.
Admin does NOT see raw AI matches. Admin only sees verification requests (claims) from students.
Student searches AI matches -> clicks Claim -> Admin sees claim in Verification Queue.
"""
from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from backend.database import get_db
from backend.models import User, Match, Claim, LostReport, FoundReport, Notification
from backend.schemas import MatchResponse, ClaimResponse, ClaimCreate, ClaimStatusUpdate
from backend.auth import get_current_user, get_current_admin

router = APIRouter(prefix="/matches", tags=["Matches & Claims"])


@router.get("", response_model=List[MatchResponse])
def list_matches(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Students see their own AI matches. Admin does NOT use this endpoint."""
    if current_user.role == "admin":
        # Admin should not browse raw AI matches — they see claims instead
        return []

    # Only show matches for this student's lost reports
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

    # Students can only see their own matches; admin can see any (for claim context)
    if current_user.role != "admin" and match.lost_report.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this match")

    return match


@router.post("/{match_id}/claim", response_model=ClaimResponse, status_code=status.HTTP_201_CREATED)
def submit_claim(
    match_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Student submits a verification claim. This appears in admin's queue."""
    match = (
        db.query(Match)
        .options(joinedload(Match.lost_report), joinedload(Match.found_report))
        .filter(Match.id == match_id)
        .first()
    )
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    # Check existing claim
    existing = db.query(Claim).filter(
        Claim.match_id == match_id, Claim.student_id == current_user.id
    ).first()
    if existing:
        return _build_claim_response(existing, current_user, match, db)

    claim = Claim(
        match_id=match.id,
        student_id=current_user.id,
        found_report_id=match.found_report_id,
        status="PENDING_VERIFICATION",
    )
    db.add(claim)
    match.status = "CLAIM_PENDING"

    # Notify all admins
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
    """Admin clicks Verified or Failed. That's it — no manual notes needed."""
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    claim.status = update_in.status
    claim.admin_id = admin_user.id
    claim.resolved_at = datetime.now(timezone.utc)

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

    # Notify student
    if update_in.status == "VERIFIED":
        msg = "Your verification was successful! Please collect your item from the Campus Security Desk."
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
    """Helper to build a rich ClaimResponse with all context for admin view."""
    return ClaimResponse(
        id=claim.id,
        match_id=claim.match_id,
        student_id=claim.student_id,
        found_report_id=claim.found_report_id,
        status=claim.status,
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
