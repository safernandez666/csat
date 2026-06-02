def _seed_two_tenants(tmp_data_dir):
    """Provision two tenants with the seed admin user via direct DB writes."""
    from app.db.control_session import init_control_db, get_control_engine
    from app.db.session import init_tenant_db
    from app.core.engine_pool import get_pool
    from app.models.control_plane import Company
    from app.models.user import User, Role
    from app.core.security import hash_password
    from sqlalchemy.orm import Session

    init_control_db()
    with Session(get_control_engine()) as s:
        for slug in ("acme", "beta"):
            s.add(Company(slug=slug, name=slug.title(),
                          db_path=str(tmp_data_dir["tenants_dir"] / f"{slug}.db"),
                          status="active"))
        s.commit()
        companies = list(s.query(Company).all())

    for c in companies:
        engine = get_pool().get_or_open(c)
        init_tenant_db(engine)
        with Session(engine) as ts:
            role = Role(name="Admin", description="x", permissions=[])
            ts.add(role); ts.commit()
            u = User(email=f"admin@{c.slug}.test", hashed_password=hash_password("Pass123!"),
                    full_name="Admin", is_active=True)
            u.roles.append(role)
            ts.add(u); ts.commit()


def test_token_issued_for_acme_rejected_on_beta(app, tmp_data_dir):
    from app.core.engine_pool import init_pool
    from app.core.config import settings
    init_pool(max_size=settings.engine_pool_max_size)
    _seed_two_tenants(tmp_data_dir)
    from fastapi.testclient import TestClient

    ca = TestClient(app, base_url="http://acme.csat.test")
    r = ca.post("/api/auth/login", json={"email": "admin@acme.test", "password": "Pass123!"})
    assert r.status_code == 200, r.text
    token = r.json()["access_token"]

    # Present that token on the beta subdomain.
    rb = TestClient(app, base_url="http://beta.csat.test")
    me = rb.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 401


def test_token_with_no_tenant_claim_rejected(app, tmp_data_dir):
    from app.core.engine_pool import init_pool
    from app.core.config import settings
    init_pool(max_size=settings.engine_pool_max_size)
    _seed_two_tenants(tmp_data_dir)
    from app.core.security import create_access_token
    # Forge a token without the tenant claim.
    tok = create_access_token({"sub": "1"})  # no tenant
    from fastapi.testclient import TestClient
    ca = TestClient(app, base_url="http://acme.csat.test")
    me = ca.get("/api/auth/me", headers={"Authorization": f"Bearer {tok}"})
    assert me.status_code == 401


def test_admin_plane_token_round_trip(app, tmp_data_dir):
    """A super-admin-shaped token is accepted on the admin plane (via the
    proper /api/admin/auth/me endpoint).

    History: pre-Task-10 this probed /api/auth/me on admin plane to verify
    the tenant claim was honored without crossing planes. Task 10 added
    SuperUser + /api/admin/auth/me as the real admin probe, and a later
    middleware path guard now 404s tenant API paths on admin plane
    (test_tenant_middleware::test_admin_plane_blocks_tenant_api_paths
    covers that). This test was updated to use the modern admin endpoint.
    """
    from app.core.config import settings
    from app.core.engine_pool import init_pool
    from app.core.security import create_access_token, TENANT_ADMIN
    from app.db.control_session import init_control_db
    init_pool(max_size=settings.engine_pool_max_size)
    init_control_db()

    # Forge a SuperUser-shaped token. No real SuperUser exists, so we expect
    # 401 at the SuperUser lookup — what matters is we get PAST the tenant
    # check (no "Token does not match tenant" 401).
    tok = create_access_token({"sub": "1", "tenant": TENANT_ADMIN, "is_super": True})

    from fastapi.testclient import TestClient
    c = TestClient(app, base_url="http://admin.csat.test")
    r = c.get("/api/admin/auth/me", headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 401
    assert r.json().get("detail") != "Token does not match tenant"
