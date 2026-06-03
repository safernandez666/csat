def _login(admin_client, tmp_data_dir):
    from app.db.control_session import init_control_db, get_control_engine
    from app.models.control_plane import SuperUser
    from app.core.security import hash_password
    from sqlalchemy.orm import Session
    init_control_db()
    with Session(get_control_engine()) as s:
        if not s.query(SuperUser).first():
            s.add(SuperUser(email="op@zebra.io", hashed_password=hash_password("Op12345!")))
            s.commit()
    r = admin_client.post("/api/admin/auth/login", json={"email": "op@zebra.io", "password": "Op12345!"})
    return r.json()["access_token"]


def test_create_list_get_company(admin_client, tmp_data_dir):
    from app.core.engine_pool import init_pool
    init_pool(max_size=4)
    tok = _login(admin_client, tmp_data_dir)
    h = {"Authorization": f"Bearer {tok}"}

    r = admin_client.post("/api/admin/companies", headers=h, json={
        "slug": "acme", "name": "Acme Corp",
        "admin_email": "admin@acme.example", "admin_full_name": "Acme Admin",
    })
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["slug"] == "acme"
    assert body["temp_password"]

    lst = admin_client.get("/api/admin/companies", headers=h).json()
    slugs = [c["slug"] for c in lst]
    assert "acme" in slugs

    detail = admin_client.get("/api/admin/companies/acme", headers=h).json()
    assert detail["slug"] == "acme"
    assert detail["status"] == "active"


def test_suspend_makes_tenant_404(admin_client, tmp_data_dir, app):
    from app.core.engine_pool import init_pool
    init_pool(max_size=4)
    tok = _login(admin_client, tmp_data_dir)
    h = {"Authorization": f"Bearer {tok}"}
    admin_client.post("/api/admin/companies", headers=h, json={
        "slug": "acme", "name": "Acme", "admin_email": "a@b.c", "admin_full_name": "x"})

    from fastapi.testclient import TestClient
    ca = TestClient(app, base_url="http://acme.csat.test")
    assert ca.get("/health").status_code == 200

    admin_client.post("/api/admin/companies/acme/suspend", headers=h)
    assert ca.get("/health").status_code == 404


def test_admin_reset_returns_new_temp_password(admin_client, tmp_data_dir):
    from app.core.engine_pool import init_pool
    init_pool(max_size=4)
    tok = _login(admin_client, tmp_data_dir)
    h = {"Authorization": f"Bearer {tok}"}
    admin_client.post("/api/admin/companies", headers=h, json={
        "slug": "acme", "name": "Acme", "admin_email": "a@b.c", "admin_full_name": "x"})
    r = admin_client.post("/api/admin/companies/acme/admin-reset", headers=h)
    assert r.status_code == 200
    assert r.json()["temp_password"]


def test_delete_company_removes_db_uploads_row_and_audit_company_id(admin_client, tmp_data_dir, app):
    from app.core.engine_pool import init_pool
    from app.db.control_session import get_control_engine
    from app.models.control_plane import Company, TenantAuditLog
    from sqlalchemy.orm import Session
    init_pool(max_size=4)
    tok = _login(admin_client, tmp_data_dir)
    h = {"Authorization": f"Bearer {tok}"}

    admin_client.post("/api/admin/companies", headers=h, json={
        "slug": "todelete", "name": "ToDelete", "admin_email": "a@b.c", "admin_full_name": "x"})

    db_path = tmp_data_dir["tenants_dir"] / "todelete.db"
    uploads_dir = tmp_data_dir["uploads_dir"] / "todelete"
    assert db_path.exists(), "tenant DB should exist after create"
    assert uploads_dir.is_dir(), "tenant uploads dir should exist after create"

    with Session(get_control_engine()) as s:
        company_id = s.query(Company).filter_by(slug="todelete").first().id
        # The create + admin-reset audit logs should reference the company_id
        pre_audits = s.query(TenantAuditLog).filter_by(company_id=company_id).count()
        assert pre_audits >= 1

    r = admin_client.delete("/api/admin/companies/todelete", headers=h)
    assert r.status_code == 200, r.text
    assert r.json()["slug"] == "todelete"

    assert not db_path.exists(), "tenant DB should be removed"
    assert not uploads_dir.exists(), "tenant uploads dir should be removed"

    with Session(get_control_engine()) as s:
        assert s.query(Company).filter_by(slug="todelete").first() is None
        # Audit logs preserved but company_id nulled
        orphaned = s.query(TenantAuditLog).filter_by(company_id=company_id).count()
        assert orphaned == 0

    # Subdomain now 404s
    from fastapi.testclient import TestClient
    tc = TestClient(app, base_url="http://todelete.csat.test")
    assert tc.get("/health").status_code == 404


def test_delete_missing_company_returns_404(admin_client, tmp_data_dir):
    from app.core.engine_pool import init_pool
    init_pool(max_size=4)
    tok = _login(admin_client, tmp_data_dir)
    h = {"Authorization": f"Bearer {tok}"}
    r = admin_client.delete("/api/admin/companies/nonexistent", headers=h)
    assert r.status_code == 404
