# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

CSAT — a self-hosted FastAPI + React 19 platform for tracking CIS Controls v8 compliance. SQLite-backed, JWT auth with Argon2id, RBAC across four roles (Admin, Security Analyst, Auditor, Viewer). Architecture is intentionally connector-ready for future OIDC / Wazuh / OpenVAS / TheHive integrations (`backend/app/connectors/*` are stubs implementing `BaseConnector`).

## Commands

Top-level Makefile wraps Docker Compose + dev:

- `make dev-backend` — `cd backend && python run.py` (uvicorn with reload)
- `make dev-frontend` — `cd frontend && npm run dev`
- `make build` / `make up` / `make down` / `make logs` — Docker Compose lifecycle
- `make test` — runs `npx ship-safe audit .` (security audit; there is no Python/JS test suite — `backend/tests/` and `backend/alembic/` are empty)
- `make push-backend` / `make push-frontend` / `make push-all` — multi-arch (`linux/amd64,linux/arm64`) buildx push to Docker Hub under `safernandez666/csat-*`. Requires a `multiarch` buildx builder.
- Operational helpers in `scripts/`: `backup.sh` (snapshot SQLite + `uploads/` to `./backups/`), `restore.sh <archive>`, `reset-data.sh [--yes]` (wipes the `csat_csat-data` and `csat_csat-uploads` Docker volumes — volume names derive from the directory name).

Frontend (in `frontend/`):
- `npm run dev` — Vite dev server on **5173**, proxies `/api` → `http://localhost:8080`
- `npm run build` — `tsc -b && vite build`
- `npm run lint` — ESLint flat config

Backend (in `backend/`, requires venv + `pip install -r requirements.txt`):
- `python run.py` — uvicorn on **8080** with `reload=True`
- No migrations: schema is created on startup via `Base.metadata.create_all` in `app/db/session.py:init_db`. Alembic dir exists but is empty.
- DB seeding runs every startup via `app/utils/seed.py:seed_database` — idempotent for the 18 CIS controls + safeguards + default users + roles.

### Port gotcha

Local dev and Docker use **different ports**, and the Vite proxy is hardcoded to dev:
- Local dev: backend on **8080** (`backend/run.py`), Vite proxy targets `localhost:8080`
- Docker: backend container exposes **8000** (`backend/Dockerfile` `CMD ... --port 8000`), nginx proxies `/api/` → `backend:8000`, healthcheck hits `:8000/health`
- The `docker-compose.yml` healthcheck `curl http://localhost:8000/health` runs *inside* the backend container, not the host

If switching modes, do not change `run.py` to 8000 — Vite's proxy expects 8080 in dev.

## Architecture

### Request flow
Browser (port 80 in Docker / 5173 in dev) → nginx or Vite proxy → FastAPI `/api/*` routes → SQLAlchemy ORM → SQLite (`csat.db`). Uploads are served by an authenticated handler (`GET /uploads/{filename}` in `app/main.py`), not `StaticFiles` — see "Upload auth model" below.

### Auth model (`app/core/security.py`)
- Argon2id password hashing with tunable cost (`ARGON2_*` env vars)
- JWT HS256: 15-min access token, 7-day refresh token, both signed with `SECRET_KEY`
- `get_current_user` reads token from **either** `Authorization: Bearer` header **or** `access_token` cookie — frontend uses cookies (`credentials: "include"` in `frontend/src/lib/api.ts`)
- Role gates: `require_admin`, `require_analyst`, `require_auditor`, `require_viewer` — each accepts a *superset* of higher-privilege roles (e.g., `require_analyst` allows `Admin` too)
- Login rate limit is **in-memory per-process** (`RATE_LIMIT_STORE` in `app/api/auth.py`), 5/min per IP — does not survive restart, does not work across multiple workers

### Lifespan (`app/main.py`)
On startup: configure structlog → `init_db()` → seed database → start APScheduler. The scheduler runs `review_reminder_job` daily at 09:00 UTC; it currently only logs upcoming review dates (no email/notification side-effect yet). Disable with `SCHEDULER_ENABLED=false`.

### Production startup guard
`app/core/config.py:Settings.validate_runtime` runs at import time. If `CSAT_ENV != dev` and `SECRET_KEY` matches a known default (`dev-secret-key-change-me`, `change-me-in-production`, or empty), the process refuses to start. Either set a real `SECRET_KEY` or keep `CSAT_ENV=dev` for local work — do *not* hand-edit the guard.

### Upload auth model (`app/main.py`)
Uploads are *not* publicly served. Two routes touch the upload dir, both with path-traversal protection (resolve → `relative_to(base)`):
- `GET /uploads/{filename}` — requires `get_current_user`; this is what the SPA hits for evidence files.
- `GET /api/branding/logo` — the **only** public read; resolves whatever `Setting('company_logo_url')` points at, refuses anything outside `/uploads/`. Used by the login screen before auth.

If you add another public file route, mirror the path-traversal check or it becomes a directory-traversal hole.

### Domain model
Core entity is `Control` (the 18 CIS Controls v8) with child `Safeguard` rows. Each safeguard is tagged with an Implementation Group (`ig1`/`ig2`/`ig3`) via `app/utils/cis_ig_map.py:SAFEGUARD_IG`. Compliance score on the dashboard is computed from safeguard `implementation_status`, weighted by IG. Other entities (`Evidence`, `Comment`, `AuditLog`, `Assignment`, `ReviewSchedule`, `Setting`) all hang off `Control` or `User`.

`AuditLog` is append-only by convention — write via `app/services/audit_service.py:log_action`, never mutate.

### Connectors
`app/connectors/` are scaffolds only. All implement `BaseConnector` (`configure`, `health_check`, `fetch_evidence`). Wiring into evidence ingestion is not yet built — the AI connector is the only one with an active endpoint (`/api/ai/*`).

### AI assistant (`app/api/ai.py`, `connectors/ai_analysis.py`)
Three providers selected at runtime, **not** via env vars: `ollama` (default), `openai`, `anthropic`. Provider, model, API URL and key are stored as rows in the `settings` table and edited from the UI at `Settings → AI`. The Docker default API URL is `http://host.docker.internal:11434` (compose sets `extra_hosts` so this also works on Linux).

Endpoints:
- `POST /api/ai/chat` — grounded in current posture data (controls/safeguards summary is injected into the system prompt). Persists `ChatMessage` rows per user; conversation memory is replayed from the DB, not held in process.
- `GET /api/ai/chat/history`, `DELETE /api/ai/chat/history` — per-user.
- `GET /api/ai/quick-wins` — heuristic ranking + LLM rationale (gracefully degrades to heuristic-only if the provider fails).
- `GET/PUT /api/ai/config`, `POST /api/ai/health` — admin config + provider reachability check.

When the LLM is unreachable, code paths fall back: Quick Wins still ranks heuristically, PDF reports use a templated executive summary. Don't add hard dependencies on AI output without a fallback.

### Frontend
React 19 + Vite 8 + Tailwind 4 + Recharts. Routing is hand-rolled in `App.tsx` via `window.location.pathname` matching — no router library. Auth gate is a single `fetch("/api/auth/me")` on mount; on 401 anywhere, `frontend/src/lib/api.ts:fetchJson` does `window.location.replace("/login")`. All API calls funnel through that one helper. Theme (dark/light) is toggled by adding/removing the `dark` class on `<html>` and persisted in `localStorage`.

UI conventions: Tailwind CSS variables (`--background`, `--card`, `--border`, `--muted`, `--accent`, `--foreground`), `rounded-xl` cards with `bg-card/95` + `backdrop-blur`, `fade-in-up` animations, Lucide icons, Inter font. See `docs/ARCHITECTURE.md` for the full design system.

## Default credentials (dev)

`admin@csat.local / Admin123!` and `analyst@csat.local / Analyst123!` — seeded on every startup. Change before any non-local deployment.

## ship-safe annotations

The codebase uses `// ship-safe-ignore: <reason>` and `# ship-safe-ignore <RULE_ID>: <reason>` inline comments to suppress false positives from `npx ship-safe audit`. Preserve existing ones when editing nearby code; if you add a real suppression, include the rule ID and a reason. State is tracked in `.ship-safe/{context,history}.json`.

## Environment

Configured via `.env` (see `.env.example`). Backend reads via Pydantic Settings in `app/core/config.py`. `CORS_ORIGINS` is comma-separated and parsed by the `cors_origin_list` property. `DATABASE_URL` defaults to local SQLite; the SQLAlchemy engine only sets `check_same_thread=False` when the URL starts with `sqlite`.

Notable env vars not in `.env.example` but read by `Settings`: `MAX_UPLOAD_SIZE_MB` (default 25), `ALGORITHM` (JWT alg, default HS256), `AI_DEFAULT_URL` (compose-only — used to seed the AI settings row on first run, not read at request time).
