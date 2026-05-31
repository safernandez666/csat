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


def test_create_tenant_rollback_on_seed_failure(tmp_data_dir, monkeypatch):
    """If mid-creation work fails, Company is marked 'failed', DB file removed,
    uploads dir removed, pool evicted, failure audit written."""
    from app.db.control_session import init_control_db, get_control_engine
    from app.core.engine_pool import init_pool, get_pool
    from app.services import tenant_provisioning
    from app.services.tenant_provisioning import create_tenant
    from app.models.control_plane import Company, TenantAuditLog
    from sqlalchemy.orm import Session
    import pytest
    init_control_db()
    init_pool(max_size=4)

    def boom(_ts):
        raise RuntimeError("simulated seed failure")
    monkeypatch.setattr(tenant_provisioning, "seed_database", boom)

    with pytest.raises(RuntimeError):
        create_tenant(slug="gamma", name="Gamma",
                      admin_email="a@b.c", admin_full_name="x", super_user_id=None)

    # Company should be marked "failed" (tombstone for forensics).
    with Session(get_control_engine()) as s:
        c = s.query(Company).filter_by(slug="gamma").one()
        assert c.status == "failed"
        # Failure audit was written.
        audits = s.query(TenantAuditLog).filter_by(company_id=c.id, action="company.create_failed").all()
        assert len(audits) == 1

    # DB file and uploads dir were removed.
    assert not os.path.exists(c.db_path)
    assert not os.path.isdir(os.path.join(tmp_data_dir["uploads_dir"], "gamma"))
    # Pool no longer holds the slug (evict is a no-op if already absent).
    # Re-eviction must not raise.
    get_pool().evict("gamma")


def test_reset_admin_password_targets_per_tenant_admin(tmp_data_dir):
    """reset_tenant_admin_password rotates the per-tenant admin, NOT a seed default."""
    from app.db.control_session import init_control_db, get_control_engine
    from app.core.engine_pool import init_pool, get_pool
    from app.services.tenant_provisioning import create_tenant, reset_tenant_admin_password
    from app.models.control_plane import Company
    from app.models.user import User
    from app.core.security import verify_password
    from sqlalchemy.orm import Session
    init_control_db()
    init_pool(max_size=4)

    created = create_tenant(slug="delta", name="Delta",
                            admin_email="admin@delta.test", admin_full_name="Delta Admin",
                            super_user_id=None)

    result = reset_tenant_admin_password("delta", super_user_id=None)
    # Returned email is the per-tenant admin (Fix 1 removes seed defaults).
    assert result["admin_email"] == "admin@delta.test"
    assert len(result["temp_password"]) >= 16

    # Verify the password was actually rotated: old one no longer works.
    with Session(get_control_engine()) as s:
        c = s.query(Company).filter_by(slug="delta").one()
    engine = get_pool().get_or_open(c)
    with Session(engine) as ts:
        admin = ts.query(User).filter_by(email="admin@delta.test").one()
        assert verify_password(result["temp_password"], admin.hashed_password)
        assert not verify_password(created["temp_password"], admin.hashed_password)
        # And: no @csat.local users remain.
        assert ts.query(User).filter(User.email.like("%@csat.local")).count() == 0
