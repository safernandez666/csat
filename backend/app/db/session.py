from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.db.bases import TenantBase

# Single-tenant back-compat: module-level engine + SessionLocal.
# In SaaS mode these are unused — every request gets its engine from the
# EnginePool via TenantMiddleware.
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if settings.database_url.startswith("sqlite") else {},
    echo=False,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# Lightweight idempotent migrations for columns added after the original schema.
# Keep entries here when adding new nullable columns; remove once we adopt Alembic.
_ADDITIVE_MIGRATIONS = {
    "controls": {
        "started_at": "DATETIME",
        "implemented_at": "DATETIME",
    },
    "users": {
        "external_id": "VARCHAR",
        "must_change_password": "BOOLEAN DEFAULT 0",
    },
}


def _apply_additive_migrations(target_engine: Engine) -> None:
    inspector = inspect(target_engine)
    existing_tables = set(inspector.get_table_names())
    with target_engine.begin() as conn:
        for table, columns in _ADDITIVE_MIGRATIONS.items():
            if table not in existing_tables:
                continue
            present = {c["name"] for c in inspector.get_columns(table)}
            for column, sql_type in columns.items():
                if column in present:
                    continue
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {sql_type}"))


def init_tenant_db(target_engine: Engine = None) -> None:
    """Create the tenant schema on the given engine (defaults to the module-level one).

    Used in:
      - single-tenant startup (no argument)
      - per-tenant provisioning in SaaS mode (engine from EnginePool)
    """
    target = target_engine or engine
    TenantBase.metadata.create_all(bind=target)
    _apply_additive_migrations(target)


def init_db() -> None:
    """Back-compat alias used by single-tenant startup."""
    init_tenant_db(engine)
