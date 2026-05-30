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
    """A super-admin-shaped token issued on the admin plane must be accepted on the admin plane."""
    from app.core.config import settings
    from app.core.engine_pool import init_pool
    from app.core.security import create_access_token, TENANT_ADMIN
    from app.db.control_session import init_control_db, get_control_engine
    from app.db.session import init_tenant_db
    init_pool(max_size=settings.engine_pool_max_size)

    # Ensure the control DB exists so TenantMiddleware can route the admin plane.
    init_control_db()
    # Bootstrap the tenant schema on the control engine so the User query in
    # get_current_user finds an (empty) users table instead of raising OperationalError.
    # The SuperUser model arrives in Task 10; until then, the admin plane reuses the
    # regular User model against the control engine.
    init_tenant_db(get_control_engine())

    # Forge a token shaped like the one login() would issue on the admin plane.
    # We don't go through /api/auth/login here because the SuperUser model+endpoint
    # arrive in Tasks 10-11; we're testing only the issuance/enforcement contract.
    tok = create_access_token({"sub": "1", "tenant": TENANT_ADMIN})

    from fastapi.testclient import TestClient
    # admin.csat.test → middleware routes to admin plane → get_current_user expects __admin__.
    # But /api/auth/me requires a real User row; since no admin-plane user model exists yet,
    # we can't get a 200. Instead, assert we get past the tenant check (i.e. NOT the
    # "Token does not match tenant" 401) — the request should fail with "User inactive"
    # because user id=1 doesn't exist in the (empty) control plane users table.
    c = TestClient(app, base_url="http://admin.csat.test")
    r = c.get("/api/auth/me", headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 401
    # Crucially: not the cross-tenant 401.
    assert r.json().get("detail") != "Token does not match tenant"
