from fastapi import Request
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.core.security import get_current_user, require_admin, require_analyst, require_auditor, require_viewer


def get_db(request: Request) -> Session:
    """Yield a SQLAlchemy session bound to the right engine.

    - SaaS mode: TenantMiddleware sets request.state.engine per host.
    - Single mode: fall back to the module-level engine in app.db.session.
    """
    if settings.is_saas and hasattr(request.state, "engine"):
        engine = request.state.engine
    else:
        from app.db.session import engine as default_engine
        engine = default_engine
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


__all__ = ["get_db", "get_current_user", "require_admin", "require_analyst", "require_auditor", "require_viewer"]
