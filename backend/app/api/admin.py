"""Super-admin endpoints. Mounted only in SaaS mode.

All endpoints are scoped to the admin plane via `require_superadmin`. The
login endpoint is the one exception: it accepts any request that reaches it
(the middleware will only route admin-plane hosts here in practice).
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.core import config as _config
from app.core.security import (
    verify_password, create_access_token,
    require_superadmin, TENANT_ADMIN,
)
from app.api.auth import rate_limit_login
from app.db.control_session import get_control_db
from app.models.control_plane import Company, SuperUser
from app.services.tenant_provisioning import (
    create_tenant, suspend_tenant, activate_tenant, reset_tenant_admin_password,
    snapshot_tenant,
)
from app.services.tenant_audit import log_super_action

router = APIRouter(prefix="/api/admin", tags=["admin"])


class SuperLoginRequest(BaseModel):
    email: EmailStr
    password: str


class SuperTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class SuperProfile(BaseModel):
    id: int
    email: EmailStr

    class Config:
        from_attributes = True


@router.post("/auth/login", response_model=SuperTokenResponse)
def super_login(req: SuperLoginRequest, response: Response, request: Request,
                db: Session = Depends(get_control_db),
                _rate_limit=Depends(rate_limit_login)):
    if not getattr(request.state, "is_admin_plane", False):
        raise HTTPException(status_code=404, detail="Not found")
    su = db.query(SuperUser).filter(SuperUser.email == req.email).first()
    if not su or not verify_password(req.password, su.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    payload = {"sub": str(su.id), "tenant": TENANT_ADMIN, "is_super": True}
    access = create_access_token(payload)
    response.set_cookie("access_token", access, httponly=True, secure=_config.settings.cookie_secure, samesite="lax", max_age=_config.settings.access_token_expire_minutes * 60)
    return SuperTokenResponse(access_token=access)


@router.post("/auth/logout")
def super_logout(response: Response):
    response.delete_cookie("access_token")
    return {"ok": True}


@router.get("/auth/me", response_model=SuperProfile)
def super_me(current: SuperUser = Depends(require_superadmin)):
    return current


# ---------------------------------------------------------------------------
# Company CRUD
# ---------------------------------------------------------------------------

class CompanyCreateRequest(BaseModel):
    slug: str = Field(min_length=2, max_length=31)
    name: str
    admin_email: EmailStr
    admin_full_name: str


class CompanyCreateResponse(BaseModel):
    slug: str
    admin_email: EmailStr
    temp_password: str


class CompanySummary(BaseModel):
    id: int
    slug: str
    name: str
    status: str
    created_at: datetime
    suspended_at: Optional[datetime] = None

    class Config:
        from_attributes = True


@router.post("/companies", response_model=CompanyCreateResponse, status_code=201)
def create_company(req: CompanyCreateRequest,
                   current: SuperUser = Depends(require_superadmin),
                   db: Session = Depends(get_control_db)):
    try:
        result = create_tenant(
            slug=req.slug, name=req.name,
            admin_email=req.admin_email, admin_full_name=req.admin_full_name,
            super_user_id=current.id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return CompanyCreateResponse(
        slug=result["slug"], admin_email=result["admin_email"], temp_password=result["temp_password"],
    )


@router.get("/companies", response_model=list[CompanySummary])
def list_companies(current: SuperUser = Depends(require_superadmin),
                   db: Session = Depends(get_control_db)):
    return db.query(Company).order_by(Company.created_at.desc()).all()


@router.get("/companies/{slug}", response_model=CompanySummary)
def get_company(slug: str,
                current: SuperUser = Depends(require_superadmin),
                db: Session = Depends(get_control_db)):
    c = db.query(Company).filter_by(slug=slug).first()
    if not c:
        raise HTTPException(status_code=404, detail="Not found")
    return c


@router.post("/companies/{slug}/suspend", response_model=CompanySummary)
def suspend_company(slug: str,
                    current: SuperUser = Depends(require_superadmin),
                    db: Session = Depends(get_control_db)):
    try:
        suspend_tenant(slug, super_user_id=current.id)
    except LookupError:
        raise HTTPException(status_code=404, detail="Not found")
    c = db.query(Company).filter_by(slug=slug).first()
    if not c:
        raise HTTPException(status_code=404, detail="Not found")
    return c


@router.post("/companies/{slug}/activate", response_model=CompanySummary)
def activate_company(slug: str,
                     current: SuperUser = Depends(require_superadmin),
                     db: Session = Depends(get_control_db)):
    try:
        activate_tenant(slug, super_user_id=current.id)
    except LookupError:
        raise HTTPException(status_code=404, detail="Not found")
    c = db.query(Company).filter_by(slug=slug).first()
    if not c:
        raise HTTPException(status_code=404, detail="Not found")
    return c


class AdminResetResponse(BaseModel):
    admin_email: EmailStr
    temp_password: str


@router.post("/companies/{slug}/admin-reset", response_model=AdminResetResponse)
def admin_reset(slug: str,
                current: SuperUser = Depends(require_superadmin)):
    try:
        result = reset_tenant_admin_password(slug, super_user_id=current.id)
    except LookupError:
        raise HTTPException(status_code=404, detail="Not found")
    return AdminResetResponse(admin_email=result["admin_email"], temp_password=result["temp_password"])


class BackupResponse(BaseModel):
    archive_path: str


@router.post("/companies/{slug}/backup", response_model=BackupResponse)
def backup_company(slug: str, current: SuperUser = Depends(require_superadmin)):
    try:
        result = snapshot_tenant(slug)
    except LookupError:
        raise HTTPException(status_code=404, detail="Not found")
    log_super_action(
        "company.backup", current.id, result["company_id"],
        {"slug": slug, "path": result["archive_path"]},
    )
    return BackupResponse(archive_path=result["archive_path"])
