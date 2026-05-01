# CSAT Architecture

## Product Overview

CSAT is a structured, multi-user platform to manage CIS Controls v8 manually. It is designed for security teams who need a single source of truth for compliance tracking without external tooling dependencies in the MVP.

## Backend Folder Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app factory, lifespan, middleware
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py           # Pydantic Settings, env vars
│   │   ├── security.py         # Argon2, JWT encode/decode, RBAC middleware
│   │   ├── logging.py          # structlog configuration
│   │   └── exceptions.py       # HTTP exception handlers
│   ├── db/
│   │   ├── __init__.py
│   │   ├── session.py          # SQLAlchemy engine + session factory
│   │   └── base.py             # Base declarative class
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py             # User, Role, UserRole
│   │   ├── control.py          # Control, Safeguard
│   │   ├── evidence.py         # Evidence file/link records
│   │   ├── assignment.py       # Control → User assignments
│   │   ├── comment.py          # Comments / activity history
│   │   ├── audit_log.py        # Immutable audit records
│   │   ├── review_schedule.py  # Periodic review due dates
│   │   └── settings.py         # Platform settings key/value
│   ├── api/
│   │   ├── __init__.py
│   │   ├── deps.py             # FastAPI dependencies (DB, current_user)
│   │   ├── auth.py             # Login, refresh, logout, /auth/me
│   │   ├── users.py            # CRUD users, roles
│   │   ├── controls.py         # CRUD controls + safeguards
│   │   ├── evidence.py         # Upload, list, delete evidence
│   │   ├── assignments.py      # Assign controls to users
│   │   ├── comments.py         # Comment threads on controls
│   │   ├── audit_logs.py       # Query audit log (admin/auditor)
│   │   ├── dashboard.py        # Aggregated metrics endpoint
│   │   ├── reports.py          # PDF export endpoint
│   │   └── settings.py         # Platform settings
│   ├── services/
│   │   ├── __init__.py
│   │   ├── control_service.py  # Business logic for controls
│   │   ├── report_service.py   # PDF generation service
│   │   ├── audit_service.py    # Centralized audit logging
│   │   └── scheduler.py        # APScheduler jobs
│   ├── utils/
│   │   ├── __init__.py
│   │   └── seed.py             # Seed CIS Controls v8 + default users
│   └── connectors/
│       ├── __init__.py
│       ├── base.py             # Abstract base for all connectors
│       ├── okta_oidc.py        # Stub: Okta OIDC
│       ├── keycloak_oidc.py    # Stub: Keycloak OIDC
│       ├── wazuh.py            # Stub: Wazuh
│       ├── openvas.py          # Stub: OpenVAS / Greenbone
│       ├── fleetdm.py          # Stub: FleetDM / osquery
│       ├── thehive.py          # Stub: TheHive
│       └── ai_analysis.py      # Stub: AI-assisted control analysis
├── tests/
│   └── __init__.py
├── requirements.txt
├── run.py
└── .env.example
```

## Frontend Folder Structure

```
frontend/
├── public/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── App.css
│   ├── index.css
│   ├── types/
│   │   └── index.ts
│   ├── lib/
│   │   ├── utils.ts
│   │   └── api.ts
│   ├── hooks/
│   │   └── use-api.ts
│   ├── components/
│   │   ├── ui/
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── input.tsx
│   │   │   └── select.tsx
│   │   ├── nav-sidebar.tsx
│   │   ├── layout.tsx
│   │   ├── control-status-badge.tsx
│   │   ├── risk-badge.tsx
│   │   ├── user-role-badge.tsx
│   │   ├── evidence-uploader.tsx
│   │   ├── control-detail-panel.tsx
│   │   ├── compliance-summary-card.tsx
│   │   └── audit-log-timeline.tsx
│   └── pages/
│       ├── login.tsx
│       ├── dashboard.tsx
│       ├── controls.tsx
│       ├── control-detail.tsx
│       ├── evidence.tsx
│       ├── users.tsx
│       ├── audit-logs.tsx
│       ├── settings.tsx
│       └── export-report.tsx
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
└── vite.config.ts
```

## Database Schema

### users
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, autoincrement |
| email | VARCHAR | UNIQUE, NOT NULL |
| hashed_password | VARCHAR | NULL (for OIDC-only users) |
| full_name | VARCHAR | NOT NULL |
| is_active | BOOLEAN | DEFAULT 1 |
| mfa_enabled | BOOLEAN | DEFAULT 0 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

### roles
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, autoincrement |
| name | VARCHAR | UNIQUE, NOT NULL |
| description | VARCHAR | |
| permissions | JSON | NOT NULL |

### user_roles
| Column | Type | Constraints |
|--------|------|-------------|
| user_id | INTEGER | FK → users.id |
| role_id | INTEGER | FK → roles.id |
| PK(user_id, role_id) |

### controls
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, autoincrement |
| cis_id | VARCHAR | NOT NULL (e.g. "1.1") |
| name | VARCHAR | NOT NULL |
| objective | TEXT | |
| implementation_guidance | TEXT | |
| status | VARCHAR | DEFAULT "not_implemented" |
| risk_level | VARCHAR | DEFAULT "medium" |
| owner_id | INTEGER | FK → users.id |
| due_date | DATE | NULL |
| review_date | DATE | NULL |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

### safeguards
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, autoincrement |
| control_id | INTEGER | FK → controls.id, CASCADE DELETE |
| safeguard_id | VARCHAR | NOT NULL (e.g. "1.1.1") |
| title | VARCHAR | NOT NULL |
| description | TEXT | |
| implementation_status | VARCHAR | DEFAULT "not_implemented" |

### evidence
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, autoincrement |
| control_id | INTEGER | FK → controls.id, CASCADE DELETE |
| uploaded_by | INTEGER | FK → users.id |
| file_path | VARCHAR | NULL |
| file_name | VARCHAR | NULL |
| file_size | INTEGER | NULL |
| mime_type | VARCHAR | NULL |
| note | TEXT | NULL |
| external_link | VARCHAR | NULL |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

### assignments
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, autoincrement |
| control_id | INTEGER | FK → controls.id, CASCADE DELETE |
| user_id | INTEGER | FK → users.id |
| assigned_by | INTEGER | FK → users.id |
| assigned_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

### comments
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, autoincrement |
| control_id | INTEGER | FK → controls.id, CASCADE DELETE |
| user_id | INTEGER | FK → users.id |
| content | TEXT | NOT NULL |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

### audit_logs
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, autoincrement |
| user_id | INTEGER | FK → users.id, NULL for system |
| action | VARCHAR | NOT NULL |
| resource_type | VARCHAR | NOT NULL |
| resource_id | VARCHAR | |
| details | JSON | |
| ip_address | VARCHAR | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

### review_schedules
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, autoincrement |
| control_id | INTEGER | FK → controls.id, CASCADE DELETE |
| review_type | VARCHAR | NOT NULL ("quarterly", "annual") |
| next_review_at | DATETIME | NOT NULL |
| last_reviewed_at | DATETIME | NULL |

### settings
| Column | Type | Constraints |
|--------|------|-------------|
| key | VARCHAR | PK |
| value | JSON | |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

## API Endpoints

### Auth
- `POST /api/auth/login` — Email/password → tokens
- `POST /api/auth/refresh` — Refresh token → new access token
- `POST /api/auth/logout` — Invalidate refresh token
- `GET /api/auth/me` — Current user profile

### Users
- `GET /api/users` — List users (admin)
- `POST /api/users` — Create user (admin)
- `GET /api/users/{id}` — Get user detail
- `PUT /api/users/{id}` — Update user
- `DELETE /api/users/{id}` — Deactivate user

### Roles
- `GET /api/roles` — List roles
- `POST /api/roles` — Create role (admin)
- `PUT /api/roles/{id}` — Update role

### Controls
- `GET /api/controls` — List controls (filter: status, risk, owner)
- `GET /api/controls/{id}` — Get control detail with safeguards
- `POST /api/controls` — Create control (admin/analyst)
- `PUT /api/controls/{id}` — Update control
- `DELETE /api/controls/{id}` — Delete control (admin)

### Evidence
- `POST /api/evidence` — Upload evidence (multipart)
- `GET /api/evidence?control_id={id}` — List evidence
- `DELETE /api/evidence/{id}` — Delete evidence

### Comments
- `POST /api/comments` — Add comment
- `GET /api/comments?control_id={id}` — List comments

### Audit Logs
- `GET /api/audit-logs` — Query audit logs (admin/auditor)

### Dashboard
- `GET /api/dashboard/summary` — Compliance score, counts
- `GET /api/dashboard/trends` — Historical compliance trend

### Reports
- `POST /api/reports/pdf` — Generate PDF report

### Settings
- `GET /api/settings` — Platform settings
- `PUT /api/settings` — Update settings (admin)

## UI/UX Design Guidelines

- Dark mode default. Light mode toggle available.
- Inter font 300–700 from Google Fonts.
- CSS variables for theming.
- Cards: `rounded-xl`, `bg-card/95`, subtle translucent borders, `backdrop-blur`.
- Animations: `fade-in-up`, 0.4s duration, `cubic-bezier(0.4, 0, 0.2, 1)`.
- Scrollbars: custom 6px width.
- Dense but readable dashboard layout.
- Max-width containers: `max-w-7xl`.
- Lucide icons only.

## Component Inventory

| Component | Location | Description |
|-----------|----------|-------------|
| Button | `ui/button.tsx` | CVA-based variants |
| Card | `ui/card.tsx` | Header, Title, Description, Content |
| Badge | `ui/badge.tsx` | Status badges |
| Input | `ui/input.tsx` | Form input |
| Select | `ui/select.tsx` | Dropdown |
| ControlStatusBadge | `control-status-badge.tsx` | CIS control status colors |
| RiskBadge | `risk-badge.tsx` | Critical/High/Medium/Low |
| UserRoleBadge | `user-role-badge.tsx` | Admin/Analyst/Auditor/Viewer |
| EvidenceUploader | `evidence-uploader.tsx` | Drag-drop file upload |
| ControlDetailPanel | `control-detail-panel.tsx` | Full control view |
| ComplianceSummaryCard | `compliance-summary-card.tsx` | Score + KPIs |
| AuditLogTimeline | `audit-log-timeline.tsx` | Vertical timeline |

## MVP Roadmap

1. **Project scaffolding** — Backend/frontend structure, Tailwind config
2. **Auth & RBAC** — JWT login, role middleware, protected routes
3. **CIS Controls v8 seed** — All 18 controls + safeguards in SQLite
4. **Controls CRUD UI** — List, detail, edit status/owner/dates
5. **Evidence upload** — File upload + note/link support
6. **Dashboard** — Compliance score, charts, activity feed
7. **Users & Roles** — Admin user management
8. **Audit Logs** — Immutable action log
9. **PDF Export** — jsPDF compliance report
10. **Settings** — Theme, platform config

## Phase 2 Roadmap

- OAuth 2.0 / OIDC connector (Okta, Keycloak)
- Wazuh integration — auto-evidence from alerts
- OpenVAS/Greenbone — vulnerability evidence
- FleetDM/osquery — device compliance evidence
- TheHive — incident linkage
- AI-assisted control analysis — gap recommendations
- PostgreSQL support
- Email notifications for reviews

## Security Considerations

- Password hashing: Argon2id (via `argon2-cffi`)
- JWT: access token 15min, refresh token 7d, stored in httpOnly cookie
- RBAC middleware on every protected endpoint
- Audit logging for all sensitive actions (login, user changes, control changes, evidence upload/delete)
- File upload: restrict MIME types, size limit 25MB, sanitize filenames
- Rate limiting: recommend `slowapi` or nginx layer (login 5/min, API 100/min)
- CORS: restrict to frontend origin only
- Secrets: all via environment variables (`.env`)
- SQL injection prevention via SQLAlchemy ORM
- XSS prevention: React escapes by default, CSP headers recommended
