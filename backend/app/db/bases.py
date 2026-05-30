"""Two independent SQLAlchemy declarative bases.

`TenantBase` holds the schema that lives inside each per-company SQLite file.
`ControlBase` holds the schema that lives in `control.db` (the SaaS control
plane). Keeping the MetaData registries separate means
`ControlBase.metadata.create_all(tenant_engine)` cannot accidentally create
control-plane tables in a tenant DB, and vice versa.
"""
from sqlalchemy.orm import DeclarativeBase


class TenantBase(DeclarativeBase):
    pass


class ControlBase(DeclarativeBase):
    pass
