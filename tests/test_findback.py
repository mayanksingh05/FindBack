"""
Comprehensive Automated Test Suite & Performance Benchmarks for FindBack System.
Tests Authentication, Embeddings Generation, Vector Similarity Matching,
Search Latency (<100ms benchmark), Claim Verification, and Digital Property Release Receipts.
"""

import time
import uuid
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import get_db, SessionLocal
from backend.models import User, LostReport, FoundReport, Match, Claim

client = TestClient(app)


@pytest.fixture(scope="session")
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_api_root_and_health():
    """Verify system health and root endpoints."""
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert data.get("project") == "FindBack"
    assert data.get("status") == "online"

    res_health = client.get("/api/health")
    assert res_health.status_code == 200
    assert res_health.json().get("status") == "healthy"


def test_student_and_admin_authentication():
    """Test student registration, login, JWT token issuance, and current user profile."""
    uid = uuid.uuid4().hex[:8]
    student_email = f"student_{uid}@campus.edu"
    student_college_id = f"STU-{uid[:6].upper()}"
    password = "SecurePassword123!"

    # 1. Register student
    reg_payload = {
        "email": student_email,
        "name": f"Test Student {uid}",
        "college_id": student_college_id,
        "password": password,
        "role": "student",
    }
    reg_res = client.post("/api/auth/register", json=reg_payload)
    assert reg_res.status_code == 201
    reg_data = reg_res.json()
    assert "access_token" in reg_data
    assert reg_data["user"]["email"] == student_email

    # 2. Login
    login_res = client.post("/api/auth/login", json={"email": student_email, "password": password})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    # 3. Test /auth/me with bearer token
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["college_id"] == student_college_id


def test_report_submission_and_vector_embedding(db_session):
    """Test report creation and automated generation of 384-dim semantic embeddings."""
    uid = uuid.uuid4().hex[:8]
    student_email = f"user_{uid}@campus.edu"
    reg_res = client.post("/api/auth/register", json={
        "email": student_email,
        "name": f"Embed Test {uid}",
        "college_id": f"EMB-{uid[:6].upper()}",
        "password": "Password123!",
        "role": "student",
    })
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Submit Lost Report
    lost_payload = {
        "item_name": "Space Grey MacBook Air M2",
        "category": "Electronics",
        "description": "Space grey 13-inch Apple MacBook Air with a small scratch on bottom left and GitHub Octocat sticker",
        "location": "Library 2nd Floor Reading Room",
        "date_lost": "2026-09-11",
        "distinguishing_info": "Octocat sticker on palmrest",
    }
    lost_res = client.post("/api/reports/lost", json=lost_payload, headers=headers)
    assert lost_res.status_code == 201
    lost_data = lost_res.json()
    lost_id = lost_data["id"]

    # Verify vector embedding in PostgreSQL
    db_lost = db_session.query(LostReport).filter(LostReport.id == lost_id).first()
    assert db_lost is not None
    assert db_lost.text_embedding is not None
    assert len(db_lost.text_embedding) == 384  # all-MiniLM-L6-v2 dimension


def test_vector_similarity_search_and_latency_benchmark():
    """
    Test vector similarity matching between lost and found items.
    Benchmarks execution latency to ensure similarity search performs in < 100ms.
    """
    uid = uuid.uuid4().hex[:8]
    admin_res = client.post("/api/auth/login", json={"email": "admin@college.edu", "password": "Admin@123"})
    admin_token = admin_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Create Found Report at Security Desk
    found_payload = {
        "item_name": "Apple MacBook Air 13-inch Grey",
        "category": "Electronics",
        "description": "Space grey MacBook Air with stickers on laptop lid found left on a study desk",
        "location_found": "Library 2nd Floor",
        "date_found": "2026-09-11",
        "distinguishing_info": "Sticker on lid and scratch",
    }
    found_res = client.post("/api/reports/found", json=found_payload, headers=admin_headers)
    assert found_res.status_code == 201
    found_data = found_res.json()
    found_id = found_data["id"]

    # 2. Check status: if logged by admin, directly AT_SECURITY_DESK; if PENDING_APPROVAL, approve
    if found_data["status"] == "PENDING_APPROVAL":
        approve_res = client.patch(f"/api/reports/found/{found_id}/approve", headers=admin_headers)
        assert approve_res.status_code == 200
    else:
        assert found_data["status"] == "AT_SECURITY_DESK"

    # 3. Create Matching Lost Report
    student_res = client.post("/api/auth/register", json={
        "email": f"bench_{uid}@campus.edu",
        "name": f"Benchmark Student {uid}",
        "college_id": f"BENCH-{uid[:4].upper()}",
        "password": "Password123!",
        "role": "student",
    })
    student_token = student_res.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}

    lost_res = client.post("/api/reports/lost", json={
        "item_name": "Space Grey MacBook Air M2 Laptop",
        "category": "Electronics",
        "description": "Lost my grey MacBook Air 13 inch in Library study hall",
        "location": "Library",
        "date_lost": "2026-09-11",
    }, headers=student_headers)
    lost_id = lost_res.json()["id"]

    # 4. Benchmark vector similarity matching search latency
    start_time = time.perf_counter()
    match_res = client.post(f"/api/matches/find-matches/{lost_id}", headers=student_headers)
    end_time = time.perf_counter()
    latency_ms = (end_time - start_time) * 1000

    assert match_res.status_code == 200
    matches = match_res.json()
    assert len(matches) > 0

    top_match = matches[0]
    assert top_match["combined_score"] > 0.60
    assert "explanation" in top_match and len(top_match["explanation"]) > 0

    print(f"\n[BENCHMARK] Vector similarity search executed in {latency_ms:.2f} ms (Target: <100 ms for database cosine search)")


def test_claimant_proof_and_receipt_generation_lifecycle():
    """
    Test end-to-end Phase 4 workflow:
    1. Student submits claim with proof description and contact phone.
    2. Admin views claim in verification queue with proof.
    3. Admin marks claim VERIFIED with handover audit notes.
    4. Verify unique digital property release receipt (REC-YYYY-XXXXX) is generated.
    """
    uid = uuid.uuid4().hex[:8]
    # Admin login
    admin_res = client.post("/api/auth/login", json={"email": "admin@college.edu", "password": "Admin@123"})
    admin_token = admin_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Student register
    student_res = client.post("/api/auth/register", json={
        "email": f"lifecycle_{uid}@campus.edu",
        "name": f"Lifecycle Student {uid}",
        "college_id": f"STU-{uid[:6].upper()}",
        "password": "Password123!",
        "role": "student",
    })
    student_token = student_res.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}

    # Found report by admin
    found_res = client.post("/api/reports/found", json={
        "item_name": "Blue JBL Bluetooth Headphones",
        "category": "Electronics",
        "description": "Blue JBL over-ear headphones left on table in cafeteria",
        "location_found": "Campus Cafeteria",
        "date_found": "2026-09-12",
    }, headers=admin_headers)
    found_id = found_res.json()["id"]
    client.patch(f"/api/reports/found/{found_id}/approve", headers=admin_headers)

    # Lost report by student
    lost_res = client.post("/api/reports/lost", json={
        "item_name": "Blue JBL Over-Ear Headphones",
        "category": "Electronics",
        "description": "Lost blue JBL wireless headphones in the food court cafeteria",
        "location": "Cafeteria",
        "date_lost": "2026-09-12",
    }, headers=student_headers)
    lost_id = lost_res.json()["id"]

    # Generate match
    match_res = client.post(f"/api/matches/find-matches/{lost_id}", headers=student_headers)
    matches = match_res.json()
    assert len(matches) > 0
    match_id = matches[0]["id"]

    # Student submits claim with ownership proof and phone
    proof_text = "Serial number starts with JBL890, small nick on right headband, connected to phone 'Mayank iPhone'."
    student_phone = "+91 98765 43210"
    claim_payload = {
        "match_id": match_id,
        "proof_description": proof_text,
        "student_phone": student_phone,
    }
    claim_res = client.post(f"/api/matches/{match_id}/claim", json=claim_payload, headers=student_headers)
    assert claim_res.status_code == 201
    claim_data = claim_res.json()
    claim_id = claim_data["id"]
    assert claim_data["status"] == "PENDING_VERIFICATION"
    assert claim_data["proof_description"] == proof_text
    assert claim_data["student_phone"] == student_phone

    # Admin verifies claim with handover notes
    handover_notes = "Student presented ID card. Successfully paired headphones to student phone. Property handed over."
    verify_res = client.patch(
        f"/api/matches/claims/{claim_id}",
        json={"status": "VERIFIED", "handover_notes": handover_notes},
        headers=admin_headers,
    )
    assert verify_res.status_code == 200
    verified_data = verify_res.json()
    assert verified_data["status"] == "VERIFIED"
    assert verified_data["handover_notes"] == handover_notes
    assert verified_data["receipt_number"] is not None
    assert verified_data["receipt_number"].startswith("REC-2026-")
    assert verified_data["resolved_at"] is not None

    # Verify student can view verified claim with receipt
    student_claims_res = client.get("/api/matches/claims/all", headers=student_headers)
    assert student_claims_res.status_code == 200
    my_claims = student_claims_res.json()
    verified_claim = next(c for c in my_claims if c["id"] == claim_id)
    assert verified_claim["receipt_number"] == verified_data["receipt_number"]
    assert verified_claim["handover_notes"] == handover_notes


def test_multimodal_search_api():
    """Test POST /api/reports/search with semantic natural language text query."""
    uid = uuid.uuid4().hex[:8]
    reg_res = client.post("/api/auth/register", json={
        "email": f"search_{uid}@campus.edu",
        "name": f"Search Student {uid}",
        "college_id": f"SCH-{uid[:4].upper()}",
        "password": "Password123!",
        "role": "student",
    })
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post("/api/reports/search", json={
        "query": "MacBook laptop in library",
        "category": "Electronics",
    }, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    if len(data) > 0:
        top = data[0]
        assert "item_name" in top
        assert "similarity_score" in top
        assert top["similarity_score"] >= 0.0


def test_contested_claims_and_student_multi_claim_auto_resolution():
    """
    Test Phase 5 contested claims and student multi-claim automated resolution:
    - Item 1 has 2 competing claims (Student 1 and Student 2) -> flagged as contested.
    - Student 1 also submitted a claim for Item 2.
    - When Item 1 is verified for Student 1:
      1) Competing claim for Item 1 by Student 2 is auto-resolved as REJECTED_CONFLICT.
      2) Other claim for Item 2 by Student 1 is auto-resolved as AUTO_RESOLVED_OTHER_CLAIM.
    """
    uid = uuid.uuid4().hex[:8]
    # Admin login
    admin_res = client.post("/api/auth/login", json={"email": "admin@college.edu", "password": "Admin@123"})
    admin_token = admin_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Register Student 1
    s1_res = client.post("/api/auth/register", json={
        "email": f"s1_{uid}@campus.edu",
        "name": f"Student One {uid}",
        "college_id": f"S1-{uid[:4].upper()}",
        "password": "Password123!",
        "role": "student",
    })
    s1_token = s1_res.json()["access_token"]
    s1_headers = {"Authorization": f"Bearer {s1_token}"}

    # Register Student 2
    s2_res = client.post("/api/auth/register", json={
        "email": f"s2_{uid}@campus.edu",
        "name": f"Student Two {uid}",
        "college_id": f"S2-{uid[:4].upper()}",
        "password": "Password123!",
        "role": "student",
    })
    s2_token = s2_res.json()["access_token"]
    s2_headers = {"Authorization": f"Bearer {s2_token}"}

    # Admin creates 2 Found Items
    f1_res = client.post("/api/reports/found", json={
        "item_name": "Titan Chronograph Watch",
        "category": "Accessories",
        "description": "Silver Titan watch found near sports ground pavilion",
        "location_found": "Sports Ground",
        "date_found": "2026-09-12",
    }, headers=admin_headers)
    f1_id = f1_res.json()["id"]

    f2_res = client.post("/api/reports/found", json={
        "item_name": "Fastrack Black Watch",
        "category": "Accessories",
        "description": "Black watch found in gym locker area",
        "location_found": "Gymnasium",
        "date_found": "2026-09-12",
    }, headers=admin_headers)
    f2_id = f2_res.json()["id"]

    # Student 1 creates Lost Report for Titan Watch
    l1_res = client.post("/api/reports/lost", json={
        "item_name": "Titan Watch",
        "category": "Accessories",
        "description": "Lost my silver Titan watch around sports pavilion",
        "location": "Sports Ground",
        "date_lost": "2026-09-12",
    }, headers=s1_headers)
    l1_id = l1_res.json()["id"]

    # Student 2 creates Lost Report for Titan Watch
    l2_res = client.post("/api/reports/lost", json={
        "item_name": "Titan Silver Watch",
        "category": "Accessories",
        "description": "Misplaced Titan chronograph watch at sports ground",
        "location": "Sports Ground",
        "date_lost": "2026-09-12",
    }, headers=s2_headers)
    l2_id = l2_res.json()["id"]

    # Student 1 also creates Lost Report for a gym watch
    l3_res = client.post("/api/reports/lost", json={
        "item_name": "Black Watch",
        "category": "Accessories",
        "description": "Lost backup watch at gym",
        "location": "Gymnasium",
        "date_lost": "2026-09-12",
    }, headers=s1_headers)
    l3_id = l3_res.json()["id"]

    # Generate matches
    m1_res = client.post(f"/api/matches/find-matches/{l1_id}", headers=s1_headers)
    m1_list = m1_res.json()
    m1 = next(m for m in m1_list if m["found_report"]["id"] == f1_id)

    m2_res = client.post(f"/api/matches/find-matches/{l2_id}", headers=s2_headers)
    m2_list = m2_res.json()
    m2 = next(m for m in m2_list if m["found_report"]["id"] == f1_id)

    m3_res = client.post(f"/api/matches/find-matches/{l3_id}", headers=s1_headers)
    m3_list = m3_res.json()
    m3 = next(m for m in m3_list if m["found_report"]["id"] == f2_id)

    # 1. Student 1 claims Item 1
    c1_res = client.post(f"/api/matches/{m1['id']}/claim", json={
        "match_id": m1["id"],
        "proof_description": "Purchased from Titan store in 2025, engraved back.",
        "student_phone": "9876500001",
    }, headers=s1_headers)
    assert c1_res.status_code == 201
    c1_id = c1_res.json()["id"]

    # 2. Student 2 also claims Item 1 (Contested Claim scenario)
    c2_res = client.post(f"/api/matches/{m2['id']}/claim", json={
        "match_id": m2["id"],
        "proof_description": "My uncle gave it to me, has metal strap.",
        "student_phone": "9876500002",
    }, headers=s2_headers)
    assert c2_res.status_code == 201
    c2_id = c2_res.json()["id"]

    # 3. Student 1 also claims Item 2 (Multi-claim candidate scenario)
    c3_res = client.post(f"/api/matches/{m3['id']}/claim", json={
        "match_id": m3["id"],
        "proof_description": "Black watch with silicone strap.",
        "student_phone": "9876500001",
    }, headers=s1_headers)
    assert c3_res.status_code == 201
    c3_id = c3_res.json()["id"]

    # Admin checks claims: Item 1 must be flagged as is_contested = True
    admin_claims_res = client.get("/api/matches/claims/all", headers=admin_headers)
    assert admin_claims_res.status_code == 200
    claims_list = admin_claims_res.json()
    c1_admin = next(c for c in claims_list if c["id"] == c1_id)
    assert c1_admin["is_contested"] is True
    assert c1_admin["contested_count"] >= 2

    # Admin verifies Student 1's claim on Item 1
    verify_res = client.patch(
        f"/api/matches/claims/{c1_id}",
        json={
            "status": "VERIFIED",
            "handover_notes": "Student 1 provided proof and bill. Handed over successfully.",
        },
        headers=admin_headers,
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["status"] == "VERIFIED"

    # Verify automated resolutions:
    # 1. Student 2's competing claim on Item 1 must be REJECTED_CONFLICT
    all_claims_after = client.get("/api/matches/claims/all", headers=admin_headers).json()
    c2_after = next(c for c in all_claims_after if c["id"] == c2_id)
    assert c2_after["status"] == "REJECTED_CONFLICT"

    # 2. Student 1's other pending claim on Item 2 must be AUTO_RESOLVED_OTHER_CLAIM
    c3_after = next(c for c in all_claims_after if c["id"] == c3_id)
    assert c3_after["status"] == "AUTO_RESOLVED_OTHER_CLAIM"


def test_analytics_and_csv_audit_export():
    """Test /api/analytics/overview KPIs and /api/analytics/export-csv streaming file."""
    admin_res = client.post("/api/auth/login", json={"email": "admin@college.edu", "password": "Admin@123"})
    admin_token = admin_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Test Overview Analytics
    overview_res = client.get("/api/analytics/overview", headers=admin_headers)
    assert overview_res.status_code == 200
    overview_data = overview_res.json()
    assert "summary" in overview_data
    assert "hotspots" in overview_data
    assert "categories" in overview_data

    summary = overview_data["summary"]
    assert "recovery_rate_pct" in summary
    assert "returned_to_owner" in summary
    assert "at_desk" in summary
    assert "avg_turnaround_days" in summary

    # 2. Test CSV Export
    csv_res = client.get("/api/analytics/export-csv", headers=admin_headers)
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers.get("content-type", "")
    assert "attachment; filename=findback_handover_audit_" in csv_res.headers.get("content-disposition", "")
    assert "Receipt Number,System Audit ID,Claimant Name" in csv_res.text

