# CSAT — CIS Controls Assessment & Tracking Platform

Open-source, self-hosted platform for managing CIS Controls v8 manually with future-ready architecture for external integrations.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        React 19 Frontend                     │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────────┐ │
│  │ Dashboard│ │ Controls │ │ Evidence │ │ Users & Settings│ │
│  └─────────┘ └──────────┘ └──────────┘ └─────────────────┘ │
│  Tailwind 4 · Vite 8 · Recharts · jsPDF · motion           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ REST API + JWT
┌─────────────────────────────────────────────────────────────┐
│                     FastAPI Backend                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐ │
│  │ Auth/    │ │ Controls │ │ Evidence │ │ Audit & Report │ │
│  │ RBAC     │ │ CRUD     │ │ Upload   │ │ PDF Export     │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────────────┘ │
│  JWT · Argon2 · APScheduler · structlog · SQLite            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  SQLite  │  Future: PostgreSQL / OAuth / Wazuh / TheHive    │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Local Development

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python run.py

# Frontend
cd frontend
npm install
npm run dev
```

### Docker (Production)

```bash
# Copy and edit environment variables
cp .env.example .env

# Build and start everything
docker compose up --build -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

The application will be available at **http://localhost** (nginx frontend on port 80, backend proxied via `/api`).

#### Docker Volumes

- `csat-data` — SQLite database (`csat.db`)
- `csat-uploads` — Uploaded evidence and company logos

## Default Credentials

- **Admin**: `admin@csat.local` / `Admin123!`
- **Analyst**: `analyst@csat.local` / `Analyst123!`

## Design System

- Dark mode default (`#18181B` background)
- Inter font, weights 300–700
- CSS variables: `--background`, `--card`, `--border`, `--muted`, `--accent`, `--foreground`
- `rounded-xl` cards, `bg-card/95`, `backdrop-blur`, `fade-in-up` animations
- 6px custom scrollbars

## Roles

| Role | Description |
|------|-------------|
| Admin | Full platform access, user management, settings |
| Security Analyst | Manage controls, evidence, assignments |
| Auditor | Read-only + audit log access, can add comments |
| Viewer | Read-only dashboard and controls list |

## Future Integration Points

- `connectors/okta_oidc.py`
- `connectors/keycloak_oidc.py`
- `connectors/wazuh.py`
- `connectors/openvas.py`
- `connectors/fleetdm.py`
- `connectors/thehive.py`
- `connectors/ai_analysis.py`

## License

MIT
