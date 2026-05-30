def test_get_db_returns_tenant_session(app, tmp_data_dir):
    from app.db.control_session import init_control_db, get_control_engine
    from app.db.session import init_tenant_db
    from app.core.engine_pool import get_pool, init_pool
    from app.models.control_plane import Company
    from sqlalchemy.orm import Session
    from app.core.config import settings
    init_control_db()
    init_pool(max_size=settings.engine_pool_max_size)

    # Provision two tenants on disk by hand for this test.
    with Session(get_control_engine()) as s:
        for slug in ("acme", "beta"):
            c = Company(slug=slug, name=slug.title(),
                        db_path=str(tmp_data_dir["tenants_dir"] / f"{slug}.db"),
                        status="active")
            s.add(c)
        s.commit()
        companies = {c.slug: c for c in s.query(Company).all()}

    # Initialize the tenant DBs.
    for slug, c in companies.items():
        init_tenant_db(get_pool().get_or_open(c))

    # /api/branding/logo hits get_db; with no logo set it returns 404 — but
    # that 404 confirms the dep ran against the tenant DB (not crashed at
    # engine resolution).
    from fastapi.testclient import TestClient
    ca = TestClient(app, base_url="http://acme.csat.test")
    rb = TestClient(app, base_url="http://beta.csat.test")
    assert ca.get("/api/branding/logo").status_code == 404
    assert rb.get("/api/branding/logo").status_code == 404
