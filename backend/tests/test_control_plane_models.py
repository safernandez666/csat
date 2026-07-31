from datetime import datetime
import pytest


def test_company_round_trip(tmp_data_dir):
    from app.db.control_session import init_control_db, get_control_engine
    from app.models.control_plane import Company
    from sqlalchemy.orm import Session

    init_control_db()
    engine = get_control_engine()
    with Session(engine) as s:
        c = Company(slug="acme", name="Acme Corp", db_path="data/tenants/acme.db", status="active")
        s.add(c)
        s.commit()
        got = s.query(Company).filter_by(slug="acme").one()
        assert got.id is not None
        assert got.status == "active"
        assert got.suspended_at is None
        assert isinstance(got.created_at, datetime)


def test_superuser_unique_email(tmp_data_dir):
    from app.db.control_session import init_control_db, get_control_engine
    from app.models.control_plane import SuperUser
    from sqlalchemy.orm import Session
    from sqlalchemy.exc import IntegrityError

    init_control_db()
    engine = get_control_engine()
    with Session(engine) as s:
        s.add(SuperUser(email="op@zebrasecurity.io", hashed_password="x"))
        s.commit()
        s.add(SuperUser(email="op@zebrasecurity.io", hashed_password="y"))
        with pytest.raises(IntegrityError):
            s.commit()
        s.rollback()


def test_audit_log_records_action(tmp_data_dir):
    from app.db.control_session import init_control_db, get_control_engine
    from app.models.control_plane import SuperUser, TenantAuditLog
    from sqlalchemy.orm import Session

    init_control_db()
    engine = get_control_engine()
    with Session(engine) as s:
        su = SuperUser(email="op@zebrasecurity.io", hashed_password="x")
        s.add(su); s.commit()
        s.add(TenantAuditLog(
            super_user_id=su.id, company_id=None,
            action="company.create",
            metadata_={"slug": "acme"},
        ))
        s.commit()
        rows = s.query(TenantAuditLog).all()
        assert len(rows) == 1
        assert rows[0].action == "company.create"
        assert rows[0].metadata_["slug"] == "acme"
