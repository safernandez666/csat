"""End-to-end tenant lifecycle helpers used by the super-admin API."""
from __future__ import annotations

import os
import secrets
import shutil
import tarfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from sqlalchemy.orm import Session

from app.core import config as _config
from app.core.engine_pool import get_pool
from app.core.tenant import validate_slug
from app.db.control_session import get_control_engine
from app.db.session import init_tenant_db
from app.models.control_plane import Company
from app.models.user import User, Role
from app.utils.seed import seed_database
from app.core.security import hash_password
from app.services.tenant_audit import log_super_action


def _tenant_db_path(slug: str) -> str:
    return str(Path(_config.settings.tenants_dir) / f"{slug}.db")


def _tenant_uploads_dir(slug: str) -> str:
    return str(Path(_config.settings.upload_dir) / slug)


def create_tenant(slug: str, name: str, admin_email: str, admin_full_name: str,
                  super_user_id: Optional[int]) -> dict:
    if not validate_slug(slug):
        raise ValueError(f"Invalid slug: {slug!r}")

    db_path = _tenant_db_path(slug)
    uploads_path = _tenant_uploads_dir(slug)

    with Session(get_control_engine()) as cs:
        if cs.query(Company).filter_by(slug=slug).first():
            raise ValueError(f"Tenant {slug!r} already exists")
        company = Company(slug=slug, name=name, db_path=db_path, status="active")
        cs.add(company)
        cs.commit()
        cs.refresh(company)
        company_id = company.id

    try:
        os.makedirs(Path(db_path).parent, exist_ok=True)
        os.makedirs(uploads_path, exist_ok=True)
        engine = get_pool().get_or_open(_DuckCompany(slug, db_path))
        init_tenant_db(engine)
        temp_password = secrets.token_urlsafe(16)
        with Session(engine) as ts:
            seed_database(ts)
            # SaaS provisioning: remove the well-known default users that seed_database
            # creates (admin@csat.local et al) — those are dev-only and would be backdoors
            # in a multi-tenant deployment.
            default_users = ts.query(User).filter(User.email.like("%@csat.local")).all()
            for u in default_users:
                ts.delete(u)
            ts.flush()
            admin_role = ts.query(Role).filter_by(name="Admin").first()
            if admin_role is None:
                raise RuntimeError("Admin role missing after seed")
            user = User(
                email=admin_email, hashed_password=hash_password(temp_password),
                full_name=admin_full_name, is_active=True,
            )
            user.roles.append(admin_role)
            # must_change_password set in Task 14; harmless if column not yet added.
            if hasattr(User, "must_change_password"):
                user.must_change_password = True
            ts.add(user)
            ts.commit()
        log_super_action("company.create", super_user_id, company_id, {"slug": slug})
        return {"slug": slug, "db_path": db_path, "admin_email": admin_email, "temp_password": temp_password}
    except Exception:
        # Best-effort rollback
        with Session(get_control_engine()) as cs:
            c = cs.query(Company).filter_by(slug=slug).first()
            if c:
                c.status = "failed"
                cs.commit()
        try:
            if os.path.exists(db_path):
                os.remove(db_path)
        except OSError:
            pass
        get_pool().evict(slug)  # drop the cached engine, file is gone
        try:
            if os.path.isdir(uploads_path):
                shutil.rmtree(uploads_path, ignore_errors=True)
        except OSError:
            pass
        log_super_action("company.create_failed", super_user_id, company_id, {"slug": slug})
        raise


def suspend_tenant(slug: str, super_user_id: Optional[int]) -> None:
    with Session(get_control_engine()) as cs:
        c = cs.query(Company).filter_by(slug=slug).first()
        if not c:
            raise LookupError(slug)
        c.status = "suspended"
        c.suspended_at = datetime.now(timezone.utc)
        company_id = c.id
        cs.commit()
    get_pool().evict(slug)
    log_super_action("company.suspend", super_user_id, company_id, {"slug": slug})


def activate_tenant(slug: str, super_user_id: Optional[int]) -> None:
    with Session(get_control_engine()) as cs:
        c = cs.query(Company).filter_by(slug=slug).first()
        if not c:
            raise LookupError(slug)
        c.status = "active"
        c.suspended_at = None
        company_id = c.id
        cs.commit()
    log_super_action("company.activate", super_user_id, company_id, {"slug": slug})


def reset_tenant_admin_password(slug: str, super_user_id: Optional[int]) -> dict:
    with Session(get_control_engine()) as cs:
        c = cs.query(Company).filter_by(slug=slug).first()
        if not c:
            raise LookupError(slug)
        # Capture scalar fields while session is open — avoids DetachedInstanceError.
        db_path = c.db_path
        company_id = c.id
    engine = get_pool().get_or_open(_DuckCompany(slug, db_path))
    with Session(engine) as ts:
        admin_role = ts.query(Role).filter_by(name="Admin").first()
        admin = (ts.query(User)
                   .join(User.roles).filter(Role.id == admin_role.id)
                   .order_by(User.id.asc()).first())
        if not admin:
            raise LookupError(f"no admin user in {slug}")
        new_pw = secrets.token_urlsafe(16)
        admin.hashed_password = hash_password(new_pw)
        if hasattr(User, "must_change_password"):
            admin.must_change_password = True
        admin_email = admin.email  # capture before session close
        ts.commit()
    log_super_action("admin.reset_password", super_user_id, company_id, {"slug": slug})
    return {"admin_email": admin_email, "temp_password": new_pw}


class _DuckCompany:
    """Minimal shape EnginePool.get_or_open expects.

    Used before the Company row is reattached to a session.
    """
    def __init__(self, slug: str, db_path: str):
        self.slug = slug
        self.db_path = db_path


def snapshot_tenant(slug: str, backups_dir: str = "./backups") -> dict:
    """Produce a tar.gz of <slug>.db + uploads/<slug>/.

    Returns dict with `archive_path` (absolute) and `company_id`.

    NOTE: This is a file-level copy, not a SQLite-native backup. If the
    tenant has active write traffic at the moment of `tar.add`, the
    archive may capture a transiently inconsistent DB. For a
    crash-consistent snapshot, suspend the tenant first (which evicts
    its engine and closes connections) before invoking this helper.
    """
    backups_dir = os.path.abspath(backups_dir)
    with Session(get_control_engine()) as cs:
        c = cs.query(Company).filter_by(slug=slug).first()
        if not c:
            raise LookupError(slug)
        db_path = c.db_path
        company_id = c.id
        upload_subdir = _tenant_uploads_dir(slug)

    os.makedirs(backups_dir, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    archive_path = os.path.join(backups_dir, f"{slug}-{ts}.tar.gz")
    with tarfile.open(archive_path, "w:gz") as tar:
        if os.path.exists(db_path):
            tar.add(db_path, arcname=f"{slug}/{os.path.basename(db_path)}")
        if os.path.isdir(upload_subdir):
            tar.add(upload_subdir, arcname=f"{slug}/uploads")
    return {"archive_path": archive_path, "company_id": company_id}
