"""Control plane database (control.db).

Hosts SuperUser, Company, TenantAuditLog. Always one process-wide engine.
Initialised lazily by `init_control_db()` during app lifespan.
"""
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker, Session

from app.db.bases import ControlBase

_engine: Engine | None = None
_SessionLocal = None


def get_control_engine() -> Engine:
    global _engine, _SessionLocal
    if _engine is None:
        # Import settings lazily so test monkeypatching of env vars takes effect
        # before the URL is read (the module-level singleton is already created).
        from app.core.config import Settings
        url = Settings().control_db_url
        _engine = create_engine(
            url,
            connect_args={"check_same_thread": False} if url.startswith("sqlite") else {},
            echo=False,
        )
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
    return _engine


def init_control_db() -> None:
    """Create control-plane tables. Idempotent."""
    # Import lazily so model registration runs before create_all (added in Task 5).
    # If the module doesn't exist yet (pre-Task 5), proceed with an empty registry.
    try:
        import app.models.control_plane  # noqa: F401
    except ImportError:
        pass  # Task 5 will add the real models; for now the metadata is empty.
    engine = get_control_engine()
    ControlBase.metadata.create_all(bind=engine)


def get_control_db() -> Session:
    """FastAPI dependency yielding a control plane session."""
    if _SessionLocal is None:
        get_control_engine()
    assert _SessionLocal is not None
    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()


def reset_for_tests() -> None:
    """Used by the test suite to drop the cached engine between tests."""
    global _engine, _SessionLocal
    if _engine is not None:
        _engine.dispose()
    _engine = None
    _SessionLocal = None
