import os


def _seed_tenant_with_admin_login(app, admin_client, tmp_data_dir, slug):
    from app.db.control_session import init_control_db, get_control_engine
    from app.core.engine_pool import init_pool
    from app.models.control_plane import SuperUser
    from app.core.security import hash_password
    from sqlalchemy.orm import Session

    init_control_db()
    init_pool(max_size=4)
    with Session(get_control_engine()) as s:
        if not s.query(SuperUser).first():
            s.add(SuperUser(email="op@zebra.io", hashed_password=hash_password("Op12345!")))
            s.commit()

    tok = admin_client.post(
        "/api/admin/auth/login",
        json={"email": "op@zebra.io", "password": "Op12345!"},
    ).json()["access_token"]
    h = {"Authorization": f"Bearer {tok}"}

    c = admin_client.post(
        "/api/admin/companies",
        headers=h,
        json={
            "slug": slug,
            "name": slug.title(),
            "admin_email": f"admin@{slug}.example",
            "admin_full_name": "x",
        },
    )
    assert c.status_code == 201, c.text
    temp = c.json()["temp_password"]

    from fastapi.testclient import TestClient

    tc = TestClient(app, base_url=f"http://{slug}.csat.test")
    login = tc.post(
        "/api/auth/login",
        json={"email": f"admin@{slug}.example", "password": temp},
    )
    assert login.status_code == 200, login.text
    user_tok = login.json()["access_token"]
    return tc, {"Authorization": f"Bearer {user_tok}"}


def test_upload_path_isolated_per_tenant(app, tmp_data_dir, admin_client):
    tc_a, ha = _seed_tenant_with_admin_login(app, admin_client, tmp_data_dir, "acme")

    # Fetch first control via the real route: GET /api/controls
    r = tc_a.get("/api/controls", headers=ha)
    assert r.status_code == 200, r.text
    control_id = r.json()[0]["id"]

    # Upload evidence: POST /api/evidence with control_id as form field and file as file field
    files = {"file": ("note.txt", b"hello acme", "text/plain")}
    data = {"control_id": str(control_id)}
    up = tc_a.post("/api/evidence", headers=ha, files=files, data=data)
    assert up.status_code in (200, 201), up.text

    # File must land under uploads/acme/, not under uploads/ root
    acme_dir = os.path.join(str(tmp_data_dir["uploads_dir"]), "acme")
    assert os.path.isdir(acme_dir), f"Expected tenant subdir {acme_dir} to exist"
    files_on_disk = os.listdir(acme_dir)
    assert files_on_disk, "Expected at least one file in tenant upload subdir"
    assert any(
        open(os.path.join(acme_dir, f), "rb").read() == b"hello acme"
        for f in files_on_disk
    ), "Uploaded content not found in tenant subdir"


def test_path_traversal_in_upload_filename_rejected(app, tmp_data_dir, admin_client):
    tc, h = _seed_tenant_with_admin_login(app, admin_client, tmp_data_dir, "acme")
    # The /uploads/{filename} handler must reject ../ traversal attempts
    r = tc.get("/uploads/../control.db", headers=h)
    assert r.status_code in (400, 404)


def test_cross_tenant_file_access_rejected(app, tmp_data_dir, admin_client):
    """Tenant B authenticated on its own subdomain must not be able to read
    tenant A's evidence files via `/uploads/<filename>`.

    The `get_upload` handler scopes `base` to `upload_dir/<requestor-slug>`,
    so an acme-owned file is unreachable from a beta-authenticated request
    even when the attacker knows the exact filename.
    """
    # Tenant A: upload a file
    tc_a, ha = _seed_tenant_with_admin_login(app, admin_client, tmp_data_dir, "acme2")
    r = tc_a.get("/api/controls", headers=ha)
    assert r.status_code == 200
    control_id = r.json()[0]["id"]
    up = tc_a.post(
        "/api/evidence",
        headers=ha,
        files={"file": ("secret.txt", b"acme2 secret", "text/plain")},
        data={"control_id": str(control_id)},
    )
    assert up.status_code in (200, 201), up.text

    # Recover the on-disk filename to use it in the cross-tenant attempt
    acme_dir = os.path.join(str(tmp_data_dir["uploads_dir"]), "acme2")
    fname = os.listdir(acme_dir)[0]

    # Tenant B: provision separately, then try to fetch acme2's file
    tc_b, hb = _seed_tenant_with_admin_login(app, admin_client, tmp_data_dir, "beta2")

    # Directly by filename (handler scopes base to /uploads/beta2 → 404)
    r1 = tc_b.get(f"/uploads/{fname}", headers=hb)
    assert r1.status_code == 404, r1.text

    # Or by guessing the full slug path (still resolves under /uploads/beta2/acme2/...
    # which doesn't exist → 404; relative_to() does not raise because the path
    # stays inside the beta2 base)
    r2 = tc_b.get(f"/uploads/acme2/{fname}", headers=hb)
    assert r2.status_code == 404, r2.text
