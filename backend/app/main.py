from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import Depends, FastAPI, HTTPException
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
        from app.db.control_session import init_control_db
        from app.core.engine_pool import init_pool
        init_control_db()
        init_pool(max_size=settings.engine_pool_max_size)
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

upload_dir = os.path.abspath(settings.upload_dir)
os.makedirs(upload_dir, exist_ok=True)


@app.get("/uploads/{filename}")
def get_upload(filename: str, current_user: User = Depends(get_current_user)):
    """Serve uploaded files (evidence, logos) only to authenticated users.

    Path-traversal protection: resolves the requested path and checks that it
    stays within the upload directory.
    """
    base = Path(upload_dir).resolve()
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
