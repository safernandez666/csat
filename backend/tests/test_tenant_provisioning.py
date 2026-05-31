import os


def test_create_tenant_initialises_db_seeds_and_admin(tmp_data_dir):
    from app.db.control_session import init_control_db, get_control_engine
    from app.core.engine_pool import init_pool
    from app.services.tenant_provisioning import create_tenant
    from app.models.control_plane import Company
    from app.models.user import User, Role
    from app.models.control import Control
    from sqlalchemy.orm import Session
    init_control_db()
    init_pool(max_size=4)

    result = create_tenant(slug="acme", name="Acme Corp",
                           admin_email="admin@acme.test", admin_full_name="Acme Admin",
                           super_user_id=None)
    assert result["slug"] == "acme"
    assert result["temp_password"]
    assert len(result["temp_password"]) >= 16
    assert os.path.exists(result["db_path"])
    assert os.path.exists(os.path.join(tmp_data_dir["uploads_dir"], "acme"))

    with Session(get_control_engine()) as s:
        c = s.query(Company).filter_by(slug="acme").one()
        assert c.status == "active"

    from app.core.engine_pool import get_pool
    engine = get_pool().get_or_open(c)
    with Session(engine) as ts:
        controls = ts.query(Control).all()
        assert len(controls) == 18
        admin = ts.query(User).filter_by(email="admin@acme.test").one()
        roles = [r.name for r in admin.roles]
        assert "Admin" in roles
        # assert admin.must_change_password is True  # re-enable after Task 14


def test_create_tenant_rejects_invalid_slug(tmp_data_dir):
    from app.db.control_session import init_control_db
    from app.core.engine_pool import init_pool
    from app.services.tenant_provisioning import create_tenant
    init_control_db()
    init_pool(max_size=4)
    import pytest
    with pytest.raises(ValueError):
        create_tenant(slug="admin", name="x", admin_email="a@b.c", admin_full_name="x", super_user_id=None)
    with pytest.raises(ValueError):
        create_tenant(slug="UPPER", name="x", admin_email="a@b.c", admin_full_name="x", super_user_id=None)


def test_suspend_then_activate(tmp_data_dir):
    from app.db.control_session import init_control_db, get_control_engine
    from app.core.engine_pool import init_pool
    from app.services.tenant_provisioning import create_tenant, suspend_tenant, activate_tenant
    from app.models.control_plane import Company
    from sqlalchemy.orm import Session
    init_control_db()
    init_pool(max_size=4)

    create_tenant(slug="beta", name="Beta", admin_email="a@b.c", admin_full_name="x", super_user_id=None)
    suspend_tenant("beta", super_user_id=None)
    with Session(get_control_engine()) as s:
        assert s.query(Company).filter_by(slug="beta").one().status == "suspended"
    activate_tenant("beta", super_user_id=None)
    with Session(get_control_engine()) as s:
        assert s.query(Company).filter_by(slug="beta").one().status == "active"
