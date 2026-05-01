from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog
from app.core.logging import logger
from typing import Optional, Any, Dict


def log_action(
    db: Session,
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    user_id: Optional[int] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
) -> AuditLog:
    entry = AuditLog(
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id) if resource_id else None,
        user_id=user_id,
        details=details,
        ip_address=ip_address,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    logger.info("audit_log", action=action, resource_type=resource_type, resource_id=resource_id, user_id=user_id)
    return entry
