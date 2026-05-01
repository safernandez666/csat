from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional

from app.api.deps import get_db, require_auditor
from app.models.audit_log import AuditLog
from app.models.user import User

router = APIRouter(prefix="/api/audit-logs", tags=["audit-logs"])


class AuditLogOut(BaseModel):
    id: int
    user_id: Optional[int]
    user_name: Optional[str]
    action: str
    resource_type: str
    resource_id: Optional[str]
    details: Optional[dict]
    ip_address: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


@router.get("", response_model=List[AuditLogOut])
def list_audit_logs(
    action: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _=Depends(require_auditor),
):
    q = db.query(AuditLog)
    if action:
        q = q.filter(AuditLog.action == action)
    if resource_type:
        q = q.filter(AuditLog.resource_type == resource_type)
    q = q.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit)
    items = q.all()
    result = []
    for a in items:
        user = db.query(User).filter(User.id == a.user_id).first() if a.user_id else None
        result.append(AuditLogOut(
            id=a.id,
            user_id=a.user_id,
            user_name=user.full_name if user else None,
            action=a.action,
            resource_type=a.resource_type,
            resource_id=a.resource_id,
            details=a.details,
            ip_address=a.ip_address,
            created_at=a.created_at.isoformat() if a.created_at else None,
        ))
    return result
