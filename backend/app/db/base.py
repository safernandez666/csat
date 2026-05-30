"""Back-compat shim: existing models import `Base` from `app.db.base`.

`Base` is `TenantBase` — the schema that ships in each tenant DB.
"""
from app.db.bases import TenantBase as Base

__all__ = ["Base"]
