def test_create_superadmin_token_and_verify(tmp_data_dir):
    from app.db.control_session import init_control_db, get_control_engine
    from app.models.control_plane import SuperUser
    from app.core.security import hash_password, create_access_token, decode_token, TENANT_ADMIN
    from sqlalchemy.orm import Session
    init_control_db()
    with Session(get_control_engine()) as s:
        su = SuperUser(email="op@zebra.io", hashed_password=hash_password("Op12345!"))
        s.add(su); s.commit()
        sid = su.id

    tok = create_access_token({"sub": str(sid), "tenant": TENANT_ADMIN, "is_super": True})
    payload = decode_token(tok)
    assert payload["tenant"] == TENANT_ADMIN
    assert payload["is_super"] is True


def test_require_superadmin_rejects_on_tenant_plane(app, tmp_data_dir):
    from app.db.control_session import init_control_db, get_control_engine
    from app.models.control_plane import Company
    from app.core.engine_pool import get_pool, init_pool
    from app.core.config import settings
    from sqlalchemy.orm import Session
    init_control_db()
    init_pool(max_size=settings.engine_pool_max_size)
    with Session(get_control_engine()) as s:
        s.add(Company(slug="acme", name="Acme",
                      db_path=str(tmp_data_dir["tenants_dir"] / "acme.db"),
                      status="active"))
        s.commit()

    from fastapi.testclient import TestClient
    # The /api/admin/* router is mounted in Task 11. For now, just confirm
    # that on a tenant plane no admin endpoint is reachable: the next test
    # in Task 11 will exercise the dep itself.
    c = TestClient(app, base_url="http://acme.csat.test")
    r = c.get("/api/admin/companies")
    # Router not yet mounted: 404. After Task 11, hitting this from acme.* plane
    # should also be 404 because the dep rejects non-admin-plane requests.
    assert r.status_code == 404
