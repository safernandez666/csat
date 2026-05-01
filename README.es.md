# CSAT — CIS Controls Assessment & Tracking

<!-- README-I18N:START -->

[English](./README.md) | **Español**

<!-- README-I18N:END -->

Plataforma open-source y self-hosted para gestionar los **CIS Controls v8**
de punta a punta: estado de implementación por control y por safeguard,
evidencia, audit logs, reportes en PDF/Excel con resumen ejecutivo generado
por IA, y un asistente de chat con contexto real de tu postura de seguridad.

Pensada para equipos de seguridad que quieren una única fuente de verdad
para compliance sin enviar datos a un SaaS de terceros.

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    React 19 Frontend                         │
│  Dashboard · Controls · Implementation Waves · Quick Wins    │
│  Evidence · Users · Audit Logs · AI Assistant · Reports      │
│  Tailwind 4 · Vite 8 · Recharts · jsPDF · motion             │
└─────────────────────────────────────────────────────────────┘
                              │ REST API (cookies httpOnly)
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Backend                           │
│  JWT + Argon2id · RBAC · APScheduler · structlog            │
│  18 CIS Controls v8 + 152 safeguards + IG1/IG2/IG3 mapping  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│   SQLite   ·   Local Ollama / OpenAI / Anthropic for AI     │
└─────────────────────────────────────────────────────────────┘
```

---

## Requisitos

- **Docker** + **Docker Compose** (la única dependencia obligatoria)
- ~500 MB de disco para las imágenes, más volúmenes para la base SQLite y la evidencia subida
- *(Opcional, para las funciones de IA)* **Ollama** corriendo localmente — ver [Configurar el asistente de IA](#configurar-el-asistente-de-ia)

Un navegador moderno. No hace falta instalar ningún otro runtime para el camino con Docker.

---

## Inicio rápido (Docker)

```bash
# 1. Cloná y preparé las variables de entorno
git clone <url-de-tu-fork> csat
cd csat
cp .env.example .env

# 2. Generá un SECRET_KEY real (reemplazá el placeholder en .env)
python3 -c "import secrets; print('SECRET_KEY=' + secrets.token_urlsafe(48))"
# → pegá el output en .env reemplazando la línea SECRET_KEY

# 3. Build y arranque
docker compose up --build -d

# 4. Abrí la app
open http://localhost
```

Iniciá sesión con la cuenta admin seedeada: `admin@csat.local` / `Admin123!`
(leé [Hardening](#hardening-para-producción) antes de exponer la instancia).

El primer arranque va a:

- crear la base SQLite en el volumen `csat-data`,
- seedear los 18 CIS Controls v8 + 152 safeguards (con su tag IG1/IG2/IG3),
- crear los usuarios y roles por defecto,
- arrancar el scheduler diario de recordatorios de review.

---

## Configuración inicial (post-login)

Una vez logueado como admin:

1. **Settings → Branding** — definí el nombre de la empresa / plataforma y subí
   un logo. Ambos aparecen en el header del dashboard, la pantalla de login,
   el título de la pestaña del navegador y la portada de cada reporte PDF/Excel.
2. **Settings → AI** — configurá el proveedor de LLM. Ollama es el default y
   funciona 100% offline. Mirá [Configurar el asistente de IA](#configurar-el-asistente-de-ia).
3. **Users** — creá las cuentas reales y rotá la password del `admin@csat.local`
   por defecto. Las credenciales demo se seedean *en cada arranque*; tratalas
   como efímeras.
4. **Controls → asignar dueños** — todo control sin owner aparece flageado en
   Quick Wins y en el resumen ejecutivo.

Listo para empezar a trackear implementación por safeguard.

---

## Operación día a día

| Página | Qué hacés ahí |
|--------|---------------|
| **Dashboard** | Compliance score (promedio de completitud por control), distribución de riesgo, madurez por IG, actividad reciente. |
| **Controls** | Lista de los 18 CIS Controls. Filtros por status / riesgo / owner. |
| **Control detail** | Editar status, owner, fecha de vencimiento, fecha de revisión. Cambiar el estado de cada safeguard. Subir evidencia (archivos o links externos). Agregar comentarios / actividad. |
| **Implementation Waves** | Elegís IG1, IG2 o IG3 y atacás los safeguards de esa ola en un solo lugar — agrupados por control padre, con edición de status inline. Útil cuando querés llevar una ola del 0% al 100%. |
| **Quick Wins** | Top 5 ranqueado por heurística + análisis del LLM, ponderado por IG1 pendiente, riesgo y owners/evidencia faltantes. |
| **AI Assistant** | Preguntale en lenguaje natural sobre tu postura. Tiene memoria entre sesiones y está grounded en los datos reales de tus controles. |
| **Audit Logs** | Log inmutable de cada login, cambio de control, subida de evidencia, etc. |
| **Export Report** | Genera un PDF de 5 páginas (cover con donut del score, resumen ejecutivo por IA, compliance overview, cards de IG, top quick wins, inventario por grupo) y un Excel de 3 hojas. |

### Semántica de status

Un safeguard está en `not_implemented` / `in_progress` / `implemented`.

El status del control es **derivado** de sus safeguards:

- Todos los safeguards en `implemented` → el control queda en `implemented`
- Al menos uno en `implemented` o `in_progress` → el control queda en `in_progress`
- Si no → `not_implemented`

También podés flaggear manualmente un control como `needs_review` desde el
panel de Edit. Los timestamps de transición (`started_at`, `implemented_at`)
se graban automáticamente.

El **compliance score** es el promedio del porcentaje de completitud de
safeguards de cada control — todos los controles pesan igual sin importar
cuántos safeguards tengan.

---

## Configurar el asistente de IA

CSAT soporta tres proveedores. La IA es opcional — sin ella seguís teniendo
la heurística de Quick Wins y un resumen ejecutivo de fallback en los reportes
PDF.

### Opción A — Ollama (local, recomendado)

```bash
# Instalá Ollama en el host donde corre CSAT
brew install ollama          # macOS
# o: curl -fsSL https://ollama.com/install.sh | sh   # Linux

# Bajá un modelo (la primera vez descarga ~4-5 GB)
ollama pull llama3:latest

# Bindeá Ollama a todas las interfaces para que el contenedor Docker lo alcance
OLLAMA_HOST=0.0.0.0 ollama serve
```

En CSAT → **Settings → AI**:

- Provider: `ollama`
- API URL: `http://host.docker.internal:11434` (funciona desde Docker Desktop
  en macOS / Windows; Docker en Linux requiere
  `extra_hosts: host.docker.internal:host-gateway`, ya configurado en el
  `docker-compose.yml`)
- Model: `llama3:latest` (o cualquier modelo que tengas bajado —
  `qwen2.5:7b-instruct-q4_K_M`, `mistral:7b-instruct`, etc.)

Click en **Test Connection**. Tenés que recibir `{"status":"ok"}`.

### Opción B — OpenAI

- Provider: `openai`
- API URL: dejala vacía (el default es `https://api.openai.com`)
- API Key: tu clave `sk-...`
- Model: `gpt-4o-mini` (barato) o `gpt-4o`

### Opción C — Anthropic

- Provider: `anthropic`
- API URL: dejala vacía (el default es `https://api.anthropic.com`)
- API Key: tu clave `sk-ant-...`
- Model: `claude-haiku-4-5-20251001` o cualquier ID actual de Claude

---

## Backup, restore y reset

Los scripts viven en `scripts/`.

```bash
# Snapshot de la base SQLite + evidencia subida en ./backups/
scripts/backup.sh
# → backups/csat-backup-20260501T143000Z.tar.gz

# Restaurar un backup previo (sobreescribe el estado actual)
scripts/restore.sh backups/csat-backup-20260501T143000Z.tar.gz

# Borrar todo lo específico del cliente y re-seedear (úsalo antes de entregar
# el deploy a un nuevo cliente / en cada instalación nueva)
scripts/reset-data.sh             # interactivo, tipeá "wipe" para confirmar
scripts/reset-data.sh --yes       # no interactivo (CI / scripted)
```

`reset-data.sh` borra los volúmenes Docker `csat_csat-data` y
`csat_csat-uploads`, y reinicia el stack. El seed re-crea los 18 CIS Controls
y los usuarios por defecto en el siguiente arranque.

---

## Hardening para producción

Antes de exponer la instancia a una red real, hacé **todo** lo siguiente:

1. **Generá un `SECRET_KEY` fuerte** y ponelo en `.env`. La app se niega a
   arrancar en modo no-dev con el valor por defecto.
   ```bash
   python3 -c "import secrets; print(secrets.token_urlsafe(48))"
   ```
2. **Seteá `CSAT_ENV=prod`** en `.env`. Esto activa el guard del SECRET_KEY.
3. **Terminá TLS** delante de CSAT (nginx, Caddy, Traefik, ALB, etc.) y
   poné `COOKIE_SECURE=true` en `.env` para que las cookies de sesión
   requieran HTTPS.
4. **Apretá `CORS_ORIGINS`** dejando solo el origen del frontend real —
   separados por coma, sin wildcards.
5. **Rotá los usuarios seedeados.** `admin@csat.local` y `analyst@csat.local`
   existen en cada deploy nuevo porque el seed corre en cada arranque.
   Cambiales la password ya, o borralos después de crear las cuentas reales.
6. **Restringí `/api/uploads/`** a tráfico autenticado en la capa del proxy
   (el backend ya valida auth, pero es defensa en profundidad).
7. **Hacé backup regular.** `scripts/backup.sh` es seguro de correr en cron.

### `.env` recomendado para producción

```env
CSAT_ENV=prod
SECRET_KEY=<output de python -c "import secrets; print(secrets.token_urlsafe(48))">
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
CORS_ORIGINS=https://csat.tu-org.com
COOKIE_SECURE=true
SCHEDULER_ENABLED=true
AI_DEFAULT_URL=http://host.docker.internal:11434
```

---

## Desarrollo local (sin Docker)

Útil cuando estás iterando sobre el código.

```bash
# Backend (terminal 1)
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python run.py                 # uvicorn en http://localhost:8080 con reload

# Frontend (terminal 2)
cd frontend
npm install
npm run dev                   # Vite en http://localhost:5173, /api proxy a :8080
```

Abrí `http://localhost:5173`.

En modo dev, `CSAT_ENV` defaultea a `dev`, así que el guard del SECRET_KEY
se saltea y las credenciales seedeadas funcionan out of the box.

---

## Roles y permisos

| Rol | Lectura | Escritura controles / safeguards | Gestionar usuarios | Audit log |
|-----|---------|----------------------------------|--------------------|-----------|
| **Admin** | ✓ | ✓ | ✓ | ✓ |
| **Security Analyst** | ✓ | ✓ | — | ✓ |
| **Auditor** | ✓ | solo comentarios | — | ✓ |
| **Viewer** | ✓ | — | — | — |

---

## Troubleshooting

**El AI Assistant devuelve errores / `ai_analysis: null`.**
Probá `Settings → AI → Test Connection`. Desde adentro del contenedor,
`localhost` apunta al contenedor mismo, no al host — usá `host.docker.internal`
(automático en Docker Desktop, configurado vía `extra_hosts` en Linux).

**`docker compose up` falla con "SECRET_KEY is unset or using a known default".**
Generá un SECRET_KEY real (ver [Hardening](#hardening-para-producción))
o seteá `CSAT_ENV=dev` en `.env` para desarrollo local.

**La pantalla de login muestra el logo roto.**
El logo se sirve por el endpoint público `/api/branding/logo`. Si devuelve
404, re-subí el logo desde `Settings → Branding`.

**Cambié un control y el dashboard no muestra el status nuevo.**
El dashboard fetchea al montar. Hard refresh (`Cmd+Shift+R` / `Ctrl+Shift+R`)
o navegá a otra página y volvé.

**`scripts/reset-data.sh` dice "volumes not found".**
El nombre del compose project se toma del nombre del directorio (default `csat`).
Si clonaste en otra carpeta, ajustá los nombres de los volúmenes o renombrá
el directorio.

---

## Puntos de integración futuros

Hay stubs de connectors en `backend/app/connectors/` que implementan una
interfaz común `BaseConnector` (`configure`, `health_check`, `fetch_evidence`).
Wirealos al pipeline de evidencia según necesidad:

- `okta_oidc.py`, `keycloak_oidc.py` — single sign-on
- `wazuh.py` — auto-evidencia desde alertas SIEM
- `openvas.py` — evidencia de scans de vulnerabilidades
- `fleetdm.py` — evidencia de compliance de dispositivos (osquery)
- `thehive.py` — vinculación con incidentes
- `active_directory.py` — sync de usuarios / grupos
- `ai_analysis.py` — ya wireado (Ollama / OpenAI / Anthropic)

---

## Licencia

MIT — ver [LICENSE](LICENSE).
