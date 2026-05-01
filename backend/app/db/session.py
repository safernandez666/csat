from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.db.base import Base

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
}


def _apply_additive_migrations() -> None:
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    with engine.begin() as conn:
        for table, columns in _ADDITIVE_MIGRATIONS.items():
            if table not in existing_tables:
                continue
            present = {c["name"] for c in inspector.get_columns(table)}
            for column, sql_type in columns.items():
                if column in present:
                    continue
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {sql_type}"))


def init_db():
    Base.metadata.create_all(bind=engine)
    _apply_additive_migrations()
