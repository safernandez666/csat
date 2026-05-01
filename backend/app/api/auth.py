from fastapi import APIRouter, Depends, Request, Response
from fastapi.exceptions import HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import timedelta
from collections import defaultdict
from time import time

from app.api.deps import get_db
from app.core.security import verify_password, create_access_token, create_refresh_token, decode_token, get_current_user
from app.core.config import settings
from app.models.user import User
from app.services.audit_service import log_action

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Simple in-memory rate limiter for login attempts
RATE_LIMIT_STORE: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT_MAX = 5
RATE_LIMIT_WINDOW = 60

def rate_limit_login(request: Request):
    client_ip = request.client.host if request.client else "unknown"
    now = time()
    window = [t for t in RATE_LIMIT_STORE[client_ip] if now - t < RATE_LIMIT_WINDOW]
    RATE_LIMIT_STORE[client_ip] = window
    if len(window) >= RATE_LIMIT_MAX:
        raise HTTPException(status_code=429, detail="Too many login attempts. Please try again later.")
    window.append(now)



class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserProfile(BaseModel):
    id: int
    email: str
    full_name: str
    roles: list

    class Config:
        from_attributes = True


@router.post("/login", response_model=TokenResponse)  # ship-safe-ignore NO_RATE_LIMIT_LOGIN: in-memory rate limiter applied via dependency
def login(req: LoginRequest, response: Response, request: Request, db: Session = Depends(get_db), _rate_limit=Depends(rate_limit_login)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not user.hashed_password or not verify_password(req.password, user.hashed_password):
        log_action(db, "login_failed", "user", user_id=user.id if user else None, ip_address=request.client.host)
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account inactive")

    access = create_access_token({"sub": str(user.id), "email": user.email})
    refresh = create_refresh_token({"sub": str(user.id)})

    response.set_cookie(
        key="access_token",
        value=access,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=settings.access_token_expire_minutes * 60,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=settings.refresh_token_expire_days * 86400,
    )

    log_action(db, "login_success", "user", resource_id=str(user.id), user_id=user.id, ip_address=request.client.host)
    return TokenResponse(access_token=access, refresh_token=refresh)


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(response: Response, request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    payload = decode_token(token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user_id = int(payload.get("sub"))
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    access = create_access_token({"sub": str(user.id), "email": user.email})
    refresh = create_refresh_token({"sub": str(user.id)})
    response.set_cookie(key="access_token", value=access, httponly=True, secure=settings.cookie_secure, samesite="lax", max_age=settings.access_token_expire_minutes * 60)  # ship-safe-ignore: httponly already True
    response.set_cookie(key="refresh_token", value=refresh, httponly=True, secure=settings.cookie_secure, samesite="lax", max_age=settings.refresh_token_expire_days * 86400)  # ship-safe-ignore: httponly already True
    return TokenResponse(access_token=access, refresh_token=refresh)


@router.post("/logout")
def logout(response: Response, request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    log_action(db, "logout", "user", resource_id=str(current_user.id), user_id=current_user.id, ip_address=request.client.host)
    return {"detail": "Logged out"}


@router.get("/me", response_model=UserProfile)
def me(current_user: User = Depends(get_current_user)):
    return UserProfile(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        roles=[{"id": r.id, "name": r.name} for r in current_user.roles],
    )
