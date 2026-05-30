"""Subdomain-based tenant resolution middleware.

Reads `Host`, looks up the tenant in the control plane DB, and stashes the
resolved Company plus its SQLAlchemy Engine on `request.state` for downstream
dependencies. Returns 404 when the tenant is unknown, suspended, or the
subdomain is reserved.
"""
import re
from typing import Optional

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.engine_pool import get_pool
from app.db.control_session import get_control_engine
from app.models.control_plane import Company

RESERVED_SLUGS = {"admin", "www", "api"}
SLUG_RE = re.compile(r"^[a-z][a-z0-9-]{1,30}$")


def validate_slug(slug: str) -> bool:
    return bool(SLUG_RE.match(slug)) and slug not in RESERVED_SLUGS


def _slug_from_host(host: str) -> Optional[str]:
    bare = host.split(":")[0]
    if "." not in bare:
        return None
    return bare.split(".")[0]


def _lookup_company(slug: str) -> Optional[Company]:
    engine = get_control_engine()
    with Session(engine) as s:
        return s.query(Company).filter(Company.slug == slug).first()


class TenantMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        host = request.headers.get("host", "")
        bare_host = host.split(":")[0]

        # Dev escape: on localhost in dev mode, the X-Tenant-Slug header
        # picks the tenant. "__admin__" picks the admin plane.
        if settings.is_dev and bare_host in ("localhost", "127.0.0.1", "testserver"):
            slug = request.headers.get("x-tenant-slug")
        else:
            slug = _slug_from_host(host)

        if slug == "admin" or slug == "__admin__":
            request.state.tenant = None
            request.state.engine = get_control_engine()
            request.state.is_admin_plane = True
            return await call_next(request)

        if not slug or slug in RESERVED_SLUGS:
            return JSONResponse({"detail": "Not found"}, status_code=404)

        company = _lookup_company(slug)
        if not company or company.status != "active":
            return JSONResponse({"detail": "Not found"}, status_code=404)

        request.state.tenant = company
        request.state.engine = get_pool().get_or_open(company)
        request.state.is_admin_plane = False
        return await call_next(request)
