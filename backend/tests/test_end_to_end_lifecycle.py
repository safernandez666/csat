def test_end_to_end(app, tmp_data_dir, admin_client):
    """Full lifecycle: super-admin creates tenant, tenant admin logs in,
    changes password, sees seeded controls, super-admin suspends, tenant 404s."""
    from app.db.control_session import init_control_db, get_control_engine
    from app.core.engine_pool import init_pool
    from app.models.control_plane import SuperUser
    from app.core.security import hash_password
    from sqlalchemy.orm import Session
    from fastapi.testclient import TestClient
    init_control_db()
    init_pool(max_size=4)

    with Session(get_control_engine()) as s:
        s.add(SuperUser(email="op@zebra.io", hashed_password=hash_password("Op12345!")))
        s.commit()

    # 1. Super-admin login
    su = admin_client.post("/api/admin/auth/login", json={"email": "op@zebra.io", "password": "Op12345!"})
    assert su.status_code == 200
    sh = {"Authorization": f"Bearer {su.json()['access_token']}"}

    # 2. Create tenant
    r = admin_client.post("/api/admin/companies", headers=sh, json={
        "slug": "acme", "name": "Acme",
        "admin_email": "admin@acme.example", "admin_full_name": "Admin"})
    assert r.status_code == 201
    temp = r.json()["temp_password"]

    # 3. Tenant admin login on the subdomain
    tc = TestClient(app, base_url="http://acme.csat.test")
    login = tc.post("/api/auth/login", json={"email": "admin@acme.example", "password": temp})
    assert login.status_code == 200
    ut = login.json()["access_token"]
    uh = {"Authorization": f"Bearer {ut}"}

    # 4. /me reports must_change_password
    me = tc.get("/api/auth/me", headers=uh).json()
    assert me["must_change_password"] is True

    # 5. Change password
    cp = tc.post("/api/auth/change-password", headers=uh,
                 json={"current_password": temp, "new_password": "MyNewPass1!"})
    assert cp.status_code == 200

    # 6. Controls are seeded (18 of them)
    cs = tc.get("/api/controls", headers=uh)
    assert cs.status_code == 200
    assert len(cs.json()) == 18

    # 7. Super-admin suspends
    admin_client.post("/api/admin/companies/acme/suspend", headers=sh)

    # 8. Tenant subdomain now returns 404 for /health (middleware-level reject)
    assert tc.get("/health").status_code == 404
