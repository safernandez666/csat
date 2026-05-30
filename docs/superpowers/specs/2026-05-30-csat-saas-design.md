# CSAT SaaS — Multi-tenant Branch Design

**Status:** Draft
**Date:** 2026-05-30
**Branch:** `feat/saas` (paralela permanente a `main`)
**Author:** Santiago Fernandez

---

## 1. Goal and non-goals

### Goal
Add a parallel `feat/saas` branch that turns CSAT into a multi-tenant SaaS where the **operator** (Santiago) provisions companies, each living in its own SQLite database, accessed via a per-company subdomain (`<slug>.csat.<domain>`). `main` keeps the single-tenant self-hosted model unchanged.

### Non-goals (MVP)
Public signup, billing, plan-based limits, transactional email, cross-tenant SSO, impersonation, automatic single-tenant→SaaS migration, multi-region, advanced metrics, public API/keys.

---

## 2. Decisions taken during brainstorming

| Decision | Choice |
|---|---|
| Tenant onboarding | Operator-only (no public signup) |
| Data isolation | One SQLite database per tenant |
| Tenant routing | Subdomain (`<slug>.csat.<domain>`) + wildcard DNS/TLS |
| Branch strategy | Permanent parallel branch (`feat/saas`); `main` stays single-tenant |
| Connection strategy | LRU pool of SQLAlchemy engines keyed by tenant slug |
| MVP scope | Super-admin panel (create/list/suspend + initial admin), basic per-tenant metrics, per-tenant backups |
| Frontend | Same SPA bundle; `AdminApp` mounted when `hostname.startsWith("admin.")` |

---

## 3. Architecture

```
                  *.csat.<domain>  (wildcard DNS + wildcard TLS)
                                │
                                ▼
                    ┌───────────────────────┐
                    │   nginx / proxy       │
                    │   (Host-aware)        │
                    └───────────┬───────────┘
                                │  Host: acme.csat.<domain>
                                ▼
                  ┌─────────────────────────────┐
                  │   FastAPI (single process)  │
                  │                             │
                  │  TenantMiddleware           │
                  │    - read Host              │
                  │    - lookup in control plane│
                  │    - inject engine          │
                  │                             │
                  │  EnginePool (LRU)           │
                  │    acme  → engine_acme      │
                  │    beta  → engine_beta      │
                  │    admin → engine_cp        │
                  └─────────────┬───────────────┘
                                │
                ┌───────────────┼────────────────┐
                ▼               ▼                ▼
         control.db       tenants/acme.db   tenants/beta.db
         (companies,      (full single-     (full single-
          super_users,    tenant schema)    tenant schema)
          tenant_audit)

         uploads/
           acme/         (file-isolated)
           beta/
```

Three categories of host:
- `<slug>.csat.<domain>` → tenant app, opens `tenants/<slug>.db`
- `admin.csat.<domain>` → super-admin panel, opens `control.db`, requires `SuperUser`
- Root domain `csat.<domain>` → 302 to `admin.csat.<domain>/login` (or static landing — not in MVP)

Reserved subdomains: `{admin, www, api}` cannot be used as tenant slugs.

A missing or suspended tenant returns **404** (never 403 or "tenant suspended" — avoid leaking existence).

---

## 4. Data model

Two completely separate schemas. Nothing crosses between them at the ORM layer.

### 4.1 Control plane (`control.db`) — new

```python
class Company(Base):
    id: int (pk)
    slug: str (unique, indexed)         # "acme" → acme.csat.<domain>
    name: str
    db_path: str                        # "data/tenants/acme.db"
    status: str                         # "active" | "suspended" | "failed"
    created_at: datetime
    suspended_at: datetime | None

class SuperUser(Base):                  # Operator accounts. Disjoint from tenant Users.
    id: int (pk)
    email: str (unique)
    hashed_password: str                # Argon2id, same params as User
    mfa_enabled: bool
    created_at, updated_at

class TenantAuditLog(Base):             # Append-only operator actions
    id: int (pk)
    super_user_id: int (fk)
    company_id: int (fk, nullable)
    action: str                         # "company.create" | "company.suspend"
                                        # | "company.activate" | "admin.reset_password"
                                        # | "company.backup"
    metadata: JSON
    created_at: datetime
```

### 4.2 Tenant DB (`tenants/<slug>.db`) — **identical to today's `main` schema**

No changes. Models stay as they are: `User`, `Role`, `Control`, `Safeguard`, `Evidence`, `Comment`, `AuditLog`, `Assignment`, `ReviewSchedule`, `Setting`, `ChatMessage`. No `company_id` columns anywhere — isolation is by DB file.

**One additive field** to support the must-change-password flow on first login:
```python
User.must_change_password: bool (default False)
```
This is the only schema change vs. `main` in tenant DBs. Since `main.metadata.create_all` is idempotent for *new* tables but not for new columns on existing tables, the field is introduced cleanly in `feat/saas` from day one — fresh tenants get it.

### 4.3 Filesystem layout

```
backend/
  data/
    control.db
    tenants/
      acme.db
      beta.db
  uploads/
    acme/
      <files>
    beta/
      <files>
```

`/uploads/{filename}` handler is extended: resolves to `uploads/<tenant_slug_from_token>/<filename>`, applies the existing `Path.resolve().relative_to(...)` check against `uploads/<tenant_slug>/`. Same path-traversal protection model as today, scoped to the tenant's subdir.

---

## 5. Routing, auth, middleware

### 5.1 TenantMiddleware (new — `backend/app/core/tenant.py`)

```python
RESERVED = {"admin", "www", "api"}

class TenantMiddleware:
    async def __call__(self, request, call_next):
        host = request.headers.get("host", "").split(":")[0]

        # Dev escape
        if settings.csat_env == "dev" and host in ("localhost", "127.0.0.1"):
            slug = request.headers.get("x-tenant-slug", "dev")
        else:
            slug = host.split(".")[0] if "." in host else None

        if slug == "admin":
            request.state.tenant = None
            request.state.engine = control_plane_engine
            request.state.is_admin_plane = True
        elif slug and slug not in RESERVED:
            company = control_plane.lookup(slug=slug)
            if not company or company.status != "active":
                return JSONResponse({"detail": "Not found"}, status_code=404)
            request.state.tenant = company
            request.state.engine = engine_pool.get_or_open(company)
            request.state.is_admin_plane = False
        else:
            return JSONResponse({"detail": "Not found"}, status_code=404)

        return await call_next(request)
```

### 5.2 EnginePool (new — `backend/app/core/engine_pool.py`)

```python
class EnginePool:
    def __init__(self, max_size: int = 128):
        self._engines: OrderedDict[str, Engine] = OrderedDict()
        self._lock = threading.Lock()
        self.max_size = max_size

    def get_or_open(self, company: Company) -> Engine:
        with self._lock:
            if company.slug in self._engines:
                self._engines.move_to_end(company.slug)
                return self._engines[company.slug]
            engine = create_engine(
                f"sqlite:///{company.db_path}",
                connect_args={"check_same_thread": False},
            )
            self._engines[company.slug] = engine
            if len(self._engines) > self.max_size:
                evicted_slug, evicted_engine = self._engines.popitem(last=False)
                evicted_engine.dispose()
            return engine
```

Cap configured via `ENGINE_POOL_MAX_SIZE` env (default 128).

### 5.3 `get_db()` change (minimal)

```python
def get_db(request: Request) -> Generator[Session, None, None]:
    SessionLocal = sessionmaker(
        bind=request.state.engine, autocommit=False, autoflush=False
    )
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

All existing tenant endpoints that depend on `get_db` are automatically scoped to the right tenant.

### 5.4 JWT changes

Tenant token payload:
```json
{ "sub": "12", "tenant": "acme", "roles": ["Admin"], "exp": ... }
```

Super-admin token payload:
```json
{ "sub": "1", "tenant": "__admin__", "roles": ["SuperAdmin"], "exp": ... }
```

`get_current_user` rejects with 401 if `token.tenant != request.state.tenant.slug` (or, for admin plane, if `token.tenant != "__admin__"`). This is the fail-closed safety net should subdomain routing ever break.

### 5.5 Cookies

- Set without `Domain` attribute → scoped to the issuing subdomain.
- `SameSite=Lax`, `Secure=True` in prod, `HttpOnly=True` (unchanged).
- Cross-subdomain SSO is intentionally not supported.

### 5.6 Rate limit

Login rate-limit key changes from `ip` to `f"{tenant_slug}:{ip}"`. Still in-memory per-process; pre-existing limitation, documented in §10.

### 5.7 Super-admin endpoints (new — `backend/app/api/admin.py`)

Routes are always registered on the FastAPI app. The `require_superadmin` dependency rejects any request where `request.state.is_admin_plane` is false **or** the token's `tenant` claim is not `"__admin__"`. A tenant request that somehow hits `/api/admin/*` returns 401, not 404, since the route exists.

```
POST   /api/admin/auth/login
POST   /api/admin/auth/logout
GET    /api/admin/auth/me
POST   /api/admin/companies                       → create (returns one-time temp password)
GET    /api/admin/companies                       → list w/ inline metrics
GET    /api/admin/companies/{slug}                → detail
POST   /api/admin/companies/{slug}/suspend
POST   /api/admin/companies/{slug}/activate
POST   /api/admin/companies/{slug}/admin-reset    → returns new temp password
POST   /api/admin/companies/{slug}/backup         → returns archive path
GET    /api/admin/audit                           → tenant audit log
```

Role guard: `require_superadmin` (new in `app/core/security.py`), symmetrical to `require_admin` but checks against `SuperUser`.

---

## 6. Tenant lifecycle

### 6.1 Create — `POST /api/admin/companies`

Body: `{ slug, name, admin_email, admin_full_name }`.

1. Validate `slug`: regex `^[a-z][a-z0-9-]{1,30}$`, not in `RESERVED`, not already in `Company`.
2. Insert `Company(slug, name, db_path="data/tenants/<slug>.db", status="active")`.
3. Create `data/tenants/<slug>.db`, run `Base.metadata.create_all` against it.
4. Run `seed_database` (18 controls + safeguards + IG mapping + default roles).
5. Create `User` with role `Admin`, generated password via `secrets.token_urlsafe(16)`, `must_change_password=True`.
6. `os.makedirs("uploads/<slug>", exist_ok=True)`.
7. Insert `TenantAuditLog(action="company.create", ...)`.
8. Respond `201 { slug, admin_email, temp_password }`. The temp password is shown **once** in the UI with a copy button.

Failure recovery: any post-row exception → delete `.db` file, delete `uploads/<slug>` if empty, mark `Company.status = "failed"`, log in audit.

### 6.2 Suspend / Activate

`status` flip on the `Company` row. Middleware enforces. Existing sessions die on next request (middleware runs before auth).

### 6.3 Reset admin password — `POST /api/admin/companies/{slug}/admin-reset`

Opens engine to tenant, finds the **first** `User` with role `Admin` (by id ascending), regenerates password via `secrets.token_urlsafe(16)`, sets `must_change_password=True`. Returns the new temp password once. Logs to `TenantAuditLog`.

### 6.4 Must-change-password flow (new on tenant side)

- Backend: `POST /api/auth/change-password` accepts current + new password, clears `must_change_password`.
- Frontend: `/me` returns `must_change_password`; if true, SPA forces redirect to `/change-password` and gates all other routes.

---

## 7. Operations

### 7.1 Backups

`scripts/backup.sh` rewritten:
1. Open `control.db`, list **all** `Company` rows (active + suspended — suspended tenants still need backups; only `status="failed"` is skipped).
2. For each, emit `backups/<slug>-YYYYMMDD-HHMMSS.tar.gz` containing `tenants/<slug>.db` + `uploads/<slug>/`.
3. Emit `backups/control-YYYYMMDD-HHMMSS.tar.gz` for the control plane.

Ad-hoc trigger: `POST /api/admin/companies/{slug}/backup` shells out to the same logic for a single tenant; returns archive path.

### 7.2 Restore

`scripts/restore.sh <archive> <slug>`. Extracts into `tenants/<slug>.db` + `uploads/<slug>/`. If slug doesn't exist in control plane, creates a `Company` row pointed at the restored file. Documented; no UI in MVP.

### 7.3 Schema migrations — **explicit debt**

The MVP introduces no further schema changes after the `must_change_password` field. Before any next change to tenant-side models, the team must:
1. Install Alembic.
2. Build a `migrate_all_tenants()` routine that iterates `Company` via control plane and runs migrations against each.

This is recorded in §10.

### 7.4 Scheduler

`review_reminder_job` becomes: iterate `Company.status == "active"`, open engine via pool, run reminder logic per tenant. Still log-only; no email side-effect. Single-process APScheduler (no distributed lock).

### 7.5 Dev workflow

- `CSAT_ENV=dev` activates the `X-Tenant-Slug` header escape on `localhost`.
- A `dev` tenant is seeded automatically at startup if it doesn't exist (parity with current single-tenant DX).
- For super-admin testing locally: `X-Tenant-Slug: __admin__` or open `http://admin.localhost:5173/`.
- Vite dev: `frontend/src/lib/api.ts` adds `X-Tenant-Slug` header from a Vite env (`VITE_DEV_TENANT_SLUG`, default `dev`).

### 7.6 Docker

New `docker-compose.saas.yml` (does not modify `docker-compose.yml`):
- nginx with `server_name *.csat.<domain>` + admin
- Shared volume holds `control.db` + `tenants/` + `uploads/`
- `CSAT_MODE=saas` env triggers middleware mounting in `main.py`
- Healthcheck → `http://admin.csat.<domain>/health`

---

## 8. Frontend

### 8.1 Tenant SPA (existing — minimal change)

- API helper unchanged in prod (cookies + same-origin per subdomain).
- In dev only, `fetchJson` adds `X-Tenant-Slug` from `import.meta.env.VITE_DEV_TENANT_SLUG`.
- New `/change-password` route, gated by `must_change_password` from `/me`.

### 8.2 Super-admin panel (new, same bundle)

Mount logic in `App.tsx`:
```tsx
const isAdmin = window.location.hostname.startsWith("admin.")
  || new URLSearchParams(window.location.search).get("admin") === "1";  // dev escape

return isAdmin ? <AdminApp /> : <TenantApp />;
```

Screens:
1. `admin.csat.<domain>/login` — super-admin login.
2. `/companies` — table: slug, name, status, users, storage, created_at, last_login. Actions: Suspend / Activate / Reset admin / Backup now.
3. `/companies/new` — form (slug, name, admin email, admin full name) → modal shows temp password **once** with copy button.
4. `/companies/<slug>` — metrics + filtered audit log.
5. `/audit` — full `TenantAuditLog`.

Visual language: same Tailwind tokens, `rounded-xl`, `bg-card/95`, Lucide, Inter. Same brand, different functional area.

### 8.3 Branding per tenant (free)

`GET /api/branding/logo` already reads `Setting('company_logo_url')`. Because the middleware resolves the tenant *before* dependencies run, the endpoint automatically returns the correct tenant's logo with no code changes. Each subdomain's login screen shows its own brand.

---

## 9. Security considerations

- **Path traversal on uploads**: existing `Path.resolve().relative_to(base)` check extended to `uploads/<tenant>/`. Refuse anything resolving outside the tenant's subdir.
- **JWT tenant claim**: enforced server-side as a second layer behind subdomain routing.
- **Cookie scope**: no `Domain` attribute → no cross-tenant cookie leak.
- **Admin plane isolation**: `SuperUser` table lives only in `control.db`. Tenant `User` table is never queried with super-admin credentials and vice versa.
- **Suspended-tenant enumeration**: 404, not 403; never reveal that a slug exists if it's not active.
- **Per-tenant rate limit key**: prevents brute force on one tenant from locking out another.
- **Audit append-only**: `TenantAuditLog` follows the same write-only convention as today's `AuditLog`.
- **Temp passwords**: shown once in the UI; not persisted in `TenantAuditLog` metadata.

---

## 10. Out of scope and known debt

### Explicitly out of scope (MVP)
Billing, plan limits, public signup, email verification, transactional email, cross-tenant SSO, super-admin impersonation, automatic single→SaaS migration, multi-region, advanced metrics dashboards, public API/keys.

### Known debt introduced by this MVP
1. **No Alembic** — first new column on a tenant-side table after MVP requires installing Alembic + writing `migrate_all_tenants`.
2. **Engine pool has no observability** — no hit/miss/eviction metrics. Fine for <100 tenants.
3. **Rate limit is in-memory per-process** (pre-existing) — keyed by `{tenant}:{ip}` now, still incoherent with >1 worker.
4. **APScheduler is in-process** — running >1 worker would duplicate reminder jobs. MVP runs single worker.
5. **Backups not encrypted** — same as today. Encrypt if archives leave your infra.

---

## 11. Done criteria

- [ ] Create a company from `admin.csat.<domain>`, copy temp password, log into `<slug>.csat.<domain>`, get forced through `/change-password`, then use the app normally.
- [ ] Create a second company; verify on filesystem that no row from company A appears in `tenants/<slug-b>.db` and no upload from A is in `uploads/<slug-b>/`.
- [ ] Suspend a company → login returns 404 (not 403, not "suspended").
- [ ] Ad-hoc backup from panel produces a `.tar.gz` with `.db` + `uploads/<slug>/`.
- [ ] `TenantAuditLog` shows `company.create`, `company.suspend`, `admin.reset_password`, `company.backup` rows.
- [ ] In dev, `X-Tenant-Slug: dev` works end-to-end without DNS configuration.
- [ ] `main` branch unchanged and still functional as single-tenant.
