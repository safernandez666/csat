from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import os

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import configure_logging
from app.core.security import get_current_user
from app.db.session import init_db
from app.models.settings import Setting
from app.models.user import User
from app.utils.seed import seed_database
from app.services.scheduler import init_scheduler, shutdown_scheduler
from app.api import auth, users, controls, evidence, comments, audit_logs, dashboard, reports, settings as settings_api, ai, oidc
from app.api.deps import get_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    if settings.is_saas:
        from app.db.control_session import init_control_db, get_control_engine
        from app.core.engine_pool import init_pool
        from app.models.control_plane import Company, SuperUser
        from app.services.tenant_provisioning import create_tenant
        from app.core.security import hash_password
        from sqlalchemy.orm import Session
        init_control_db()
        init_pool(max_size=settings.engine_pool_max_size)
        if settings.is_dev:
            with Session(get_control_engine()) as s:
                if not s.query(SuperUser).first():
                    s.add(SuperUser(email="op@zebra.local", hashed_password=hash_password("Op12345!")))
                    s.commit()
                if not s.query(Company).filter_by(slug=settings.dev_tenant_slug).first():
                    create_tenant(slug=settings.dev_tenant_slug, name="Dev Tenant",
                                  admin_email="admin@csat.local", admin_full_name="Dev Admin",
                                  super_user_id=None)
                    # Override the random temp password with the well-known dev one.
                    from app.models.user import User
                    from app.core.engine_pool import get_pool
                    c = s.query(Company).filter_by(slug=settings.dev_tenant_slug).first()
                    engine = get_pool().get_or_open(c)
                    with Session(engine) as ts:
                        u = ts.query(User).filter_by(email="admin@csat.local").first()
                        u.hashed_password = hash_password("Admin123!")
                        u.must_change_password = False
                        ts.commit()
    else:
        init_db()
        from app.db.session import SessionLocal
        db = SessionLocal()
        try:
            seed_database(db)
        finally:
            db.close()
    init_scheduler(enabled=settings.scheduler_enabled)
    yield
    shutdown_scheduler()


app = FastAPI(
    title="CSAT API",
    description="CIS Controls Assessment & Tracking Platform",
    version="1.0.0",
    lifespan=lifespan,
)

if settings.is_saas:
    from app.core.tenant import TenantMiddleware
    app.add_middleware(TenantMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(oidc.router)
app.include_router(users.router)
app.include_router(controls.router)
app.include_router(evidence.router)
app.include_router(comments.router)
app.include_router(audit_logs.router)
app.include_router(dashboard.router)
app.include_router(reports.router)
app.include_router(settings_api.router)
app.include_router(ai.router)

if settings.is_saas:
    from app.api import admin as admin_module
    app.include_router(admin_module.router)

upload_dir = os.path.abspath(settings.upload_dir)
os.makedirs(upload_dir, exist_ok=True)


@app.get("/uploads/{filename:path}")
def get_upload(filename: str, request: Request, current_user: User = Depends(get_current_user)):
    """Serve uploaded files (evidence, logos) only to authenticated users.

    Path-traversal protection: resolves the requested path and checks that it
    stays within the upload directory. In SaaS mode, further scopes the base
    to the tenant's own subdirectory so cross-tenant access is impossible.
    """
    if settings.is_saas:
        tenant = getattr(request.state, "tenant", None)
        if not tenant:
            raise HTTPException(status_code=404, detail="Not found")
        base = Path(upload_dir).resolve() / tenant.slug
    else:
        base = Path(upload_dir).resolve()
    base = base.resolve()
    target = (base / filename).resolve()
    try:
        target.relative_to(base)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid path")
    if not target.is_file():
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(target)


@app.get("/api/branding/logo")
def get_branding_logo(db: Session = Depends(get_db)):
    """Serve the configured company logo without authentication.

    This is the only public path into the upload dir: it resolves the file
    from the `company_logo_url` setting, refuses anything outside /uploads/,
    and applies the same path-traversal check as the authenticated route.
    """
    s = db.query(Setting).filter(Setting.key == "company_logo_url").first()
    if not s or not s.value:
        raise HTTPException(status_code=404, detail="No logo configured")
    url = str(s.value)
    if not url.startswith("/uploads/"):
        raise HTTPException(status_code=404, detail="Invalid logo path")
    filename = url[len("/uploads/"):]
    base = Path(upload_dir).resolve()
    target = (base / filename).resolve()
    try:
        target.relative_to(base)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid path")
    if not target.is_file():
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(target)


@app.get("/health")
def health():
    return {"status": "ok"}
