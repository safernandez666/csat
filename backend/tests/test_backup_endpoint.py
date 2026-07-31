import os
import tarfile


def _setup(admin_client, tmp_data_dir):
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
    admin_client.post("/api/admin/companies", headers=h, json={
        "slug": "acme", "name": "Acme", "admin_email": "a@b.c", "admin_full_name": "x"})
    return h


def test_backup_endpoint_creates_archive(admin_client, tmp_data_dir):
    h = _setup(admin_client, tmp_data_dir)
    r = admin_client.post("/api/admin/companies/acme/backup", headers=h)
    assert r.status_code == 200, r.text
    archive = r.json()["archive_path"]
    assert os.path.exists(archive)
    with tarfile.open(archive) as t:
        names = t.getnames()
        assert any(n.endswith("acme.db") for n in names)
