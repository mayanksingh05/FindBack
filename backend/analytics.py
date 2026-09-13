"""Analytics & Reporting API: Campus loss trends, recovery rate KPIs, and CSV audit export."""
import io
import csv
from datetime import datetime, timezone
from typing import Dict, Any, List
from collections import Counter
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User, LostReport, FoundReport, Claim, Match
from backend.auth import get_current_admin

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview", response_model=Dict[str, Any])
def get_analytics_overview(
    admin_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Calculate campus-wide property recovery metrics, loss hotspots, and category distribution."""
    total_lost = db.query(LostReport).count()
    active_lost = db.query(LostReport).filter(LostReport.status == "ACTIVE").count()
    resolved_lost = db.query(LostReport).filter(LostReport.status == "RESOLVED").count()

    total_found = db.query(FoundReport).count()
    at_desk = db.query(FoundReport).filter(FoundReport.status == "AT_SECURITY_DESK").count()
    returned_found = db.query(FoundReport).filter(FoundReport.status == "RETURNED_TO_OWNER").count()

    total_claims = db.query(Claim).count()
    verified_claims = db.query(Claim).filter(Claim.status == "VERIFIED").all()
    verified_count = len(verified_claims)

    # Recovery Rate (%)
    recovery_rate = 0.0
    if total_found > 0:
        recovery_rate = round((returned_found / total_found) * 100, 1)

    # Average turnaround time in days
    turnaround_days = 0.0
    if verified_claims:
        total_seconds = 0
        valid_turnaround_count = 0
        for c in verified_claims:
            if c.created_at and c.resolved_at:
                delta = (c.resolved_at - c.created_at).total_seconds()
                if delta >= 0:
                    total_seconds += delta
                    valid_turnaround_count += 1
        if valid_turnaround_count > 0:
            avg_sec = total_seconds / valid_turnaround_count
            turnaround_days = round(avg_sec / 86400, 1)

    # Hotspots calculation (aggregate locations from lost and found reports)
    locations = []
    for r in db.query(LostReport.location).filter(LostReport.location.isnot(None)).all():
        if r[0] and r[0].strip() and r[0].lower() != "unknown":
            locations.append(r[0].strip().title())
    for r in db.query(FoundReport.location_found).filter(FoundReport.location_found.isnot(None)).all():
        if r[0] and r[0].strip():
            locations.append(r[0].strip().title())

    location_counter = Counter(locations)
    top_hotspots = [
        {"location": loc, "count": cnt}
        for loc, cnt in location_counter.most_common(6)
    ]

    # Category distribution (lost vs found)
    categories = []
    for r in db.query(LostReport.category).all():
        if r[0]:
            categories.append(r[0])
    for r in db.query(FoundReport.category).all():
        if r[0]:
            categories.append(r[0])

    category_counter = Counter(categories)
    category_distribution = [
        {"category": cat, "count": cnt}
        for cat, cnt in category_counter.most_common(8)
    ]

    return {
        "summary": {
            "total_lost": total_lost,
            "active_lost": active_lost,
            "resolved_lost": resolved_lost,
            "total_found": total_found,
            "at_desk": at_desk,
            "returned_to_owner": returned_found,
            "total_claims": total_claims,
            "verified_claims": verified_count,
            "recovery_rate_pct": recovery_rate,
            "avg_turnaround_days": turnaround_days,
        },
        "hotspots": top_hotspots,
        "categories": category_distribution,
    }


@router.get("/export-csv")
def export_audit_csv(
    admin_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Stream official CSV log of all verified property handovers for administrative record-keeping."""
    verified_claims = (
        db.query(Claim)
        .filter(Claim.status == "VERIFIED")
        .order_by(Claim.resolved_at.desc())
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)

    # CSV Header
    writer.writerow([
        "Receipt Number",
        "System Audit ID",
        "Claimant Name",
        "College Enrollment ID",
        "Contact Phone",
        "Item Name",
        "Category",
        "Location Found",
        "Date Submitted",
        "Date Handed Over",
        "Handover Notes",
        "Verified By Admin ID",
    ])

    for c in verified_claims:
        student = db.query(User).filter(User.id == c.student_id).first()
        found = db.query(FoundReport).filter(FoundReport.id == c.found_report_id).first()

        writer.writerow([
            c.receipt_number or f"REC-{c.id[:6].upper()}",
            c.id,
            student.name if student else "N/A",
            student.college_id if student else "N/A",
            c.student_phone or "N/A",
            found.item_name if found else "Item",
            found.category if found else "Personal Property",
            found.location_found if found else "Security Desk",
            c.created_at.strftime("%Y-%m-%d %H:%M:%S") if c.created_at else "N/A",
            c.resolved_at.strftime("%Y-%m-%d %H:%M:%S") if c.resolved_at else "N/A",
            c.handover_notes or "Physical verification confirmed. Property released.",
            c.admin_id or "Security Desk",
        ])

    csv_data = output.getvalue()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"findback_handover_audit_{timestamp}.csv"

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
