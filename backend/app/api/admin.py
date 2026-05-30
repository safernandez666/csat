"""Super-admin endpoints. Mounted only in SaaS mode.

All endpoints are scoped to the admin plane via `require_superadmin`. The
login endpoint is the one exception: it accepts any request that reaches it
(the middleware will only route admin-plane hosts here in practice).
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    verify_password, create_access_token,
    require_superadmin, TENANT_ADMIN,
)
from app.api.auth import rate_limit_login
from app.db.control_session import get_control_db
from app.models.control_plane import SuperUser

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
    response.set_cookie("access_token", access, httponly=True, secure=settings.cookie_secure, samesite="lax", max_age=settings.access_token_expire_minutes * 60)
    return SuperTokenResponse(access_token=access)


@router.post("/auth/logout")
def super_logout(response: Response):
    response.delete_cookie("access_token")
    return {"ok": True}


@router.get("/auth/me", response_model=SuperProfile)
def super_me(current: SuperUser = Depends(require_superadmin)):
    return current
