from fastapi import Request
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.core.security import get_current_user, require_admin, require_analyst, require_auditor, require_viewer


def get_db(request: Request) -> Session:
    """Yield a SQLAlchemy session bound to the right engine.

    - SaaS mode: TenantMiddleware sets request.state.engine per host;
      we build a per-engine sessionmaker on the fly.
    - Single mode: reuse the module-level SessionLocal cached in app.db.session.
    """
    if settings.is_saas:
        if not hasattr(request.state, "engine"):
            raise RuntimeError("TenantMiddleware did not set request.state.engine")
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=request.state.engine)
    else:
        from app.db.session import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


__all__ = ["get_db", "get_current_user", "require_admin", "require_analyst", "require_auditor", "require_viewer"]
