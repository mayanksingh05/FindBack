"""Database seeder with realistic college dummy data."""
from datetime import date, datetime, timezone, timedelta
from backend.database import SessionLocal
from backend.models import User, LostReport, FoundReport, Match, Notification
from backend.auth import hash_password


def seed_database():
    db = SessionLocal()
    try:
        print("[INFO] Seeding FindBack database...")

        # ── 1. Users ────────────────────────────────
        admin = db.query(User).filter(User.email == "admin@college.edu").first()
        if not admin:
            admin = User(
                college_id="ADM001",
                name="Campus Security Office",
                email="admin@college.edu",
                password_hash=hash_password("Admin@123"),
                role="admin",
            )
            db.add(admin)

        student1 = db.query(User).filter(User.email == "student1@college.edu").first()
        if not student1:
            student1 = User(
                college_id="0012026",
                name="Aarav Sharma",
                email="student1@college.edu",
                password_hash=hash_password("Student@123"),
                role="student",
            )
            db.add(student1)

        student2 = db.query(User).filter(User.email == "student2@college.edu").first()
        if not student2:
            student2 = User(
                college_id="0022026",
                name="Priya Patel",
                email="student2@college.edu",
                password_hash=hash_password("Student@123"),
                role="student",
            )
            db.add(student2)

        student3 = db.query(User).filter(User.email == "student3@college.edu").first()
        if not student3:
            student3 = User(
                college_id="0032026",
                name="Rohan Verma",
                email="student3@college.edu",
                password_hash=hash_password("Student@123"),
                role="student",
            )
            db.add(student3)

        db.commit()
        db.refresh(admin)
        db.refresh(student1)
        db.refresh(student2)
        db.refresh(student3)

        # ── 2. Lost Reports ────────────────────────────────
        today = date.today()
        yesterday = today - timedelta(days=1)
        two_days_ago = today - timedelta(days=2)

        lost1 = db.query(LostReport).filter(LostReport.report_number == "LST-1001").first()
        if not lost1:
            lost1 = LostReport(
                report_number="LST-1001",
                user_id=student1.id,
                category="Electronics & Gadgets",
                item_name="Boat Rockerz 450 Bluetooth Headphones",
                description="Matte blue wireless on-ear headphones with soft black ear cushions. Foldable design with Boat branding on sides.",
                location="Central Library 2nd Floor",
                date_lost=yesterday,
                distinguishing_info="Small scratch on left ear cup near volume buttons. White sticker residue on inner headband.",
                image_path=None,
                status="ACTIVE",
            )
            db.add(lost1)

        lost2 = db.query(LostReport).filter(LostReport.report_number == "LST-1002").first()
        if not lost2:
            lost2 = LostReport(
                report_number="LST-1002",
                user_id=student2.id,
                category="Books & Notebooks",
                item_name="Casio fx-991EX Scientific Calculator",
                description="Black scientific calculator with solar panel and protective slide cover. Casio branding visible.",
                location="Electronics Lab 3 (Block B)",
                date_lost=two_days_ago,
                distinguishing_info="Orange handwritten formula sticker inside the slide cover.",
                image_path=None,
                status="ACTIVE",
            )
            db.add(lost2)

        lost3 = db.query(LostReport).filter(LostReport.report_number == "LST-1003").first()
        if not lost3:
            lost3 = LostReport(
                report_number="LST-1003",
                user_id=student1.id,
                category="Water Bottles & Flasks",
                item_name="Milton Thermosteel 1000ml Flask",
                description="Matte black stainless steel insulated water bottle with red rubber carry loop on the cap.",
                location="Cafeteria Outdoor Seating",
                date_lost=yesterday,
                distinguishing_info="Dent on the lower steel rim.",
                image_path=None,
                status="ACTIVE",
            )
            db.add(lost3)

        db.commit()
        db.refresh(lost1)
        db.refresh(lost2)
        db.refresh(lost3)

        # ── 3. Found Reports ────────────────────────────────
        # Some submitted by admin (auto-approved), one by student3 (pending)
        found1 = db.query(FoundReport).filter(FoundReport.report_number == "FND-2001").first()
        if not found1:
            found1 = FoundReport(
                report_number="FND-2001",
                submitted_by=admin.id,
                category="Electronics & Gadgets",
                item_name="Blue Wireless Headset",
                description="Blue wireless over-ear headset with black padded ear cushions. Found on reading table.",
                location_found="Central Library 2nd Floor, Table 4",
                date_found=yesterday,
                image_path=None,
                status="AT_SECURITY_DESK",
                approved_by=admin.id,
                approved_at=datetime.now(timezone.utc),
            )
            db.add(found1)

        found2 = db.query(FoundReport).filter(FoundReport.report_number == "FND-2002").first()
        if not found2:
            found2 = FoundReport(
                report_number="FND-2002",
                submitted_by=admin.id,
                category="Books & Notebooks",
                item_name="Casio Scientific Calculator",
                description="Black Casio scientific calculator with protective cover. Found at workbench 7 after lab session.",
                location_found="Electronics Lab 3, Workbench 7",
                date_found=two_days_ago,
                image_path=None,
                status="AT_SECURITY_DESK",
                approved_by=admin.id,
                approved_at=datetime.now(timezone.utc),
            )
            db.add(found2)

        found3 = db.query(FoundReport).filter(FoundReport.report_number == "FND-2003").first()
        if not found3:
            found3 = FoundReport(
                report_number="FND-2003",
                submitted_by=admin.id,
                category="Umbrellas",
                item_name="Navy Blue Folding Umbrella",
                description="Compact 3-fold dark navy blue umbrella with push-button automatic open.",
                location_found="Main Auditorium Foyer",
                date_found=today,
                image_path=None,
                status="AT_SECURITY_DESK",
                approved_by=admin.id,
                approved_at=datetime.now(timezone.utc),
            )
            db.add(found3)

        # Student3 found a bottle but hasn't submitted it to desk yet (PENDING_APPROVAL)
        found4 = db.query(FoundReport).filter(FoundReport.report_number == "FND-2004").first()
        if not found4:
            found4 = FoundReport(
                report_number="FND-2004",
                submitted_by=student3.id,
                category="Water Bottles & Flasks",
                item_name="Black Steel Water Bottle",
                description="Black 1L insulated thermos with red grip strap. Found on cafeteria lunch table after 2pm.",
                location_found="Cafeteria Table 12",
                date_found=yesterday,
                image_path=None,
                status="PENDING_APPROVAL",
            )
            db.add(found4)

        db.commit()
        db.refresh(found1)
        db.refresh(found2)

        # ── 3b. Generate Embeddings for Seeded Reports ────────────────
        from backend.embeddings import embedding_service
        from backend.matching import run_matching_for_lost_report

        for r in [lost1, lost2, lost3]:
            if r.text_embedding is None:
                text = embedding_service.build_item_text(
                    r.item_name, r.category, r.description, r.distinguishing_info, r.location
                )
                r.text_embedding = embedding_service.generate_text_embedding(text)

        for r in [found1, found2, found3, found4]:
            if r.text_embedding is None:
                text = embedding_service.build_item_text(
                    r.item_name, r.category, r.description, location=r.location_found
                )
                r.text_embedding = embedding_service.generate_text_embedding(text)

        db.commit()

        # ── 4. Compute AI Matches ────────────────────────────────
        run_matching_for_lost_report(lost1.id, db)
        run_matching_for_lost_report(lost2.id, db)

        # ── 5. Notifications ────────────────────────────────
        notif1 = db.query(Notification).filter(
            Notification.user_id == student1.id, Notification.type == "MATCH_FOUND"
        ).first()
        if not notif1:
            db.add(Notification(
                user_id=student1.id,
                type="MATCH_FOUND",
                title="Potential Match Found (88%)",
                message="An item matching your 'Boat Rockerz 450 Headphones' was found at Central Library. Review the match and submit a verification request.",
                reference_type="MATCH",
            ))

        notif2 = db.query(Notification).filter(
            Notification.user_id == student2.id, Notification.type == "MATCH_FOUND"
        ).first()
        if not notif2:
            db.add(Notification(
                user_id=student2.id,
                type="MATCH_FOUND",
                title="Potential Match Found (92%)",
                message="An item matching your 'Casio fx-991EX Calculator' was found at Electronics Lab 3.",
                reference_type="MATCH",
            ))

        # Admin notification for student3's pending found report
        notif3 = db.query(Notification).filter(
            Notification.user_id == admin.id, Notification.type == "FOUND_ITEM_SUBMITTED"
        ).first()
        if not notif3:
            db.add(Notification(
                user_id=admin.id,
                type="FOUND_ITEM_SUBMITTED",
                title="New Found Item Submission",
                message="Rohan Verma (0032026) reported finding a 'Black Steel Water Bottle' at Cafeteria Table 12. Approve once item is received at desk.",
                reference_type="FOUND_REPORT",
            ))

        db.commit()
        print("[SUCCESS] Database seeded with demo accounts and campus items!")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seeding failed: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
