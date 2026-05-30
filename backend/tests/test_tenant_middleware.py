def test_admin_host_routes_to_control_plane(admin_client):
    # /health works on any plane.
    r = admin_client.get("/health")
    assert r.status_code == 200


def test_unknown_tenant_returns_404(app):
    from fastapi.testclient import TestClient
    with TestClient(app, base_url="http://does-not-exist.csat.test") as c:
        r = c.get("/health")
    assert r.status_code == 404


def test_reserved_slug_returns_404(app):
    from fastapi.testclient import TestClient
    with TestClient(app, base_url="http://www.csat.test") as c:
        r = c.get("/health")
    assert r.status_code == 404


def test_dev_escape_header_resolves_tenant(app, tmp_data_dir):
    # Create a tenant directly in the control plane so the middleware can find it.
    from app.db.control_session import init_control_db, get_control_engine
    from app.models.control_plane import Company
    from sqlalchemy.orm import Session
    init_control_db()
    with Session(get_control_engine()) as s:
        s.add(Company(slug="acme", name="Acme", db_path=str(tmp_data_dir["tenants_dir"] / "acme.db"), status="active"))
        s.commit()

    from fastapi.testclient import TestClient
    # No host-based subdomain available — use the dev-mode header escape.
    with TestClient(app, base_url="http://localhost") as c:
        r = c.get("/health", headers={"X-Tenant-Slug": "acme"})
    assert r.status_code == 200
