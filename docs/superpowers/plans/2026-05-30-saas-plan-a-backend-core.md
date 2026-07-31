# SaaS Plan A — Backend Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the CSAT backend (currently single-tenant) into a multi-tenant SaaS backend on the `feat/saas` branch: control plane DB, subdomain-aware tenant routing, LRU engine pool, super-admin auth, full tenant lifecycle endpoints. End state is a backend that can be driven entirely via `curl` to create/list/suspend companies and then log into a tenant subdomain. Frontend (Plan B) and deploy/ops (Plan C) come later.

**Architecture:** A `CSAT_MODE=saas` env flag activates a new `TenantMiddleware` that reads the request `Host`, resolves a `Company` row from a separate `control.db`, and injects an LRU-cached SQLAlchemy `Engine` into `request.state.engine`. The existing `get_db` dependency is refactored to use that engine, so every endpoint becomes tenant-scoped transparently. A second set of endpoints under `/api/admin/*` runs against the control plane DB, guarded by a new `require_superadmin` dependency. JWT tokens carry a `tenant` claim that is cross-checked against the resolved tenant on every request as a defense-in-depth measure.

**Tech Stack:** Python 3.11+, FastAPI, SQLAlchemy 2.x, SQLite, PyJWT, Argon2-cffi (all already present); pytest + pytest-asyncio for the test suite that this plan bootstraps from scratch.

**Spec reference:** `docs/superpowers/specs/2026-05-30-csat-saas-design.md` (commit `2d486f9` on `feat/saas`). Read it before starting.

**Branch:** Work on `feat/saas`. Do not merge to `main` during this plan.

---

## File Structure

### New files

| Path | Responsibility |
|---|---|
| `backend/app/db/bases.py` | Two `DeclarativeBase` subclasses: `TenantBase` and `ControlBase`, with separate `MetaData`. |
| `backend/app/db/control_session.py` | Singleton control plane engine + `SessionLocal` + `get_control_db()` dep + `init_control_db()`. |
| `backend/app/models/control_plane.py` | `Company`, `SuperUser`, `TenantAuditLog` ORM models (bound to `ControlBase`). |
| `backend/app/core/engine_pool.py` | `EnginePool` (thread-safe LRU of tenant engines, configurable cap). |
| `backend/app/core/tenant.py` | `TenantMiddleware`, `RESERVED_SLUGS`, `validate_slug()` helper. |
| `backend/app/services/tenant_provisioning.py` | `create_tenant()`, `suspend_tenant()`, `activate_tenant()`, `reset_tenant_admin_password()`, `snapshot_tenant()` (used by ad-hoc backup endpoint). |
| `backend/app/services/tenant_audit.py` | `log_super_action()` writes to `TenantAuditLog`. |
| `backend/app/api/admin.py` | All `/api/admin/*` endpoints (auth + companies CRUD + audit + backup). |
| `backend/tests/conftest.py` | Shared pytest fixtures: tmp control DB, tmp uploads dir, FastAPI client, super-admin login helper. |
| `backend/tests/test_engine_pool.py` | EnginePool unit tests. |
| `backend/tests/test_tenant_middleware.py` | Middleware host parsing + tenant lookup + 404 cases. |
| `backend/tests/test_admin_auth.py` | Super-admin login/me/logout. |
| `backend/tests/test_admin_companies.py` | Full company lifecycle via API. |
| `backend/tests/test_jwt_tenant_claim.py` | JWT cross-tenant rejection. |
| `backend/tests/test_must_change_password.py` | Forced password change on first login. |
| `backend/tests/test_uploads_per_tenant.py` | Upload scoping + path traversal. |
| `backend/tests/test_end_to_end_lifecycle.py` | Create tenant → login → use → suspend → 404. |
| `backend/pytest.ini` | pytest config (`testpaths = tests`, `asyncio_mode = auto`). |

### Modified files

| Path | Change |
|---|---|
| `backend/requirements.txt` | Add `pytest>=8`, `pytest-asyncio>=0.23`. |
| `backend/app/core/config.py` | Add `csat_mode` (`single`/`saas`), `engine_pool_max_size`, `control_db_url`, `tenants_dir`, `dev_tenant_slug`. |
| `backend/app/db/base.py` | Re-export `TenantBase` as `Base` for back-compat in single-tenant mode. |
| `backend/app/db/session.py` | Refactor: `init_tenant_db(engine)` parameterised; module-level `engine`/`SessionLocal` retained only for `CSAT_MODE=single`. |
| `backend/app/models/user.py` | Add `must_change_password: bool` column. |
| `backend/app/models/*.py` (all) | Inherit from `TenantBase` (via the re-export, no per-file change in practice). |
| `backend/app/utils/seed.py` | `seed_database(session)` already takes a session — add `seed_tenant(engine)` wrapper that creates a session against the given engine. |
| `backend/app/core/security.py` | Add `tenant` claim to `create_access_token`/`create_refresh_token`; `get_current_user` enforces `payload.tenant == request.state.tenant.slug`; new `get_current_superuser` + `require_superadmin`; remove the duplicate `get_db` (use deps.py one). |
| `backend/app/api/deps.py` | `get_db(request)` returns a session bound to `request.state.engine` (works for both planes). |
| `backend/app/api/auth.py` | Login adds `tenant` claim; rate-limit key changes to `f"{tenant_slug}:{ip}"`; cookies set without `Domain`; new `POST /api/auth/change-password`; `/me` exposes `must_change_password`. |
| `backend/app/main.py` | Conditional registration of `TenantMiddleware` and `admin` router when `CSAT_MODE=saas`; upload path resolves per-tenant; `lifespan` initialises control DB and optionally seeds a `dev` tenant in dev mode. |
| `backend/app/services/scheduler.py` | (out of scope for Plan A — leave as-is, will be revisited in Plan C). |

---

## Test Strategy

The backend has no existing test suite — Task 1 bootstraps it. Tests are deterministic and isolated:
- A per-test fixture creates a tmp `control.db` and a tmp `tenants/` dir.
- The `EnginePool` is reset between tests so engines don't leak across test functions.
- FastAPI's `TestClient` is constructed with `base_url="http://acme.csat.test"` (tenant) or `base_url="http://admin.csat.test"` (admin plane) so `TenantMiddleware` resolves correctly without DNS.
- A super-admin user is seeded directly via control DB; a sample tenant is created via the API in tests that need one.

---

## Task list

### Task 1: Bootstrap pytest infrastructure

**Files:**
- Create: `backend/pytest.ini`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_smoke.py`
- Modify: `backend/requirements.txt`

- [ ] **Step 1: Add test dependencies**

In `backend/requirements.txt` append two lines after the existing `httpx>=0.27.0` line:

```
pytest>=8.0.0
pytest-asyncio>=0.23.0
```

Then install:

```bash
cd backend && pip install -r requirements.txt
```

- [ ] **Step 2: Create pytest config**

Write `backend/pytest.ini`:

```ini
[pytest]
testpaths = tests
asyncio_mode = auto
addopts = -q
filterwarnings =
    ignore::DeprecationWarning:passlib
```

- [ ] **Step 3: Create `backend/tests/__init__.py`** (empty file).

- [ ] **Step 4: Create the smoke test FIRST and confirm it fails**

Write `backend/tests/test_smoke.py`:

```python
def test_pytest_runs():
    assert 1 + 1 == 2
```

Run: `cd backend && pytest tests/test_smoke.py -v`
Expected: PASS (this only verifies pytest works; it's intentionally trivial).

- [ ] **Step 5: Write minimal conftest with no fixtures yet**

Write `backend/tests/conftest.py`:

```python
"""Shared fixtures for the CSAT backend test suite.

Each test gets:
  - a tmp dir for control.db + tenants/
  - a fresh EnginePool
  - a FastAPI TestClient bound to a configurable Host
"""
import os
import pytest


@pytest.fixture
def tmp_data_dir(tmp_path, monkeypatch):
    """Point the app at a per-test tmp directory for all persistent state."""
    data_dir = tmp_path / "data"
    tenants_dir = data_dir / "tenants"
    uploads_dir = tmp_path / "uploads"
    for d in (data_dir, tenants_dir, uploads_dir):
        d.mkdir(parents=True, exist_ok=True)
    monkeypatch.setenv("CSAT_ENV", "dev")
    monkeypatch.setenv("CSAT_MODE", "saas")
    monkeypatch.setenv("CONTROL_DB_URL", f"sqlite:///{data_dir/'control.db'}")
    monkeypatch.setenv("TENANTS_DIR", str(tenants_dir))
    monkeypatch.setenv("UPLOAD_DIR", str(uploads_dir))
    monkeypatch.setenv("SECRET_KEY", "test-secret-key-not-for-production-32b")
    yield {"data_dir": data_dir, "tenants_dir": tenants_dir, "uploads_dir": uploads_dir}
```

- [ ] **Step 6: Run the smoke test again** to confirm conftest loads without import errors:

```bash
cd backend && pytest tests/test_smoke.py -v
```

Expected: PASS, no warnings about conftest.

- [ ] **Step 7: Commit**

```bash
git add backend/requirements.txt backend/pytest.ini backend/tests/__init__.py backend/tests/conftest.py backend/tests/test_smoke.py
git commit -m "test(backend): bootstrap pytest infrastructure"
```

---

### Task 2: Add SaaS-mode configuration

**Files:**
- Modify: `backend/app/core/config.py`
- Create: `backend/tests/test_config_saas.py`

- [ ] **Step 1: Write the failing test**

Write `backend/tests/test_config_saas.py`:

```python
import importlib
from app.core import config as config_module


def test_default_mode_is_single(monkeypatch):
    monkeypatch.delenv("CSAT_MODE", raising=False)
    importlib.reload(config_module)
    assert config_module.settings.csat_mode == "single"
    assert config_module.settings.is_saas is False


def test_saas_mode(monkeypatch):
    monkeypatch.setenv("CSAT_MODE", "saas")
    monkeypatch.setenv("CSAT_ENV", "dev")
    importlib.reload(config_module)
    assert config_module.settings.csat_mode == "saas"
    assert config_module.settings.is_saas is True


def test_saas_mode_exposes_pool_and_paths(monkeypatch):
    monkeypatch.setenv("CSAT_MODE", "saas")
    monkeypatch.setenv("CSAT_ENV", "dev")
    monkeypatch.setenv("ENGINE_POOL_MAX_SIZE", "32")
    monkeypatch.setenv("CONTROL_DB_URL", "sqlite:///./test-control.db")
    monkeypatch.setenv("TENANTS_DIR", "./data/tenants")
    monkeypatch.setenv("DEV_TENANT_SLUG", "dev")
    importlib.reload(config_module)
    s = config_module.settings
    assert s.engine_pool_max_size == 32
    assert s.control_db_url == "sqlite:///./test-control.db"
    assert s.tenants_dir == "./data/tenants"
    assert s.dev_tenant_slug == "dev"
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
cd backend && pytest tests/test_config_saas.py -v
```

Expected: FAIL — `AttributeError: 'Settings' object has no attribute 'csat_mode'`.

- [ ] **Step 3: Implement the settings additions**

Edit `backend/app/core/config.py`. After the existing field definitions (after `cookie_secure`) and before the OIDC fields, insert:

```python
    # --- SaaS multi-tenant mode (Plan A) ---
    csat_mode: str = Field(default="single", alias="CSAT_MODE")  # "single" | "saas"
    control_db_url: str = Field(default="sqlite:///./control.db", alias="CONTROL_DB_URL")
    tenants_dir: str = Field(default="./data/tenants", alias="TENANTS_DIR")
    engine_pool_max_size: int = Field(default=128, alias="ENGINE_POOL_MAX_SIZE")
    dev_tenant_slug: str = Field(default="dev", alias="DEV_TENANT_SLUG")
```

Then add a property after `is_dev`:

```python
    @property
    def is_saas(self) -> bool:
        return self.csat_mode.lower() == "saas"
```

- [ ] **Step 4: Run the tests and confirm they pass**

```bash
cd backend && pytest tests/test_config_saas.py -v
```

Expected: all three PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/core/config.py backend/tests/test_config_saas.py
git commit -m "feat(saas): add CSAT_MODE and SaaS-specific settings"
```

---

### Task 3: Split metadata into ControlBase and TenantBase

The current single `Base` would create both control plane and tenant tables on every engine. We need two separate metadata registries.

**Files:**
- Create: `backend/app/db/bases.py`
- Modify: `backend/app/db/base.py`
- Create: `backend/tests/test_bases.py`

- [ ] **Step 1: Write the failing test**

Write `backend/tests/test_bases.py`:

```python
from app.db.bases import ControlBase, TenantBase


def test_two_separate_metadata_registries():
    assert ControlBase.metadata is not TenantBase.metadata


def test_existing_tenant_tables_registered_on_tenant_base():
    # Importing models registers them on whichever base they inherit from.
    import app.models  # noqa: F401
    table_names = set(TenantBase.metadata.tables.keys())
    # Sanity: at least the core tenant tables are present on TenantBase.
    assert "users" in table_names
    assert "controls" in table_names
    assert "safeguards" in table_names
    assert "evidence" in table_names


def test_back_compat_base_is_tenant_base():
    from app.db.base import Base
    assert Base is TenantBase
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
cd backend && pytest tests/test_bases.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'app.db.bases'`.

- [ ] **Step 3: Create the new bases module**

Write `backend/app/db/bases.py`:

```python
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
```

- [ ] **Step 4: Re-export from the legacy module for back-compat**

Replace `backend/app/db/base.py` entirely with:

```python
"""Back-compat shim: existing models import `Base` from `app.db.base`.

`Base` is `TenantBase` — the schema that ships in each tenant DB.
"""
from app.db.bases import TenantBase as Base

__all__ = ["Base"]
```

- [ ] **Step 5: Run the tests and confirm they pass**

```bash
cd backend && pytest tests/test_bases.py -v
```

Expected: all three PASS.

- [ ] **Step 6: Run the smoke test to confirm existing imports still work**

```bash
cd backend && pytest tests/test_smoke.py tests/test_bases.py -v
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/app/db/bases.py backend/app/db/base.py backend/tests/test_bases.py
git commit -m "refactor(db): split into TenantBase + ControlBase metadata"
```

---

### Task 4: Refactor session.py — per-engine init + control plane bootstrap

**Files:**
- Modify: `backend/app/db/session.py`
- Create: `backend/app/db/control_session.py`
- Create: `backend/tests/test_control_session.py`

- [ ] **Step 1: Write the failing test**

Write `backend/tests/test_control_session.py`:

```python
import pytest
from sqlalchemy import inspect


def test_init_control_db_creates_control_tables_only(tmp_data_dir):
    # Late import so monkeypatched envs apply.
    from app.core.config import Settings
    s = Settings()
    from app.db.control_session import init_control_db, get_control_engine

    init_control_db()
    engine = get_control_engine()
    insp = inspect(engine)
    tables = set(insp.get_table_names())
    # Control-plane tables exist (they'll be added in Task 5; for now the
    # registry is empty but the engine must point at the configured URL).
    assert str(engine.url) == s.control_db_url


def test_get_control_db_yields_session(tmp_data_dir):
    from app.db.control_session import init_control_db, get_control_db

    init_control_db()
    gen = get_control_db()
    db = next(gen)
    try:
        assert db.is_active
    finally:
        gen.close()
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
cd backend && pytest tests/test_control_session.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'app.db.control_session'`.

- [ ] **Step 3: Create the control session module**

Write `backend/app/db/control_session.py`:

```python
"""Control plane database (control.db).

Hosts SuperUser, Company, TenantAuditLog. Always one process-wide engine.
Initialised lazily by `init_control_db()` during app lifespan.
"""
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker, Session

from app.core.config import settings
from app.db.bases import ControlBase

_engine: Engine | None = None
_SessionLocal = None


def get_control_engine() -> Engine:
    global _engine, _SessionLocal
    if _engine is None:
        url = settings.control_db_url
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
    import app.models.control_plane  # noqa: F401
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
```

- [ ] **Step 4: Refactor `session.py` so `init_db` can target a specific engine**

Replace `backend/app/db/session.py` with:

```python
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
```

- [ ] **Step 5: Run the new tests and confirm they pass**

```bash
cd backend && pytest tests/test_control_session.py tests/test_bases.py -v
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/db/session.py backend/app/db/control_session.py backend/tests/test_control_session.py
git commit -m "refactor(db): parameterise init_tenant_db + add control_session module"
```

---

### Task 5: Control plane models

**Files:**
- Create: `backend/app/models/control_plane.py`
- Modify: `backend/app/models/__init__.py` (if it exists — import the new module)
- Create: `backend/tests/test_control_plane_models.py`

- [ ] **Step 1: Write the failing test**

Write `backend/tests/test_control_plane_models.py`:

```python
from datetime import datetime


def test_company_round_trip(tmp_data_dir):
    from app.db.control_session import init_control_db, get_control_engine
    from app.models.control_plane import Company
    from sqlalchemy.orm import Session

    init_control_db()
    engine = get_control_engine()
    with Session(engine) as s:
        c = Company(slug="acme", name="Acme Corp", db_path="data/tenants/acme.db", status="active")
        s.add(c)
        s.commit()
        got = s.query(Company).filter_by(slug="acme").one()
        assert got.id is not None
        assert got.status == "active"
        assert got.suspended_at is None
        assert isinstance(got.created_at, datetime)


def test_superuser_unique_email(tmp_data_dir):
    from app.db.control_session import init_control_db, get_control_engine
    from app.models.control_plane import SuperUser
    from sqlalchemy.orm import Session
    from sqlalchemy.exc import IntegrityError

    init_control_db()
    engine = get_control_engine()
    with Session(engine) as s:
        s.add(SuperUser(email="op@zebrasecurity.io", hashed_password="x"))
        s.commit()
        s.add(SuperUser(email="op@zebrasecurity.io", hashed_password="y"))
        try:
            s.commit()
            raise AssertionError("expected IntegrityError")
        except IntegrityError:
            s.rollback()


def test_audit_log_records_action(tmp_data_dir):
    from app.db.control_session import init_control_db, get_control_engine
    from app.models.control_plane import SuperUser, TenantAuditLog
    from sqlalchemy.orm import Session

    init_control_db()
    engine = get_control_engine()
    with Session(engine) as s:
        su = SuperUser(email="op@zebrasecurity.io", hashed_password="x")
        s.add(su); s.commit()
        s.add(TenantAuditLog(
            super_user_id=su.id, company_id=None,
            action="company.create",
            metadata_={"slug": "acme"},
        ))
        s.commit()
        rows = s.query(TenantAuditLog).all()
        assert len(rows) == 1
        assert rows[0].action == "company.create"
        assert rows[0].metadata_["slug"] == "acme"
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
cd backend && pytest tests/test_control_plane_models.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'app.models.control_plane'`.

- [ ] **Step 3: Write the models**

Write `backend/app/models/control_plane.py`:

```python
"""Control plane ORM models — live in control.db only.

These never appear in tenant DBs because they inherit from `ControlBase`
(separate MetaData from `TenantBase`).
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.db.bases import ControlBase


class Company(ControlBase):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    db_path = Column(String, nullable=False)
    status = Column(String, nullable=False, default="active")  # active | suspended | failed
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    suspended_at = Column(DateTime, nullable=True)


class SuperUser(ControlBase):
    __tablename__ = "super_users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    mfa_enabled = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)


class TenantAuditLog(ControlBase):
    __tablename__ = "tenant_audit_log"

    id = Column(Integer, primary_key=True, index=True)
    super_user_id = Column(Integer, ForeignKey("super_users.id"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    action = Column(String, nullable=False)
    # SQLAlchemy reserves `metadata`, so we use `metadata_` in Python.
    metadata_ = Column("metadata", JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
```

- [ ] **Step 4: Run the tests and confirm they pass**

```bash
cd backend && pytest tests/test_control_plane_models.py -v
```

Expected: all three PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/control_plane.py backend/tests/test_control_plane_models.py
git commit -m "feat(saas): add control plane models (Company, SuperUser, TenantAuditLog)"
```

---

### Task 6: EnginePool

**Files:**
- Create: `backend/app/core/engine_pool.py`
- Create: `backend/tests/test_engine_pool.py`

- [ ] **Step 1: Write the failing test**

Write `backend/tests/test_engine_pool.py`:

```python
import os
from sqlalchemy.engine import Engine


def _make_company(slug: str, tenants_dir):
    """Lightweight stub matching the duck-type EnginePool expects."""
    class C:
        pass
    c = C()
    c.slug = slug
    c.db_path = str(tenants_dir / f"{slug}.db")
    return c


def test_get_or_open_creates_engine_on_disk(tmp_data_dir):
    from app.core.engine_pool import EnginePool

    pool = EnginePool(max_size=4)
    company = _make_company("acme", tmp_data_dir["tenants_dir"])
    engine = pool.get_or_open(company)
    assert isinstance(engine, Engine)
    # SQLite creates the file when the engine first connects.
    with engine.connect():
        pass
    assert os.path.exists(company.db_path)


def test_get_or_open_caches_engine(tmp_data_dir):
    from app.core.engine_pool import EnginePool

    pool = EnginePool(max_size=4)
    company = _make_company("acme", tmp_data_dir["tenants_dir"])
    e1 = pool.get_or_open(company)
    e2 = pool.get_or_open(company)
    assert e1 is e2


def test_lru_evicts_least_recently_used(tmp_data_dir):
    from app.core.engine_pool import EnginePool

    pool = EnginePool(max_size=2)
    a = _make_company("a", tmp_data_dir["tenants_dir"])
    b = _make_company("b", tmp_data_dir["tenants_dir"])
    c = _make_company("c", tmp_data_dir["tenants_dir"])
    ea = pool.get_or_open(a)
    eb = pool.get_or_open(b)
    # Touch `a` so it becomes MRU; `b` is now LRU.
    pool.get_or_open(a)
    ec = pool.get_or_open(c)
    assert "a" in pool._engines
    assert "c" in pool._engines
    assert "b" not in pool._engines
    # Old engine should have been disposed (no exception on dispose-twice).
    eb.dispose()


def test_evict_disposes_engine(tmp_data_dir):
    from app.core.engine_pool import EnginePool

    pool = EnginePool(max_size=1)
    a = _make_company("a", tmp_data_dir["tenants_dir"])
    b = _make_company("b", tmp_data_dir["tenants_dir"])
    ea = pool.get_or_open(a)
    pool.get_or_open(b)  # evicts a
    # After eviction, the engine should be closed: a fresh connection still
    # works because SQLite re-opens lazily; but the pool should no longer
    # have the slug.
    assert "a" not in pool._engines
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
cd backend && pytest tests/test_engine_pool.py -v
```

Expected: FAIL — `ModuleNotFoundError`.

- [ ] **Step 3: Implement EnginePool**

Write `backend/app/core/engine_pool.py`:

```python
"""Per-tenant SQLAlchemy engine pool with LRU eviction.

Only used when CSAT_MODE=saas. The pool is process-local; one instance is
created at app startup and held in module-level state.
"""
from __future__ import annotations

import threading
from collections import OrderedDict
from typing import Protocol

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine


class _CompanyLike(Protocol):
    slug: str
    db_path: str


class EnginePool:
    def __init__(self, max_size: int = 128):
        if max_size < 1:
            raise ValueError("max_size must be >= 1")
        self.max_size = max_size
        self._engines: OrderedDict[str, Engine] = OrderedDict()
        self._lock = threading.Lock()

    def get_or_open(self, company: _CompanyLike) -> Engine:
        with self._lock:
            if company.slug in self._engines:
                self._engines.move_to_end(company.slug)
                return self._engines[company.slug]
            engine = create_engine(
                f"sqlite:///{company.db_path}",
                connect_args={"check_same_thread": False},
                echo=False,
            )
            self._engines[company.slug] = engine
            if len(self._engines) > self.max_size:
                _, evicted = self._engines.popitem(last=False)
                evicted.dispose()
            return engine

    def evict(self, slug: str) -> None:
        with self._lock:
            engine = self._engines.pop(slug, None)
            if engine is not None:
                engine.dispose()

    def clear(self) -> None:
        with self._lock:
            for engine in self._engines.values():
                engine.dispose()
            self._engines.clear()


# Process-wide singleton, initialised at startup in main.py.
_pool: EnginePool | None = None


def get_pool() -> EnginePool:
    assert _pool is not None, "EnginePool not initialised; call init_pool() first"
    return _pool


def init_pool(max_size: int) -> EnginePool:
    global _pool
    _pool = EnginePool(max_size=max_size)
    return _pool


def reset_for_tests() -> None:
    global _pool
    if _pool is not None:
        _pool.clear()
    _pool = None
```

- [ ] **Step 4: Run the tests and confirm they pass**

```bash
cd backend && pytest tests/test_engine_pool.py -v
```

Expected: all four PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/core/engine_pool.py backend/tests/test_engine_pool.py
git commit -m "feat(saas): add per-tenant LRU engine pool"
```

---

### Task 7: TenantMiddleware

**Files:**
- Create: `backend/app/core/tenant.py`
- Create: `backend/tests/test_tenant_middleware.py`
- Modify: `backend/tests/conftest.py` (add app + client fixtures)

- [ ] **Step 1: Extend conftest with app/client fixtures**

Replace `backend/tests/conftest.py` with:

```python
"""Shared fixtures for the CSAT backend test suite."""
import importlib
import pytest


@pytest.fixture
def tmp_data_dir(tmp_path, monkeypatch):
    data_dir = tmp_path / "data"
    tenants_dir = data_dir / "tenants"
    uploads_dir = tmp_path / "uploads"
    for d in (data_dir, tenants_dir, uploads_dir):
        d.mkdir(parents=True, exist_ok=True)
    monkeypatch.setenv("CSAT_ENV", "dev")
    monkeypatch.setenv("CSAT_MODE", "saas")
    monkeypatch.setenv("CONTROL_DB_URL", f"sqlite:///{data_dir/'control.db'}")
    monkeypatch.setenv("TENANTS_DIR", str(tenants_dir))
    monkeypatch.setenv("UPLOAD_DIR", str(uploads_dir))
    monkeypatch.setenv("SECRET_KEY", "test-secret-key-not-for-production-32b")
    # Force reload of modules that snapshot settings at import time.
    from app.core import config as config_module
    importlib.reload(config_module)
    yield {"data_dir": data_dir, "tenants_dir": tenants_dir, "uploads_dir": uploads_dir}


@pytest.fixture
def reset_singletons():
    """Reset module-level singletons (control engine, pool) between tests."""
    yield
    from app.db import control_session
    from app.core import engine_pool
    control_session.reset_for_tests()
    engine_pool.reset_for_tests()


@pytest.fixture
def app(tmp_data_dir, reset_singletons):
    """Fresh FastAPI app with SaaS middleware active."""
    # Late import: settings and pool must be reset first.
    import app.main as main_module
    importlib.reload(main_module)
    return main_module.app


@pytest.fixture
def admin_client(app):
    from fastapi.testclient import TestClient
    return TestClient(app, base_url="http://admin.csat.test")


def tenant_client_for(app, slug: str):
    from fastapi.testclient import TestClient
    return TestClient(app, base_url=f"http://{slug}.csat.test")
```

- [ ] **Step 2: Write the failing test**

Write `backend/tests/test_tenant_middleware.py`:

```python
def test_admin_host_routes_to_control_plane(admin_client):
    # /health works on any plane.
    r = admin_client.get("/health")
    assert r.status_code == 200


def test_unknown_tenant_returns_404(app):
    from fastapi.testclient import TestClient
    c = TestClient(app, base_url="http://does-not-exist.csat.test")
    r = c.get("/health")
    assert r.status_code == 404


def test_reserved_slug_returns_404(app):
    from fastapi.testclient import TestClient
    c = TestClient(app, base_url="http://www.csat.test")
    r = c.get("/health")
    assert r.status_code == 404


def test_dev_escape_header_resolves_tenant(app, tmp_data_dir):
    # Create a tenant directly in the control plane so the middleware can find it.
    from app.db.control_session import init_control_db, get_control_engine
    from app.models.control_plane import Company
    from sqlalchemy.orm import Session
    init_control_db()
    with Session(get_control_engine()) as s:
        s.add(Company(slug="acme", name="Acme", db_path=str(tmp_data_dir["tenants_dir"] / "acme.db"), status="active"))
        s.commit()

    from fastapi.testclient import TestClient
    c = TestClient(app, base_url="http://localhost")
    # No host-based subdomain available — use the dev-mode header escape.
    r = c.get("/health", headers={"X-Tenant-Slug": "acme"})
    assert r.status_code == 200
```

- [ ] **Step 3: Run it and confirm it fails**

```bash
cd backend && pytest tests/test_tenant_middleware.py -v
```

Expected: FAIL — middleware not yet registered; /health returns 200 for everything.

- [ ] **Step 4: Implement the middleware**

Write `backend/app/core/tenant.py`:

```python
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
```

- [ ] **Step 5: Wire the middleware into `main.py` conditionally**

Edit `backend/app/main.py`. Replace the lifespan and middleware section. The new file should be:

```python
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import os

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import configure_logging
from app.core.security import get_current_user
from app.db.session import init_db
from app.models.settings import Setting
from app.models.user import User
from app.utils.seed import seed_database
from app.services.scheduler import init_scheduler, shutdown_scheduler
from app.api import auth, users, controls, evidence, comments, audit_logs, dashboard, reports, settings as settings_api, ai, oidc
from app.api.deps import get_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    if settings.is_saas:
        from app.db.control_session import init_control_db
        from app.core.engine_pool import init_pool
        init_control_db()
        init_pool(max_size=settings.engine_pool_max_size)
    else:
        init_db()
        from app.db.session import SessionLocal
        db = SessionLocal()
        try:
            seed_database(db)
        finally:
            db.close()
    init_scheduler(enabled=settings.scheduler_enabled)
    yield
    shutdown_scheduler()


app = FastAPI(
    title="CSAT API",
    description="CIS Controls Assessment & Tracking Platform",
    version="1.0.0",
    lifespan=lifespan,
)

if settings.is_saas:
    from app.core.tenant import TenantMiddleware
    app.add_middleware(TenantMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(oidc.router)
app.include_router(users.router)
app.include_router(controls.router)
app.include_router(evidence.router)
app.include_router(comments.router)
app.include_router(audit_logs.router)
app.include_router(dashboard.router)
app.include_router(reports.router)
app.include_router(settings_api.router)
app.include_router(ai.router)

upload_dir = os.path.abspath(settings.upload_dir)
os.makedirs(upload_dir, exist_ok=True)


@app.get("/uploads/{filename}")
def get_upload(filename: str, current_user: User = Depends(get_current_user)):
    base = Path(upload_dir).resolve()
    target = (base / filename).resolve()
    try:
        target.relative_to(base)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid path")
    if not target.is_file():
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(target)


@app.get("/api/branding/logo")
def get_branding_logo(db: Session = Depends(get_db)):
    s = db.query(Setting).filter(Setting.key == "company_logo_url").first()
    if not s or not s.value:
        raise HTTPException(status_code=404, detail="No logo configured")
    url = str(s.value)
    if not url.startswith("/uploads/"):
        raise HTTPException(status_code=404, detail="Invalid logo path")
    filename = url[len("/uploads/"):]
    base = Path(upload_dir).resolve()
    target = (base / filename).resolve()
    try:
        target.relative_to(base)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid path")
    if not target.is_file():
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(target)


@app.get("/health")
def health():
    return {"status": "ok"}
```

Note: the per-tenant upload subdir refactor happens in Task 13. For now `/uploads/{filename}` still serves from the flat dir — it's behind auth so it's safe; multi-tenant isolation is patched in 13.

- [ ] **Step 6: Run the tests and confirm they pass**

```bash
cd backend && pytest tests/test_tenant_middleware.py -v
```

Expected: all four PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/app/core/tenant.py backend/app/main.py backend/tests/conftest.py backend/tests/test_tenant_middleware.py
git commit -m "feat(saas): add TenantMiddleware + subdomain routing"
```

---

### Task 8: Refactor get_db to use request.state.engine

**Files:**
- Modify: `backend/app/api/deps.py`
- Modify: `backend/app/core/security.py` (remove its duplicate `get_db`)
- Create: `backend/tests/test_get_db_per_tenant.py`

- [ ] **Step 1: Write the failing test**

Write `backend/tests/test_get_db_per_tenant.py`:

```python
def test_get_db_returns_tenant_session(app, tmp_data_dir):
    from app.db.control_session import init_control_db, get_control_engine
    from app.db.session import init_tenant_db
    from app.core.engine_pool import get_pool
    from app.models.control_plane import Company
    from sqlalchemy.orm import Session
    init_control_db()

    # Provision two tenants on disk by hand for this test.
    with Session(get_control_engine()) as s:
        for slug in ("acme", "beta"):
            c = Company(slug=slug, name=slug.title(),
                        db_path=str(tmp_data_dir["tenants_dir"] / f"{slug}.db"),
                        status="active")
            s.add(c)
        s.commit()
        companies = {c.slug: c for c in s.query(Company).all()}

    # Initialize the tenant DBs.
    for slug, c in companies.items():
        init_tenant_db(get_pool().get_or_open(c))

    # /api/branding/logo hits get_db; with no logo set it returns 404 — but
    # that 404 confirms the dep ran against the tenant DB (not crashed at
    # engine resolution).
    from fastapi.testclient import TestClient
    ca = TestClient(app, base_url="http://acme.csat.test")
    rb = TestClient(app, base_url="http://beta.csat.test")
    assert ca.get("/api/branding/logo").status_code == 404
    assert rb.get("/api/branding/logo").status_code == 404
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
cd backend && pytest tests/test_get_db_per_tenant.py -v
```

Expected: FAIL — `AttributeError` on `request.state.engine`, because `get_db` still uses the module-level `SessionLocal`.

- [ ] **Step 3: Refactor `deps.py`**

Replace `backend/app/api/deps.py` with:

```python
from fastapi import Request
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.core.security import get_current_user, require_admin, require_analyst, require_auditor, require_viewer
from app.models.user import User


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
```

Re-export for the existing imports:

```python
__all__ = ["get_db", "get_current_user", "require_admin", "require_analyst", "require_auditor", "require_viewer"]
```

(Append after the function.)

- [ ] **Step 4: Remove the duplicate `get_db` from `security.py`**

In `backend/app/core/security.py`:

1. Remove `from app.db.session import SessionLocal` at the top.
2. Delete the entire `get_db` function (the local copy that lives in security.py).
3. Replace `get_current_user` so it resolves the session through a deferred import of `app.api.deps.get_db` (deferred to avoid a circular import: deps.py imports from security.py):

```python
async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
) -> User:
    from app.api.deps import get_db  # deferred to break circular import
    db_gen = get_db(request)
    db = next(db_gen)
    try:
        token = credentials.credentials if credentials else request.cookies.get("access_token")
        if not token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
        payload = decode_token(token)
        if not payload or payload.get("type") != "access":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        user = db.query(User).filter(User.id == int(user_id)).first()
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User inactive")
        return user
    finally:
        try:
            next(db_gen, None)
        except StopIteration:
            pass
```

- [ ] **Step 5: Run the new test plus the previous ones**

```bash
cd backend && pytest tests/ -v
```

Expected: all green. (The previous middleware tests still pass; the new get_db test passes.)

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/deps.py backend/app/core/security.py backend/tests/test_get_db_per_tenant.py
git commit -m "refactor(deps): get_db uses request.state.engine in SaaS mode"
```

---

### Task 9: JWT tenant claim + cross-tenant enforcement

**Files:**
- Modify: `backend/app/core/security.py`
- Modify: `backend/app/api/auth.py`
- Create: `backend/tests/test_jwt_tenant_claim.py`

- [ ] **Step 1: Write the failing test**

Write `backend/tests/test_jwt_tenant_claim.py`:

```python
def _seed_two_tenants(tmp_data_dir):
    """Provision two tenants with the seed admin user via direct DB writes."""
    from app.db.control_session import init_control_db, get_control_engine
    from app.db.session import init_tenant_db
    from app.core.engine_pool import get_pool
    from app.models.control_plane import Company
    from app.models.user import User, Role
    from app.core.security import hash_password
    from sqlalchemy.orm import Session

    init_control_db()
    with Session(get_control_engine()) as s:
        for slug in ("acme", "beta"):
            s.add(Company(slug=slug, name=slug.title(),
                          db_path=str(tmp_data_dir["tenants_dir"] / f"{slug}.db"),
                          status="active"))
        s.commit()
        companies = list(s.query(Company).all())

    for c in companies:
        engine = get_pool().get_or_open(c)
        init_tenant_db(engine)
        with Session(engine) as ts:
            role = Role(name="Admin", description="x", permissions=[])
            ts.add(role); ts.commit()
            u = User(email=f"admin@{c.slug}.test", hashed_password=hash_password("Pass123!"),
                    full_name="Admin", is_active=True)
            u.roles.append(role)
            ts.add(u); ts.commit()


def test_token_issued_for_acme_rejected_on_beta(app, tmp_data_dir):
    _seed_two_tenants(tmp_data_dir)
    from fastapi.testclient import TestClient

    ca = TestClient(app, base_url="http://acme.csat.test")
    r = ca.post("/api/auth/login", json={"email": "admin@acme.test", "password": "Pass123!"})
    assert r.status_code == 200, r.text
    token = r.json()["access_token"]

    # Present that token on the beta subdomain.
    rb = TestClient(app, base_url="http://beta.csat.test")
    me = rb.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 401


def test_token_with_no_tenant_claim_rejected(app, tmp_data_dir):
    _seed_two_tenants(tmp_data_dir)
    from app.core.security import create_access_token
    # Forge a token without the tenant claim.
    tok = create_access_token({"sub": "1"})  # no tenant
    from fastapi.testclient import TestClient
    ca = TestClient(app, base_url="http://acme.csat.test")
    me = ca.get("/api/auth/me", headers={"Authorization": f"Bearer {tok}"})
    assert me.status_code == 401
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
cd backend && pytest tests/test_jwt_tenant_claim.py -v
```

Expected: FAIL — tokens don't carry tenant, get_current_user doesn't enforce.

- [ ] **Step 3: Add tenant claim at login**

In `backend/app/api/auth.py`, locate the `login` function. After the line that confirms the user is active, change the token creation to include the tenant slug. Read the tenant slug from `request.state.tenant.slug` (set by middleware in SaaS mode) or fall back to `"_single_"` in single mode.

Replace the call to `create_access_token` and `create_refresh_token` in `login` with:

```python
tenant_slug = getattr(getattr(request.state, "tenant", None), "slug", None) or "_single_"
token_payload = {"sub": str(user.id), "tenant": tenant_slug}
access_token = create_access_token(token_payload)
refresh_token = create_refresh_token(token_payload)
```

(Find the existing equivalents in `auth.py` and update them — the exact line varies, but the pattern is the same throughout.)

- [ ] **Step 4: Enforce tenant claim in `get_current_user`**

In `backend/app/core/security.py`'s `get_current_user`, after retrieving `payload`, add:

```python
expected_tenant = getattr(getattr(request.state, "tenant", None), "slug", None)
if settings.is_saas:
    if getattr(request.state, "is_admin_plane", False):
        expected_tenant = "__admin__"
    token_tenant = payload.get("tenant")
    if not token_tenant or token_tenant != expected_tenant:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token does not match tenant")
```

(Insert this after `if not payload or payload.get("type") != "access"` and before the `user_id` extraction.)

- [ ] **Step 5: Run the tests**

```bash
cd backend && pytest tests/test_jwt_tenant_claim.py -v
```

Expected: both PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/core/security.py backend/app/api/auth.py backend/tests/test_jwt_tenant_claim.py
git commit -m "feat(saas): add tenant claim to JWT + enforce cross-tenant rejection"
```

---

### Task 10: Super-admin auth (model + JWT + dep)

**Files:**
- Modify: `backend/app/core/security.py`
- Create: `backend/tests/test_superadmin_dep.py`

- [ ] **Step 1: Write the failing test**

Write `backend/tests/test_superadmin_dep.py`:

```python
def test_create_superadmin_token_and_verify(tmp_data_dir):
    from app.db.control_session import init_control_db, get_control_engine
    from app.models.control_plane import SuperUser
    from app.core.security import hash_password, create_access_token, decode_token
    from sqlalchemy.orm import Session
    init_control_db()
    with Session(get_control_engine()) as s:
        su = SuperUser(email="op@zebra.io", hashed_password=hash_password("Op12345!"))
        s.add(su); s.commit()
        sid = su.id

    tok = create_access_token({"sub": str(sid), "tenant": "__admin__", "is_super": True})
    payload = decode_token(tok)
    assert payload["tenant"] == "__admin__"
    assert payload["is_super"] is True
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
cd backend && pytest tests/test_superadmin_dep.py -v
```

Expected: FAIL — `is_super` claim not yet supported by anything; but actually the test only checks decode_token returns the payload. It will pass for the wrong reason if you don't read carefully. Run it: it likely passes, since `decode_token` just decodes whatever is in. Adjust: the real verification (a dep) is added below; this test is a basic sanity check.

If it passes, move on to step 3 which adds the dep.

- [ ] **Step 3: Add `get_current_superuser` and `require_superadmin`**

Append to `backend/app/core/security.py`:

```python
async def get_current_superuser(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
):
    """Resolve the current SuperUser. Only valid on the admin plane."""
    if not getattr(request.state, "is_admin_plane", False):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    from app.db.control_session import get_control_db
    from app.models.control_plane import SuperUser

    token = credentials.credentials if credentials else request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_token(token)
    if not payload or payload.get("type") != "access" or payload.get("tenant") != "__admin__" or not payload.get("is_super"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    sid = payload.get("sub")
    if not sid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    db_gen = get_control_db()
    db = next(db_gen)
    try:
        su = db.query(SuperUser).filter(SuperUser.id == int(sid)).first()
        if not su:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="SuperUser missing")
        return su
    finally:
        try:
            next(db_gen, None)
        except StopIteration:
            pass


def require_superadmin(su=Depends(get_current_superuser)):
    return su
```

- [ ] **Step 4: Add a second test exercising the dep through a stub endpoint**

Append to `backend/tests/test_superadmin_dep.py`:

```python
def test_require_superadmin_rejects_on_tenant_plane(app, tmp_data_dir):
    from app.db.control_session import init_control_db, get_control_engine
    from app.models.control_plane import Company
    from sqlalchemy.orm import Session
    init_control_db()
    with Session(get_control_engine()) as s:
        s.add(Company(slug="acme", name="Acme",
                      db_path=str(tmp_data_dir["tenants_dir"] / "acme.db"),
                      status="active"))
        s.commit()

    from fastapi.testclient import TestClient
    # The /api/admin/* router is mounted in Task 11. For now, just confirm
    # that on a tenant plane no admin endpoint is reachable: the next test
    # in Task 11 will exercise the dep itself.
    c = TestClient(app, base_url="http://acme.csat.test")
    r = c.get("/api/admin/companies")
    # Router not yet mounted: 404. After Task 11, hitting this from acme.* plane
    # should also be 404 because the dep rejects non-admin-plane requests.
    assert r.status_code == 404
```

- [ ] **Step 5: Run the tests**

```bash
cd backend && pytest tests/test_superadmin_dep.py -v
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/core/security.py backend/tests/test_superadmin_dep.py
git commit -m "feat(saas): add SuperUser auth dep (require_superadmin)"
```

---

### Task 11: Super-admin login endpoints

**Files:**
- Create: `backend/app/api/admin.py`
- Modify: `backend/app/main.py` (mount the admin router)
- Create: `backend/tests/test_admin_auth.py`

- [ ] **Step 1: Write the failing test**

Write `backend/tests/test_admin_auth.py`:

```python
def _seed_super(tmp_data_dir, email="op@zebra.io", password="Op12345!"):
    from app.db.control_session import init_control_db, get_control_engine
    from app.models.control_plane import SuperUser
    from app.core.security import hash_password
    from sqlalchemy.orm import Session
    init_control_db()
    with Session(get_control_engine()) as s:
        s.add(SuperUser(email=email, hashed_password=hash_password(password)))
        s.commit()


def test_super_login_success(admin_client, tmp_data_dir):
    _seed_super(tmp_data_dir)
    r = admin_client.post("/api/admin/auth/login", json={"email": "op@zebra.io", "password": "Op12345!"})
    assert r.status_code == 200
    assert "access_token" in r.json()


def test_super_login_wrong_password(admin_client, tmp_data_dir):
    _seed_super(tmp_data_dir)
    r = admin_client.post("/api/admin/auth/login", json={"email": "op@zebra.io", "password": "wrong"})
    assert r.status_code == 401


def test_super_me_returns_email(admin_client, tmp_data_dir):
    _seed_super(tmp_data_dir)
    r = admin_client.post("/api/admin/auth/login", json={"email": "op@zebra.io", "password": "Op12345!"})
    tok = r.json()["access_token"]
    me = admin_client.get("/api/admin/auth/me", headers={"Authorization": f"Bearer {tok}"})
    assert me.status_code == 200
    assert me.json()["email"] == "op@zebra.io"


def test_admin_endpoints_not_reachable_from_tenant_plane(app, tmp_data_dir):
    from app.db.control_session import init_control_db, get_control_engine
    from app.models.control_plane import Company
    from sqlalchemy.orm import Session
    _seed_super(tmp_data_dir)
    with Session(get_control_engine()) as s:
        s.add(Company(slug="acme", name="Acme",
                      db_path=str(tmp_data_dir["tenants_dir"] / "acme.db"),
                      status="active"))
        s.commit()
    from fastapi.testclient import TestClient
    c = TestClient(app, base_url="http://acme.csat.test")
    # Even with a valid super token, hitting /api/admin/* from a tenant plane
    # must fail (404, because the dep treats non-admin-plane as not-found).
    r = c.post("/api/admin/auth/login", json={"email": "op@zebra.io", "password": "Op12345!"})
    # The login endpoint is the one super-admin route without a dep guard.
    # It would still work cross-plane, BUT subsequent /me/companies endpoints
    # are guarded. Test those instead.
    me = c.get("/api/admin/auth/me", headers={"Authorization": "Bearer fake"})
    assert me.status_code in (401, 404)  # either is acceptable: 404 from dep, 401 from token
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
cd backend && pytest tests/test_admin_auth.py -v
```

Expected: FAIL — admin router not yet present.

- [ ] **Step 3: Implement the admin router (auth subset only)**

Write `backend/app/api/admin.py`:

```python
"""Super-admin endpoints. Mounted only in SaaS mode.

All endpoints are scoped to the admin plane via `require_superadmin`. The
login endpoint is the one exception: it accepts any request that reaches it
(the middleware will only route admin-plane hosts here in practice).
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    verify_password, create_access_token, create_refresh_token,
    require_superadmin,
)
from app.db.control_session import get_control_db
from app.models.control_plane import SuperUser

router = APIRouter(prefix="/api/admin", tags=["admin"])


class SuperLoginRequest(BaseModel):
    email: EmailStr
    password: str


class SuperTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class SuperProfile(BaseModel):
    id: int
    email: EmailStr

    class Config:
        from_attributes = True


@router.post("/auth/login", response_model=SuperTokenResponse)
def super_login(req: SuperLoginRequest, response: Response, request: Request,
                db: Session = Depends(get_control_db)):
    if not getattr(request.state, "is_admin_plane", False):
        raise HTTPException(status_code=404, detail="Not found")
    su = db.query(SuperUser).filter(SuperUser.email == req.email).first()
    if not su or not verify_password(req.password, su.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    payload = {"sub": str(su.id), "tenant": "__admin__", "is_super": True}
    access = create_access_token(payload)
    refresh = create_refresh_token(payload)
    response.set_cookie("access_token", access, httponly=True, secure=settings.cookie_secure, samesite="lax")
    return SuperTokenResponse(access_token=access, refresh_token=refresh)


@router.post("/auth/logout")
def super_logout(response: Response):
    response.delete_cookie("access_token")
    return {"ok": True}


@router.get("/auth/me", response_model=SuperProfile)
def super_me(current: SuperUser = Depends(require_superadmin)):
    return current
```

- [ ] **Step 4: Mount the router in `main.py`**

In `backend/app/main.py`, after the existing `app.include_router(...)` lines, add (conditionally):

```python
if settings.is_saas:
    from app.api import admin as admin_router
    app.include_router(admin_router.router)
```

- [ ] **Step 5: Run the tests**

```bash
cd backend && pytest tests/test_admin_auth.py -v
```

Expected: all four PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/admin.py backend/app/main.py backend/tests/test_admin_auth.py
git commit -m "feat(saas): super-admin login/logout/me endpoints"
```

---

### Task 12: Tenant provisioning service

**Files:**
- Create: `backend/app/services/tenant_provisioning.py`
- Create: `backend/app/services/tenant_audit.py`
- Create: `backend/tests/test_tenant_provisioning.py`

- [ ] **Step 1: Write the failing test**

Write `backend/tests/test_tenant_provisioning.py`:

```python
import os


def test_create_tenant_initialises_db_seeds_and_admin(tmp_data_dir):
    from app.db.control_session import init_control_db, get_control_engine
    from app.core.engine_pool import init_pool
    from app.services.tenant_provisioning import create_tenant
    from app.models.control_plane import Company
    from app.models.user import User, Role
    from app.models.control import Control
    from sqlalchemy.orm import Session
    init_control_db()
    init_pool(max_size=4)

    result = create_tenant(slug="acme", name="Acme Corp",
                           admin_email="admin@acme.test", admin_full_name="Acme Admin",
                           super_user_id=None)
    assert result["slug"] == "acme"
    assert result["temp_password"]
    assert len(result["temp_password"]) >= 16
    assert os.path.exists(result["db_path"])
    assert os.path.exists(os.path.join(tmp_data_dir["uploads_dir"], "acme"))

    with Session(get_control_engine()) as s:
        c = s.query(Company).filter_by(slug="acme").one()
        assert c.status == "active"

    from app.core.engine_pool import get_pool
    engine = get_pool().get_or_open(c)
    with Session(engine) as ts:
        controls = ts.query(Control).all()
        assert len(controls) == 18
        admin = ts.query(User).filter_by(email="admin@acme.test").one()
        roles = [r.name for r in admin.roles]
        assert "Admin" in roles
        assert admin.must_change_password is True


def test_create_tenant_rejects_invalid_slug(tmp_data_dir):
    from app.db.control_session import init_control_db
    from app.core.engine_pool import init_pool
    from app.services.tenant_provisioning import create_tenant
    init_control_db()
    init_pool(max_size=4)
    import pytest
    with pytest.raises(ValueError):
        create_tenant(slug="admin", name="x", admin_email="a@b.c", admin_full_name="x", super_user_id=None)
    with pytest.raises(ValueError):
        create_tenant(slug="UPPER", name="x", admin_email="a@b.c", admin_full_name="x", super_user_id=None)


def test_suspend_then_activate(tmp_data_dir):
    from app.db.control_session import init_control_db, get_control_engine
    from app.core.engine_pool import init_pool
    from app.services.tenant_provisioning import create_tenant, suspend_tenant, activate_tenant
    from app.models.control_plane import Company
    from sqlalchemy.orm import Session
    init_control_db()
    init_pool(max_size=4)

    create_tenant(slug="beta", name="Beta", admin_email="a@b.c", admin_full_name="x", super_user_id=None)
    suspend_tenant("beta", super_user_id=None)
    with Session(get_control_engine()) as s:
        assert s.query(Company).filter_by(slug="beta").one().status == "suspended"
    activate_tenant("beta", super_user_id=None)
    with Session(get_control_engine()) as s:
        assert s.query(Company).filter_by(slug="beta").one().status == "active"
```

(NB: `must_change_password` column is added in Task 14 — this test will start failing on that field then pass once Task 14 is done. For now, defer this specific assertion: in step 1 above, change `assert admin.must_change_password is True` to `# TODO Task 14: assert admin.must_change_password is True` and complete Task 14 to re-enable it. Track this in your task list.)

Update step 1 accordingly:

```python
# assert admin.must_change_password is True  # re-enable after Task 14
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
cd backend && pytest tests/test_tenant_provisioning.py -v
```

Expected: FAIL — service doesn't exist.

- [ ] **Step 3: Implement the audit helper**

Write `backend/app/services/tenant_audit.py`:

```python
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
```

- [ ] **Step 4: Implement the provisioning service**

Write `backend/app/services/tenant_provisioning.py`:

```python
"""End-to-end tenant lifecycle helpers used by the super-admin API."""
from __future__ import annotations

import os
import secrets
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.engine_pool import get_pool
from app.core.tenant import validate_slug
from app.db.control_session import get_control_engine
from app.db.session import init_tenant_db
from app.models.control_plane import Company
from app.models.user import User, Role
from app.utils.seed import seed_database
from app.core.security import hash_password
from app.services.tenant_audit import log_super_action


def _tenant_db_path(slug: str) -> str:
    return str(Path(settings.tenants_dir) / f"{slug}.db")


def _tenant_uploads_dir(slug: str) -> str:
    return str(Path(settings.upload_dir) / slug)


def create_tenant(slug: str, name: str, admin_email: str, admin_full_name: str,
                  super_user_id: Optional[int]) -> dict:
    if not validate_slug(slug):
        raise ValueError(f"Invalid slug: {slug!r}")

    db_path = _tenant_db_path(slug)
    uploads_path = _tenant_uploads_dir(slug)

    with Session(get_control_engine()) as cs:
        if cs.query(Company).filter_by(slug=slug).first():
            raise ValueError(f"Tenant {slug!r} already exists")
        company = Company(slug=slug, name=name, db_path=db_path, status="active")
        cs.add(company)
        cs.commit()
        cs.refresh(company)
        company_id = company.id

    try:
        os.makedirs(Path(db_path).parent, exist_ok=True)
        os.makedirs(uploads_path, exist_ok=True)
        engine = get_pool().get_or_open(_DuckCompany(slug, db_path))
        init_tenant_db(engine)
        temp_password = secrets.token_urlsafe(16)
        with Session(engine) as ts:
            seed_database(ts)
            admin_role = ts.query(Role).filter_by(name="Admin").first()
            if admin_role is None:
                raise RuntimeError("Admin role missing after seed")
            user = User(
                email=admin_email, hashed_password=hash_password(temp_password),
                full_name=admin_full_name, is_active=True,
            )
            user.roles.append(admin_role)
            # must_change_password set in Task 14; harmless if column not yet added.
            if hasattr(User, "must_change_password"):
                user.must_change_password = True
            ts.add(user); ts.commit()
        log_super_action("company.create", super_user_id, company_id, {"slug": slug})
        return {"slug": slug, "db_path": db_path, "admin_email": admin_email, "temp_password": temp_password}
    except Exception:
        # Best-effort rollback
        with Session(get_control_engine()) as cs:
            c = cs.query(Company).filter_by(slug=slug).first()
            if c:
                c.status = "failed"
                cs.commit()
        try:
            if os.path.exists(db_path):
                os.remove(db_path)
        except OSError:
            pass
        try:
            if os.path.isdir(uploads_path):
                shutil.rmtree(uploads_path, ignore_errors=True)
        except OSError:
            pass
        log_super_action("company.create_failed", super_user_id, company_id, {"slug": slug})
        raise


def suspend_tenant(slug: str, super_user_id: Optional[int]) -> None:
    with Session(get_control_engine()) as cs:
        c = cs.query(Company).filter_by(slug=slug).first()
        if not c:
            raise LookupError(slug)
        c.status = "suspended"
        c.suspended_at = datetime.now(timezone.utc)
        cs.commit()
    get_pool().evict(slug)  # drop cached engine
    log_super_action("company.suspend", super_user_id, None, {"slug": slug})


def activate_tenant(slug: str, super_user_id: Optional[int]) -> None:
    with Session(get_control_engine()) as cs:
        c = cs.query(Company).filter_by(slug=slug).first()
        if not c:
            raise LookupError(slug)
        c.status = "active"
        c.suspended_at = None
        cs.commit()
    log_super_action("company.activate", super_user_id, None, {"slug": slug})


def reset_tenant_admin_password(slug: str, super_user_id: Optional[int]) -> dict:
    with Session(get_control_engine()) as cs:
        c = cs.query(Company).filter_by(slug=slug).first()
        if not c:
            raise LookupError(slug)
    engine = get_pool().get_or_open(c)
    with Session(engine) as ts:
        admin_role = ts.query(Role).filter_by(name="Admin").first()
        admin = (ts.query(User)
                   .join(User.roles).filter(Role.id == admin_role.id)
                   .order_by(User.id.asc()).first())
        if not admin:
            raise LookupError(f"no admin user in {slug}")
        new_pw = secrets.token_urlsafe(16)
        admin.hashed_password = hash_password(new_pw)
        if hasattr(User, "must_change_password"):
            admin.must_change_password = True
        ts.commit()
    log_super_action("admin.reset_password", super_user_id, None, {"slug": slug})
    return {"admin_email": admin.email, "temp_password": new_pw}


class _DuckCompany:
    """Minimal shape EnginePool.get_or_open expects.

    Used before the Company row is reattached to a session.
    """
    def __init__(self, slug: str, db_path: str):
        self.slug = slug
        self.db_path = db_path
```

- [ ] **Step 5: Run the tests**

```bash
cd backend && pytest tests/test_tenant_provisioning.py -v
```

Expected: all three PASS (with the `must_change_password` assertion commented out pending Task 14).

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/tenant_provisioning.py backend/app/services/tenant_audit.py backend/tests/test_tenant_provisioning.py
git commit -m "feat(saas): tenant provisioning service (create/suspend/activate/reset)"
```

---

### Task 13: Super-admin company endpoints

**Files:**
- Modify: `backend/app/api/admin.py`
- Create: `backend/tests/test_admin_companies.py`

- [ ] **Step 1: Write the failing test**

Write `backend/tests/test_admin_companies.py`:

```python
def _login(admin_client, tmp_data_dir):
    from app.db.control_session import init_control_db, get_control_engine
    from app.models.control_plane import SuperUser
    from app.core.security import hash_password
    from sqlalchemy.orm import Session
    init_control_db()
    with Session(get_control_engine()) as s:
        if not s.query(SuperUser).first():
            s.add(SuperUser(email="op@zebra.io", hashed_password=hash_password("Op12345!")))
            s.commit()
    r = admin_client.post("/api/admin/auth/login", json={"email": "op@zebra.io", "password": "Op12345!"})
    return r.json()["access_token"]


def test_create_list_get_company(admin_client, tmp_data_dir):
    from app.core.engine_pool import init_pool
    init_pool(max_size=4)
    tok = _login(admin_client, tmp_data_dir)
    h = {"Authorization": f"Bearer {tok}"}

    r = admin_client.post("/api/admin/companies", headers=h, json={
        "slug": "acme", "name": "Acme Corp",
        "admin_email": "admin@acme.test", "admin_full_name": "Acme Admin",
    })
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["slug"] == "acme"
    assert body["temp_password"]

    lst = admin_client.get("/api/admin/companies", headers=h).json()
    slugs = [c["slug"] for c in lst]
    assert "acme" in slugs

    detail = admin_client.get("/api/admin/companies/acme", headers=h).json()
    assert detail["slug"] == "acme"
    assert detail["status"] == "active"


def test_suspend_makes_tenant_404(admin_client, tmp_data_dir, app):
    from app.core.engine_pool import init_pool
    init_pool(max_size=4)
    tok = _login(admin_client, tmp_data_dir)
    h = {"Authorization": f"Bearer {tok}"}
    admin_client.post("/api/admin/companies", headers=h, json={
        "slug": "acme", "name": "Acme", "admin_email": "a@b.c", "admin_full_name": "x"})

    from fastapi.testclient import TestClient
    ca = TestClient(app, base_url="http://acme.csat.test")
    assert ca.get("/health").status_code == 200

    admin_client.post("/api/admin/companies/acme/suspend", headers=h)
    assert ca.get("/health").status_code == 404


def test_admin_reset_returns_new_temp_password(admin_client, tmp_data_dir):
    from app.core.engine_pool import init_pool
    init_pool(max_size=4)
    tok = _login(admin_client, tmp_data_dir)
    h = {"Authorization": f"Bearer {tok}"}
    admin_client.post("/api/admin/companies", headers=h, json={
        "slug": "acme", "name": "Acme", "admin_email": "a@b.c", "admin_full_name": "x"})
    r = admin_client.post("/api/admin/companies/acme/admin-reset", headers=h)
    assert r.status_code == 200
    assert r.json()["temp_password"]
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
cd backend && pytest tests/test_admin_companies.py -v
```

Expected: FAIL — endpoints not yet present.

- [ ] **Step 3: Add the CRUD endpoints to `admin.py`**

Append to `backend/app/api/admin.py`:

```python
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

from app.services.tenant_provisioning import (
    create_tenant, suspend_tenant, activate_tenant, reset_tenant_admin_password,
)
from app.models.control_plane import Company


class CompanyCreateRequest(BaseModel):
    slug: str = Field(min_length=2, max_length=31)
    name: str
    admin_email: EmailStr
    admin_full_name: str


class CompanyCreateResponse(BaseModel):
    slug: str
    admin_email: EmailStr
    temp_password: str


class CompanySummary(BaseModel):
    id: int
    slug: str
    name: str
    status: str
    created_at: datetime
    suspended_at: Optional[datetime] = None

    class Config:
        from_attributes = True


@router.post("/companies", response_model=CompanyCreateResponse, status_code=201)
def create_company(req: CompanyCreateRequest,
                   current: SuperUser = Depends(require_superadmin),
                   db: Session = Depends(get_control_db)):
    try:
        result = create_tenant(
            slug=req.slug, name=req.name,
            admin_email=req.admin_email, admin_full_name=req.admin_full_name,
            super_user_id=current.id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return CompanyCreateResponse(
        slug=result["slug"], admin_email=result["admin_email"], temp_password=result["temp_password"],
    )


@router.get("/companies", response_model=list[CompanySummary])
def list_companies(current: SuperUser = Depends(require_superadmin),
                   db: Session = Depends(get_control_db)):
    return db.query(Company).order_by(Company.created_at.desc()).all()


@router.get("/companies/{slug}", response_model=CompanySummary)
def get_company(slug: str,
                current: SuperUser = Depends(require_superadmin),
                db: Session = Depends(get_control_db)):
    c = db.query(Company).filter_by(slug=slug).first()
    if not c:
        raise HTTPException(status_code=404, detail="Not found")
    return c


@router.post("/companies/{slug}/suspend", response_model=CompanySummary)
def suspend_company(slug: str,
                    current: SuperUser = Depends(require_superadmin),
                    db: Session = Depends(get_control_db)):
    try:
        suspend_tenant(slug, super_user_id=current.id)
    except LookupError:
        raise HTTPException(status_code=404, detail="Not found")
    return db.query(Company).filter_by(slug=slug).first()


@router.post("/companies/{slug}/activate", response_model=CompanySummary)
def activate_company(slug: str,
                     current: SuperUser = Depends(require_superadmin),
                     db: Session = Depends(get_control_db)):
    try:
        activate_tenant(slug, super_user_id=current.id)
    except LookupError:
        raise HTTPException(status_code=404, detail="Not found")
    return db.query(Company).filter_by(slug=slug).first()


class AdminResetResponse(BaseModel):
    admin_email: EmailStr
    temp_password: str


@router.post("/companies/{slug}/admin-reset", response_model=AdminResetResponse)
def admin_reset(slug: str,
                current: SuperUser = Depends(require_superadmin)):
    try:
        result = reset_tenant_admin_password(slug, super_user_id=current.id)
    except LookupError:
        raise HTTPException(status_code=404, detail="Not found")
    return AdminResetResponse(admin_email=result["admin_email"], temp_password=result["temp_password"])
```

- [ ] **Step 4: Run the tests**

```bash
cd backend && pytest tests/test_admin_companies.py -v
```

Expected: all four PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/admin.py backend/tests/test_admin_companies.py
git commit -m "feat(saas): super-admin company CRUD endpoints"
```

---

### Task 14: User.must_change_password + change-password endpoint

**Files:**
- Modify: `backend/app/models/user.py`
- Modify: `backend/app/api/auth.py`
- Create: `backend/tests/test_must_change_password.py`

- [ ] **Step 1: Write the failing test**

Write `backend/tests/test_must_change_password.py`:

```python
def _provision_and_login(app, tmp_data_dir, admin_client):
    from app.db.control_session import init_control_db, get_control_engine
    from app.core.engine_pool import init_pool
    from app.models.control_plane import SuperUser
    from app.core.security import hash_password
    from sqlalchemy.orm import Session
    init_control_db()
    init_pool(max_size=4)
    with Session(get_control_engine()) as s:
        if not s.query(SuperUser).first():
            s.add(SuperUser(email="op@zebra.io", hashed_password=hash_password("Op12345!")))
            s.commit()
    r = admin_client.post("/api/admin/auth/login", json={"email": "op@zebra.io", "password": "Op12345!"})
    tok = r.json()["access_token"]
    h = {"Authorization": f"Bearer {tok}"}
    c = admin_client.post("/api/admin/companies", headers=h, json={
        "slug": "acme", "name": "Acme",
        "admin_email": "admin@acme.test", "admin_full_name": "Acme Admin"})
    temp = c.json()["temp_password"]
    from fastapi.testclient import TestClient
    tc = TestClient(app, base_url="http://acme.csat.test")
    return tc, temp


def test_me_exposes_must_change_password_flag(app, tmp_data_dir, admin_client):
    tc, temp = _provision_and_login(app, tmp_data_dir, admin_client)
    login = tc.post("/api/auth/login", json={"email": "admin@acme.test", "password": temp})
    assert login.status_code == 200
    tok = login.json()["access_token"]
    me = tc.get("/api/auth/me", headers={"Authorization": f"Bearer {tok}"}).json()
    assert me["must_change_password"] is True


def test_change_password_clears_flag(app, tmp_data_dir, admin_client):
    tc, temp = _provision_and_login(app, tmp_data_dir, admin_client)
    login = tc.post("/api/auth/login", json={"email": "admin@acme.test", "password": temp})
    tok = login.json()["access_token"]
    h = {"Authorization": f"Bearer {tok}"}

    # Wrong current → 400
    r = tc.post("/api/auth/change-password", headers=h,
                json={"current_password": "wrong", "new_password": "NewPass123!"})
    assert r.status_code == 400

    # Correct → 200
    r = tc.post("/api/auth/change-password", headers=h,
                json={"current_password": temp, "new_password": "NewPass123!"})
    assert r.status_code == 200

    # /me flag is now false
    me = tc.get("/api/auth/me", headers=h).json()
    assert me["must_change_password"] is False

    # Old password no longer works
    bad = tc.post("/api/auth/login", json={"email": "admin@acme.test", "password": temp})
    assert bad.status_code == 401
    # New password works
    good = tc.post("/api/auth/login", json={"email": "admin@acme.test", "password": "NewPass123!"})
    assert good.status_code == 200
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
cd backend && pytest tests/test_must_change_password.py -v
```

Expected: FAIL — the column and endpoint don't exist.

- [ ] **Step 3: Add the column to `User`**

In `backend/app/models/user.py`, after the `external_id` column, add:

```python
    must_change_password = Column(Boolean, default=False, nullable=False)
```

The migration entry was already added to `_ADDITIVE_MIGRATIONS` in Task 4 (`"users": { ..., "must_change_password": "BOOLEAN DEFAULT 0" }`). Confirm it's there.

- [ ] **Step 4: Update `auth.py` to expose the flag and add the endpoint**

In `backend/app/api/auth.py`, find the `UserProfile` Pydantic model and extend it:

```python
class UserProfile(BaseModel):
    id: int
    email: str
    full_name: str
    roles: list
    must_change_password: bool = False

    class Config:
        from_attributes = True
```

Then append the change-password endpoint:

```python
from app.core.security import hash_password


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/change-password")
def change_password(req: ChangePasswordRequest,
                    current_user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    if not current_user.hashed_password or not verify_password(req.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password incorrect")
    if len(req.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password too short")
    current_user.hashed_password = hash_password(req.new_password)
    current_user.must_change_password = False
    db.add(current_user); db.commit()
    return {"ok": True}
```

- [ ] **Step 5: Re-enable the assertion in `test_tenant_provisioning.py`**

In `backend/tests/test_tenant_provisioning.py`, uncomment:

```python
assert admin.must_change_password is True
```

- [ ] **Step 6: Run the tests**

```bash
cd backend && pytest tests/test_must_change_password.py tests/test_tenant_provisioning.py -v
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/app/models/user.py backend/app/api/auth.py backend/tests/test_must_change_password.py backend/tests/test_tenant_provisioning.py
git commit -m "feat(saas): must_change_password flow + change-password endpoint"
```

---

### Task 15: Per-tenant uploads scoping

**Files:**
- Modify: `backend/app/main.py` (upload handler)
- Modify: `backend/app/api/evidence.py` (write path now includes tenant slug)
- Create: `backend/tests/test_uploads_per_tenant.py`

- [ ] **Step 1: Inspect current evidence upload code**

Run:

```bash
cd backend && grep -n "upload_dir\|UPLOAD_DIR\|os.makedirs\|file_path" app/api/evidence.py | head -40
```

Note the exact lines that compute the destination path. The fix is to inject the tenant slug between `upload_dir` and the filename.

- [ ] **Step 2: Write the failing test**

Write `backend/tests/test_uploads_per_tenant.py`:

```python
import os


def _seed_tenant_with_admin_login(app, admin_client, tmp_data_dir, slug):
    from app.db.control_session import init_control_db, get_control_engine
    from app.core.engine_pool import init_pool
    from app.models.control_plane import SuperUser
    from app.core.security import hash_password
    from sqlalchemy.orm import Session
    init_control_db()
    init_pool(max_size=4)
    with Session(get_control_engine()) as s:
        if not s.query(SuperUser).first():
            s.add(SuperUser(email="op@zebra.io", hashed_password=hash_password("Op12345!")))
            s.commit()
    tok = admin_client.post("/api/admin/auth/login", json={"email": "op@zebra.io", "password": "Op12345!"}).json()["access_token"]
    h = {"Authorization": f"Bearer {tok}"}
    c = admin_client.post("/api/admin/companies", headers=h, json={
        "slug": slug, "name": slug.title(),
        "admin_email": f"admin@{slug}.test", "admin_full_name": "x"})
    temp = c.json()["temp_password"]
    from fastapi.testclient import TestClient
    tc = TestClient(app, base_url=f"http://{slug}.csat.test")
    # Initial login + change password so subsequent API calls behave normally.
    login = tc.post("/api/auth/login", json={"email": f"admin@{slug}.test", "password": temp})
    user_tok = login.json()["access_token"]
    return tc, {"Authorization": f"Bearer {user_tok}"}


def test_upload_path_isolated_per_tenant(app, tmp_data_dir, admin_client):
    tc_a, ha = _seed_tenant_with_admin_login(app, admin_client, tmp_data_dir, "acme")
    # Create a control on this tenant first (evidence is attached to a control).
    # Use the seeded CIS control with cis_id=1.
    # The endpoint shape may vary; adjust per evidence.py. Assumed:
    #   POST /api/controls/{id}/evidence with multipart "file" field.
    r = tc_a.get("/api/controls", headers=ha)
    assert r.status_code == 200
    control_id = r.json()[0]["id"]

    files = {"file": ("note.txt", b"hello acme", "text/plain")}
    up = tc_a.post(f"/api/controls/{control_id}/evidence", headers=ha, files=files)
    assert up.status_code in (200, 201), up.text

    # File landed under uploads/acme/, not under uploads/ root.
    acme_dir = os.path.join(tmp_data_dir["uploads_dir"], "acme")
    files_on_disk = os.listdir(acme_dir)
    assert any("hello acme" == open(os.path.join(acme_dir, f), "rb").read().decode() for f in files_on_disk)


def test_path_traversal_in_upload_filename_rejected(app, tmp_data_dir, admin_client):
    tc, h = _seed_tenant_with_admin_login(app, admin_client, tmp_data_dir, "acme")
    # The /uploads/{filename} handler should reject ../ attempts.
    r = tc.get("/uploads/../control.db", headers=h)
    assert r.status_code in (400, 404)
```

- [ ] **Step 3: Update the upload handler in `main.py`**

Replace the `get_upload` function in `backend/app/main.py` with:

```python
@app.get("/uploads/{filename:path}")
def get_upload(filename: str, request: Request, current_user: User = Depends(get_current_user)):
    if settings.is_saas:
        tenant = getattr(request.state, "tenant", None)
        if not tenant:
            raise HTTPException(status_code=404, detail="Not found")
        base = Path(upload_dir).resolve() / tenant.slug
    else:
        base = Path(upload_dir).resolve()
    base = base.resolve()
    target = (base / filename).resolve()
    try:
        target.relative_to(base)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid path")
    if not target.is_file():
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(target)
```

Don't forget to add `from fastapi import Request` at the top.

- [ ] **Step 4: Update `evidence.py` to write under the tenant subdir**

In `backend/app/api/evidence.py`, find where it constructs the upload path (something like `os.path.join(settings.upload_dir, filename)`). Wrap it:

```python
def _tenant_upload_dir(request: Request) -> str:
    base = settings.upload_dir
    if settings.is_saas:
        tenant = getattr(request.state, "tenant", None)
        if not tenant:
            raise HTTPException(status_code=404, detail="Not found")
        path = os.path.join(base, tenant.slug)
    else:
        path = base
    os.makedirs(path, exist_ok=True)
    return path
```

Then use `_tenant_upload_dir(request)` instead of `settings.upload_dir` everywhere a write happens. Add `request: Request` to any endpoint signature that needs it.

(Open the file and update each relevant function. The exact edits depend on the current shape — but the pattern is: replace direct uses of `settings.upload_dir` with `_tenant_upload_dir(request)` for writes.)

- [ ] **Step 5: Run the tests**

```bash
cd backend && pytest tests/test_uploads_per_tenant.py -v
```

Expected: PASS. If the evidence endpoint shape doesn't match the test (route or field names differ), adjust the test to match the real routes — but keep the assertion that the file lands in `uploads/<slug>/`.

- [ ] **Step 6: Commit**

```bash
git add backend/app/main.py backend/app/api/evidence.py backend/tests/test_uploads_per_tenant.py
git commit -m "feat(saas): scope uploads to per-tenant subdirectory"
```

---

### Task 16: Rate-limit key per tenant + cookie scope

**Files:**
- Modify: `backend/app/api/auth.py`
- Create: `backend/tests/test_rate_limit_per_tenant.py`

- [ ] **Step 1: Write the failing test**

Write `backend/tests/test_rate_limit_per_tenant.py`:

```python
def _seed_two(tmp_data_dir, admin_client):
    from app.db.control_session import init_control_db, get_control_engine
    from app.core.engine_pool import init_pool
    from app.models.control_plane import SuperUser
    from app.core.security import hash_password
    from sqlalchemy.orm import Session
    init_control_db()
    init_pool(max_size=4)
    with Session(get_control_engine()) as s:
        if not s.query(SuperUser).first():
            s.add(SuperUser(email="op@zebra.io", hashed_password=hash_password("Op12345!")))
            s.commit()
    tok = admin_client.post("/api/admin/auth/login", json={"email": "op@zebra.io", "password": "Op12345!"}).json()["access_token"]
    h = {"Authorization": f"Bearer {tok}"}
    for slug in ("acme", "beta"):
        admin_client.post("/api/admin/companies", headers=h, json={
            "slug": slug, "name": slug.title(),
            "admin_email": f"admin@{slug}.test", "admin_full_name": "x"})


def test_brute_on_acme_does_not_lock_beta(app, tmp_data_dir, admin_client):
    _seed_two(tmp_data_dir, admin_client)
    from fastapi.testclient import TestClient
    ca = TestClient(app, base_url="http://acme.csat.test")
    cb = TestClient(app, base_url="http://beta.csat.test")
    # Exhaust acme's per-IP, per-tenant budget.
    for _ in range(6):
        ca.post("/api/auth/login", json={"email": "x@x.com", "password": "wrong"})
    # acme: subsequent attempt rate-limited.
    r = ca.post("/api/auth/login", json={"email": "x@x.com", "password": "wrong"})
    assert r.status_code == 429
    # beta: untouched by the acme failures.
    rb = cb.post("/api/auth/login", json={"email": "x@x.com", "password": "wrong"})
    assert rb.status_code == 401
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
cd backend && pytest tests/test_rate_limit_per_tenant.py -v
```

Expected: FAIL — current keying is per-IP only, so beta is locked out too.

- [ ] **Step 3: Update the rate limit key**

In `backend/app/api/auth.py`, change `rate_limit_login`:

```python
def rate_limit_login(request: Request):
    client_ip = request.client.host if request.client else "unknown"
    tenant = getattr(getattr(request.state, "tenant", None), "slug", "_single_")
    key = f"{tenant}:{client_ip}"
    now = time()
    window = [t for t in RATE_LIMIT_STORE[key] if now - t < RATE_LIMIT_WINDOW]
    RATE_LIMIT_STORE[key] = window
    if len(window) >= RATE_LIMIT_MAX:
        raise HTTPException(status_code=429, detail="Too many login attempts. Please try again later.")
    window.append(now)
```

- [ ] **Step 4: Confirm cookies set without `Domain` attribute**

Grep the codebase:

```bash
cd backend && grep -n "set_cookie\|response.set_cookie" app/api/*.py
```

Verify none of the `set_cookie` calls pass a `domain=` argument. If any do, remove that argument. (As of writing they don't — this step is a safety check.)

- [ ] **Step 5: Run the tests**

```bash
cd backend && pytest tests/test_rate_limit_per_tenant.py -v
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/auth.py backend/tests/test_rate_limit_per_tenant.py
git commit -m "feat(saas): rate-limit keyed per (tenant, ip); verify cookies are subdomain-scoped"
```

---

### Task 17: Ad-hoc backup endpoint

**Files:**
- Modify: `backend/app/services/tenant_provisioning.py`
- Modify: `backend/app/api/admin.py`
- Create: `backend/tests/test_backup_endpoint.py`

The full backup script + scheduler integration lives in Plan C. Plan A adds only the Python helper + endpoint so the super-admin can trigger a snapshot now.

- [ ] **Step 1: Write the failing test**

Write `backend/tests/test_backup_endpoint.py`:

```python
import os
import tarfile


def _setup(admin_client, tmp_data_dir):
    from app.db.control_session import init_control_db, get_control_engine
    from app.core.engine_pool import init_pool
    from app.models.control_plane import SuperUser
    from app.core.security import hash_password
    from sqlalchemy.orm import Session
    init_control_db()
    init_pool(max_size=4)
    with Session(get_control_engine()) as s:
        if not s.query(SuperUser).first():
            s.add(SuperUser(email="op@zebra.io", hashed_password=hash_password("Op12345!")))
            s.commit()
    tok = admin_client.post("/api/admin/auth/login", json={"email": "op@zebra.io", "password": "Op12345!"}).json()["access_token"]
    h = {"Authorization": f"Bearer {tok}"}
    admin_client.post("/api/admin/companies", headers=h, json={
        "slug": "acme", "name": "Acme", "admin_email": "a@b.c", "admin_full_name": "x"})
    return h


def test_backup_endpoint_creates_archive(admin_client, tmp_data_dir):
    h = _setup(admin_client, tmp_data_dir)
    r = admin_client.post("/api/admin/companies/acme/backup", headers=h)
    assert r.status_code == 200, r.text
    archive = r.json()["archive_path"]
    assert os.path.exists(archive)
    with tarfile.open(archive) as t:
        names = t.getnames()
        assert any(n.endswith("acme.db") for n in names)
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
cd backend && pytest tests/test_backup_endpoint.py -v
```

Expected: FAIL — endpoint and helper don't exist.

- [ ] **Step 3: Add `snapshot_tenant` to the provisioning service**

Append to `backend/app/services/tenant_provisioning.py`:

```python
import tarfile
from datetime import datetime


def snapshot_tenant(slug: str, backups_dir: str = "./backups") -> str:
    """Produce a tar.gz of <slug>.db + uploads/<slug>/. Returns archive path."""
    with Session(get_control_engine()) as cs:
        c = cs.query(Company).filter_by(slug=slug).first()
        if not c:
            raise LookupError(slug)
        db_path = c.db_path
        upload_subdir = _tenant_uploads_dir(slug)

    os.makedirs(backups_dir, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    archive_path = os.path.join(backups_dir, f"{slug}-{ts}.tar.gz")
    with tarfile.open(archive_path, "w:gz") as tar:
        if os.path.exists(db_path):
            tar.add(db_path, arcname=f"{slug}/{os.path.basename(db_path)}")
        if os.path.isdir(upload_subdir):
            tar.add(upload_subdir, arcname=f"{slug}/uploads")
    return archive_path
```

- [ ] **Step 4: Add the endpoint to `admin.py`**

Append to `backend/app/api/admin.py`:

```python
from app.services.tenant_provisioning import snapshot_tenant
from app.services.tenant_audit import log_super_action


class BackupResponse(BaseModel):
    archive_path: str


@router.post("/companies/{slug}/backup", response_model=BackupResponse)
def backup_company(slug: str, current: SuperUser = Depends(require_superadmin)):
    try:
        path = snapshot_tenant(slug)
    except LookupError:
        raise HTTPException(status_code=404, detail="Not found")
    log_super_action("company.backup", current.id, None, {"slug": slug, "path": path})
    return BackupResponse(archive_path=path)
```

- [ ] **Step 5: Run the tests**

```bash
cd backend && pytest tests/test_backup_endpoint.py -v
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/tenant_provisioning.py backend/app/api/admin.py backend/tests/test_backup_endpoint.py
git commit -m "feat(saas): ad-hoc per-tenant backup endpoint"
```

---

### Task 18: End-to-end happy path test + dev auto-seed

**Files:**
- Modify: `backend/app/main.py` (auto-seed `dev` tenant in dev+saas mode)
- Create: `backend/tests/test_end_to_end_lifecycle.py`

- [ ] **Step 1: Write the failing test**

Write `backend/tests/test_end_to_end_lifecycle.py`:

```python
def test_end_to_end(app, tmp_data_dir, admin_client):
    """Full lifecycle: super-admin creates tenant, tenant admin logs in,
    changes password, sees seeded controls, super-admin suspends, tenant 404s."""
    from app.db.control_session import init_control_db, get_control_engine
    from app.core.engine_pool import init_pool
    from app.models.control_plane import SuperUser
    from app.core.security import hash_password
    from sqlalchemy.orm import Session
    from fastapi.testclient import TestClient
    init_control_db()
    init_pool(max_size=4)

    with Session(get_control_engine()) as s:
        s.add(SuperUser(email="op@zebra.io", hashed_password=hash_password("Op12345!")))
        s.commit()

    # 1. Super-admin login
    su = admin_client.post("/api/admin/auth/login", json={"email": "op@zebra.io", "password": "Op12345!"})
    assert su.status_code == 200
    sh = {"Authorization": f"Bearer {su.json()['access_token']}"}

    # 2. Create tenant
    r = admin_client.post("/api/admin/companies", headers=sh, json={
        "slug": "acme", "name": "Acme",
        "admin_email": "admin@acme.test", "admin_full_name": "Admin"})
    assert r.status_code == 201
    temp = r.json()["temp_password"]

    # 3. Tenant admin login on the subdomain
    tc = TestClient(app, base_url="http://acme.csat.test")
    login = tc.post("/api/auth/login", json={"email": "admin@acme.test", "password": temp})
    assert login.status_code == 200
    ut = login.json()["access_token"]
    uh = {"Authorization": f"Bearer {ut}"}

    # 4. /me reports must_change_password
    me = tc.get("/api/auth/me", headers=uh).json()
    assert me["must_change_password"] is True

    # 5. Change password
    cp = tc.post("/api/auth/change-password", headers=uh,
                 json={"current_password": temp, "new_password": "MyNewPass1!"})
    assert cp.status_code == 200

    # 6. Controls are seeded (18 of them)
    cs = tc.get("/api/controls", headers=uh)
    assert cs.status_code == 200
    assert len(cs.json()) == 18

    # 7. Super-admin suspends
    admin_client.post("/api/admin/companies/acme/suspend", headers=sh)

    # 8. Tenant subdomain now returns 404 for /health (middleware-level reject)
    assert tc.get("/health").status_code == 404
```

- [ ] **Step 2: Run it and confirm it passes**

```bash
cd backend && pytest tests/test_end_to_end_lifecycle.py -v
```

Expected: PASS. (If the controls endpoint shape differs, adjust the assertion.)

- [ ] **Step 3: Add dev auto-seed of a `dev` tenant**

In `backend/app/main.py`, extend the `lifespan` to seed a `dev` tenant when running in dev+saas mode:

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    if settings.is_saas:
        from app.db.control_session import init_control_db, get_control_engine
        from app.core.engine_pool import init_pool
        from app.models.control_plane import Company, SuperUser
        from app.services.tenant_provisioning import create_tenant
        from app.core.security import hash_password
        from sqlalchemy.orm import Session
        init_control_db()
        init_pool(max_size=settings.engine_pool_max_size)
        if settings.is_dev:
            with Session(get_control_engine()) as s:
                if not s.query(SuperUser).first():
                    s.add(SuperUser(email="op@zebra.local", hashed_password=hash_password("Op12345!")))
                    s.commit()
                if not s.query(Company).filter_by(slug=settings.dev_tenant_slug).first():
                    create_tenant(slug=settings.dev_tenant_slug, name="Dev Tenant",
                                  admin_email="admin@csat.local", admin_full_name="Dev Admin",
                                  super_user_id=None)
                    # Override the random temp password with the well-known dev one.
                    from app.models.user import User
                    from app.core.engine_pool import get_pool
                    c = s.query(Company).filter_by(slug=settings.dev_tenant_slug).first()
                    engine = get_pool().get_or_open(c)
                    with Session(engine) as ts:
                        u = ts.query(User).filter_by(email="admin@csat.local").first()
                        u.hashed_password = hash_password("Admin123!")
                        u.must_change_password = False
                        ts.commit()
    else:
        init_db()
        from app.db.session import SessionLocal
        db = SessionLocal()
        try:
            seed_database(db)
        finally:
            db.close()
    init_scheduler(enabled=settings.scheduler_enabled)
    yield
    shutdown_scheduler()
```

- [ ] **Step 4: Manual smoke test (optional but recommended)**

```bash
cd backend && CSAT_MODE=saas CSAT_ENV=dev python run.py &
sleep 2
curl -s -H "X-Tenant-Slug: dev" http://localhost:8080/health
# {"status":"ok"}
curl -s -H "X-Tenant-Slug: dev" -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@csat.local","password":"Admin123!"}' | head -c 200
# returns a token
kill %1
```

Expected: health returns 200; login returns a token.

- [ ] **Step 5: Run the full test suite**

```bash
cd backend && pytest -v
```

Expected: every test in `tests/` passes.

- [ ] **Step 6: Commit**

```bash
git add backend/app/main.py backend/tests/test_end_to_end_lifecycle.py
git commit -m "feat(saas): dev-mode auto-seed of dev tenant + e2e lifecycle test"
```

---

## After Plan A

When all 18 tasks are committed and the suite is green on `feat/saas`:

1. Push the branch: `git push -u origin feat/saas`.
2. The backend is multi-tenant via curl/API. Frontend still expects single-tenant.
3. **Next step**: write Plan B (frontend AdminApp + change-password screen). Hand back to brainstorming / writing-plans with the spec section §8 as input.
