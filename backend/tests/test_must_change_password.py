def _provision_and_login(app, tmp_data_dir, admin_client):
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
    r = admin_client.post("/api/admin/auth/login", json={"email": "op@zebra.io", "password": "Op12345!"})
    tok = r.json()["access_token"]
    h = {"Authorization": f"Bearer {tok}"}
    c = admin_client.post("/api/admin/companies", headers=h, json={
        "slug": "acme", "name": "Acme",
        "admin_email": "admin@acme.example", "admin_full_name": "Acme Admin"})
    temp = c.json()["temp_password"]
    from fastapi.testclient import TestClient
    tc = TestClient(app, base_url="http://acme.csat.test")
    return tc, temp


def test_me_exposes_must_change_password_flag(app, tmp_data_dir, admin_client):
    tc, temp = _provision_and_login(app, tmp_data_dir, admin_client)
    login = tc.post("/api/auth/login", json={"email": "admin@acme.example", "password": temp})
    assert login.status_code == 200
    tok = login.json()["access_token"]
    me = tc.get("/api/auth/me", headers={"Authorization": f"Bearer {tok}"}).json()
    assert me["must_change_password"] is True


def test_change_password_clears_flag(app, tmp_data_dir, admin_client):
    tc, temp = _provision_and_login(app, tmp_data_dir, admin_client)
    login = tc.post("/api/auth/login", json={"email": "admin@acme.example", "password": temp})
    tok = login.json()["access_token"]
    h = {"Authorization": f"Bearer {tok}"}

    # Wrong current → 400
    r = tc.post("/api/auth/change-password", headers=h,
                json={"current_password": "wrong", "new_password": "NewPass123!"})
    assert r.status_code == 400

    # Correct → 200
    r = tc.post("/api/auth/change-password", headers=h,
                json={"current_password": temp, "new_password": "NewPass123!"})
    assert r.status_code == 200

    # /me flag is now false
    me = tc.get("/api/auth/me", headers=h).json()
    assert me["must_change_password"] is False

    # Old password no longer works
    bad = tc.post("/api/auth/login", json={"email": "admin@acme.example", "password": temp})
    assert bad.status_code == 401
    # New password works
    good = tc.post("/api/auth/login", json={"email": "admin@acme.example", "password": "NewPass123!"})
    assert good.status_code == 200


def test_change_password_rejects_short_password(app, tmp_data_dir, admin_client):
    tc, temp = _provision_and_login(app, tmp_data_dir, admin_client)
    login = tc.post("/api/auth/login", json={"email": "admin@acme.example", "password": temp})
    tok = login.json()["access_token"]
    h = {"Authorization": f"Bearer {tok}"}

    r = tc.post("/api/auth/change-password", headers=h,
                json={"current_password": temp, "new_password": "short"})
    assert r.status_code == 400
    assert "too short" in r.json()["detail"].lower()
