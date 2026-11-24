import os
import sys
sys.path.insert(0, '.')

from backend.database import SessionLocal, engine, Base
from backend.models import User, LostReport, FoundReport, Match, Claim, Notification
from backend.seed import seed_database

def reset_all():
    db = SessionLocal()
    print("[RESET] Truncating dynamic transactional tables (claims, matches, notifications, reports)...")
    db.query(Claim).delete()
    db.query(Match).delete()
    db.query(Notification).delete()
    db.query(LostReport).delete()
    db.query(FoundReport).delete()
    db.commit()
    db.close()

    print("[RESET] Re-seeding database with images and clean matching...")
    seed_database()

    # Re-align notifications for student1
    db2 = SessionLocal()
    student1 = db2.query(User).filter(User.email == "student1@college.edu").first()
    lost_ids = [lr.id for lr in db2.query(LostReport.id).filter(LostReport.user_id == student1.id).all()]
    matches = db2.query(Match).filter(Match.lost_report_id.in_(lost_ids)).all()
    match_ids = {m.id for m in matches}
    notifs = db2.query(Notification).filter(Notification.user_id == student1.id).all()
    for n in notifs:
        if n.reference_id not in match_ids:
            db2.delete(n)
    db2.commit()

    print(f"[RESET COMPLETE] Student1 has {len(matches)} active matches and {db2.query(Notification).filter(Notification.user_id == student1.id).count()} notifications.")
    db2.close()

if __name__ == "__main__":
    reset_all()
