"""Tenant audit log writer — operator-side actions only."""
from typing import Any
from sqlalchemy.orm import Session

from app.db.control_session import get_control_engine
from app.models.control_plane import TenantAuditLog


def log_super_action(action: str, super_user_id: int | None,
                     company_id: int | None = None,
                     metadata: dict[str, Any] | None = None) -> None:
    """Append a TenantAuditLog row. super_user_id may be None for system-driven
    actions (e.g., scheduled backups), in which case we record a synthetic 0.
    """
    with Session(get_control_engine()) as s:
        s.add(TenantAuditLog(
            super_user_id=super_user_id or 0,
            company_id=company_id,
            action=action,
            metadata_=metadata or {},
        ))
        s.commit()
