"""Test that the login rate limiter is keyed per (tenant, IP), not just per IP."""


def _seed_two(tmp_data_dir, admin_client):
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
    tok = admin_client.post("/api/admin/auth/login", json={"email": "op@zebra.io", "password": "Op12345!"}).json()["access_token"]
    h = {"Authorization": f"Bearer {tok}"}
    for slug in ("acme", "beta"):
        admin_client.post("/api/admin/companies", headers=h, json={
            "slug": slug, "name": slug.title(),
            "admin_email": f"admin@{slug}.example", "admin_full_name": "x"})


def test_brute_on_acme_does_not_lock_beta(app, tmp_data_dir, admin_client):
    _seed_two(tmp_data_dir, admin_client)
    from fastapi.testclient import TestClient
    ca = TestClient(app, base_url="http://acme.csat.test")
    cb = TestClient(app, base_url="http://beta.csat.test")
    # Exhaust acme's per-IP, per-tenant budget.
    for _ in range(6):
        ca.post("/api/auth/login", json={"email": "x@x.com", "password": "wrong"})
    # acme: subsequent attempt rate-limited.
    r = ca.post("/api/auth/login", json={"email": "x@x.com", "password": "wrong"})
    assert r.status_code == 429
    # beta: untouched by the acme failures.
    rb = cb.post("/api/auth/login", json={"email": "x@x.com", "password": "wrong"})
    assert rb.status_code == 401
