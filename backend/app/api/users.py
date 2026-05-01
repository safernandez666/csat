from fastapi import APIRouter, Depends, Request
from fastapi.exceptions import HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional

from app.api.deps import get_db, require_admin, get_current_user
from app.core.security import hash_password
from app.models.user import User, Role
from app.services.audit_service import log_action

router = APIRouter(prefix="/api/users", tags=["users"])


class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    role_names: List[str]
    is_active: bool = True


class UserUpdate(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    role_names: Optional[List[str]] = None
    is_active: Optional[bool] = None


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    is_active: bool
    roles: List[dict]

    class Config:
        from_attributes = True


@router.get("", response_model=List[UserOut])
def list_users(db: Session = Depends(get_db), _=Depends(require_admin)):
    users = db.query(User).all()
    return [
        UserOut(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            is_active=u.is_active,
            roles=[{"id": r.id, "name": r.name} for r in u.roles],
        )
        for u in users
    ]


@router.post("", response_model=UserOut)
def create_user(req: UserCreate, request: Request, db: Session = Depends(get_db), _=Depends(require_admin)):
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=req.email,
        hashed_password=hash_password(req.password),
        full_name=req.full_name,
        is_active=req.is_active,
    )
    db.add(user)
    db.flush()
    for rname in req.role_names:
        role = db.query(Role).filter(Role.name == rname).first()
        if role:
            user.roles.append(role)
    db.commit()
    db.refresh(user)
    log_action(db, "user_created", "user", resource_id=str(user.id), user_id=user.id, ip_address=request.client.host)
    return UserOut(id=user.id, email=user.email, full_name=user.full_name, is_active=user.is_active, roles=[{"id": r.id, "name": r.name} for r in user.roles])


@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.id != user_id and not any(r.name == "Admin" for r in current_user.roles):
        raise HTTPException(status_code=403, detail="Forbidden")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Not found")
    return UserOut(id=user.id, email=user.email, full_name=user.full_name, is_active=user.is_active, roles=[{"id": r.id, "name": r.name} for r in user.roles])


@router.put("/{user_id}", response_model=UserOut)
def update_user(user_id: int, req: UserUpdate, request: Request, db: Session = Depends(get_db), _=Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Not found")
    if req.email is not None:
        user.email = req.email
    if req.full_name is not None:
        user.full_name = req.full_name
    if req.is_active is not None:
        user.is_active = req.is_active
    if req.role_names is not None:
        user.roles = []
        for rname in req.role_names:
            role = db.query(Role).filter(Role.name == rname).first()
            if role:
                user.roles.append(role)
    db.commit()
    db.refresh(user)
    log_action(db, "user_updated", "user", resource_id=str(user.id), user_id=user.id, ip_address=request.client.host)
    return UserOut(id=user.id, email=user.email, full_name=user.full_name, is_active=user.is_active, roles=[{"id": r.id, "name": r.name} for r in user.roles])


@router.delete("/{user_id}")
def delete_user(user_id: int, request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not any(r.name == "Admin" for r in current_user.roles):
        raise HTTPException(status_code=403, detail="Forbidden")
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Not found")
    user.is_active = False
    db.commit()
    log_action(db, "user_deactivated", "user", resource_id=str(user.id), user_id=current_user.id, ip_address=request.client.host)
    return {"detail": "User deactivated"}
