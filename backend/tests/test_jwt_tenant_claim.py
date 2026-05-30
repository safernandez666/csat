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
