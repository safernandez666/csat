from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Request, Query
from fastapi.exceptions import HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional

from app.api.deps import get_db, require_analyst, require_viewer, get_current_user
from app.models.control import Control, Safeguard
from app.models.user import User
from app.services.audit_service import log_action
from app.utils.cis_groups import get_cis_group

router = APIRouter(prefix="/api/controls", tags=["controls"])


class SafeguardOut(BaseModel):
    id: int
    safeguard_id: str
    title: str
    description: Optional[str]
    implementation_status: str
    ig: str

    class Config:
        from_attributes = True


class ControlOut(BaseModel):
    id: int
    cis_id: str
    name: str
    objective: Optional[str]
    implementation_guidance: Optional[str]
    status: str
    risk_level: str
    owner_id: Optional[int]
    owner_name: Optional[str]
    due_date: Optional[str]
    review_date: Optional[str]
    started_at: Optional[str]
    implemented_at: Optional[str]
    created_at: str
    updated_at: str
    group: str
    safeguards: List[SafeguardOut]

    class Config:
        from_attributes = True


class ControlUpdate(BaseModel):
    status: Optional[str] = None
    risk_level: Optional[str] = None
    owner_id: Optional[int] = None
    due_date: Optional[str] = None
    review_date: Optional[str] = None
    implementation_guidance: Optional[str] = None


class SafeguardUpdate(BaseModel):
    implementation_status: str


def _auto_control_status(control: Control) -> str:
    """Derive control status from its safeguards."""
    if not control.safeguards:
        return control.status or "not_implemented"
    all_impl = all(s.implementation_status == "implemented" for s in control.safeguards)
    any_progress = any(s.implementation_status in ("implemented", "in_progress") for s in control.safeguards)
    if all_impl:
        return "implemented"
    if any_progress:
        return "in_progress"
    return "not_implemented"


def _apply_status_transition(control: Control, new_status: str) -> bool:
    """Reconcile status + transition timestamps in one place.

    The function is idempotent: it backfills missing timestamps even when the
    status itself doesn't change. This matters for records that existed before
    started_at/implemented_at were added, and for the safeguard auto-status
    path where new_status often equals old_status but a safeguard moved.

    - started_at: set the first time the control leaves not_implemented; never
      cleared automatically (preserves historical "when did work begin").
    - implemented_at: set when status is 'implemented'; cleared as soon as
      status moves away from 'implemented' (regression).

    Returns True if any field changed.
    """
    now = datetime.now(timezone.utc)
    changed = False

    if new_status != control.status:
        control.status = new_status
        changed = True

    if new_status in ("in_progress", "implemented") and control.started_at is None:
        control.started_at = now
        changed = True

    if new_status == "implemented" and control.implemented_at is None:
        control.implemented_at = now
        changed = True
    elif new_status != "implemented" and control.implemented_at is not None:
        control.implemented_at = None
        changed = True

    return changed


def _build_control_out(db: Session, c: Control) -> ControlOut:
    owner = db.query(User).filter(User.id == c.owner_id).first() if c.owner_id else None
    return ControlOut(
        id=c.id,
        cis_id=c.cis_id,
        name=c.name,
        objective=c.objective,
        implementation_guidance=c.implementation_guidance,
        status=c.status,
        risk_level=c.risk_level,
        owner_id=c.owner_id,
        owner_name=owner.full_name if owner else None,
        due_date=str(c.due_date) if c.due_date else None,
        review_date=str(c.review_date) if c.review_date else None,
        started_at=c.started_at.isoformat() if c.started_at else None,
        implemented_at=c.implemented_at.isoformat() if c.implemented_at else None,
        created_at=c.created_at.isoformat() if c.created_at else None,
        updated_at=c.updated_at.isoformat() if c.updated_at else None,
        group=get_cis_group(c.cis_id),
        safeguards=[SafeguardOut(
            id=s.id,
            safeguard_id=s.safeguard_id,
            title=s.title,
            description=s.description,
            implementation_status=s.implementation_status,
            ig=s.ig,
        ) for s in c.safeguards],
    )


@router.get("", response_model=List[ControlOut])
def list_controls(
    status: Optional[str] = Query(None),
    risk: Optional[str] = Query(None),
    owner_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(require_viewer),
):
    q = db.query(Control)
    if status:
        q = q.filter(Control.status == status)
    if risk:
        q = q.filter(Control.risk_level == risk)
    if owner_id:
        q = q.filter(Control.owner_id == owner_id)
    return [_build_control_out(db, c) for c in q.all()]


@router.get("/{control_id}", response_model=ControlOut)
def get_control(control_id: int, db: Session = Depends(get_db), _=Depends(require_viewer)):
    c = db.query(Control).filter(Control.id == control_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Not found")
    return _build_control_out(db, c)


@router.put("/{control_id}", response_model=ControlOut)
def update_control(control_id: int, req: ControlUpdate, request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not any(r.name in ("Admin", "Security Analyst") for r in current_user.roles):
        raise HTTPException(status_code=403, detail="Forbidden")
    c = db.query(Control).filter(Control.id == control_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Not found")
    old = {k: getattr(c, k) for k in ["status", "risk_level", "owner_id", "due_date", "review_date", "implementation_guidance"]}
    if req.status is not None:
        _apply_status_transition(c, req.status)
    if req.risk_level is not None:
        c.risk_level = req.risk_level
    if req.owner_id is not None:
        c.owner_id = req.owner_id
    if req.due_date is not None:
        c.due_date = req.due_date
    if req.review_date is not None:
        c.review_date = req.review_date
    if req.implementation_guidance is not None:
        c.implementation_guidance = req.implementation_guidance
    db.commit()
    db.refresh(c)
    log_action(db, "control_updated", "control", resource_id=str(c.id), user_id=current_user.id, ip_address=request.client.host, details={"old": old, "new": req.dict()})
    return _build_control_out(db, c)


@router.put("/{control_id}/safeguards/{safeguard_id}", response_model=ControlOut)
def update_safeguard(control_id: int, safeguard_id: int, req: SafeguardUpdate, request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not any(r.name in ("Admin", "Security Analyst") for r in current_user.roles):
        raise HTTPException(status_code=403, detail="Forbidden")
    sg = db.query(Safeguard).filter(Safeguard.id == safeguard_id, Safeguard.control_id == control_id).first()
    if not sg:
        raise HTTPException(status_code=404, detail="Not found")
    sg.implementation_status = req.implementation_status
    db.commit()
    db.refresh(sg)

    # Auto-update parent control status based on safeguards
    control = db.query(Control).filter(Control.id == control_id).first()
    if not control:
        raise HTTPException(status_code=404, detail="Control not found")
    new_status = _auto_control_status(control)
    if _apply_status_transition(control, new_status):
        db.commit()
        db.refresh(control)

    log_action(db, "safeguard_updated", "safeguard", resource_id=str(sg.id), user_id=current_user.id, ip_address=request.client.host, details={"status": req.implementation_status})
    return _build_control_out(db, control)
