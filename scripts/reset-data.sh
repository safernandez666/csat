#!/usr/bin/env bash
# Reset CSAT to a clean post-seed state.
#
# Wipes the SQLite DB and uploaded files, recreates the volumes, and lets the
# backend re-seed the CIS Controls v8 catalog + default admin/analyst on the
# next start. Use this before handing the deployment to a client so they
# start fresh. Run scripts/backup.sh first if you want to preserve the
# current state.
#
# Usage:
#   scripts/reset-data.sh          # interactive confirmation
#   scripts/reset-data.sh --yes    # skip confirmation (CI / scripted use)

set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT="$(docker compose config --format json 2>/dev/null | python3 -c 'import sys,json;print(json.load(sys.stdin).get("name","csat"))' 2>/dev/null || echo "csat")"
DATA_VOL="${PROJECT}_csat-data"
UPLOADS_VOL="${PROJECT}_csat-uploads"

if [[ "${1:-}" != "--yes" ]]; then
  cat <<EOF
This will permanently DELETE the following CSAT data:

  • SQLite database (control statuses, safeguards progress, evidence records,
    users you created, audit logs, comments, settings, AI chat history)
  • Uploaded files (evidence files + company logo)

The CIS Controls v8 catalog and the default users will be recreated on next
start:

  • admin@csat.local   / Admin123!
  • analyst@csat.local / Analyst123!

Volumes that will be removed:
  - ${DATA_VOL}
  - ${UPLOADS_VOL}

EOF
  read -rp "Type 'wipe' to confirm: " confirm
  [[ "$confirm" == "wipe" ]] || { echo "Aborted."; exit 1; }
fi

echo "→ Stopping containers..."
docker compose down

echo "→ Removing data volumes..."
docker volume rm "$DATA_VOL" "$UPLOADS_VOL" 2>/dev/null || true

echo "→ Starting containers (the backend will re-seed on first request)..."
docker compose up -d

echo "→ Waiting for backend to become healthy..."
for _ in $(seq 1 60); do
  status=$(docker inspect -f '{{.State.Health.Status}}' csat-backend 2>/dev/null || echo "starting")
  [[ "$status" == "healthy" ]] && break
  sleep 2
done

if [[ "$status" != "healthy" ]]; then
  echo "✗ Backend did not become healthy. Check 'docker compose logs backend'."
  exit 1
fi

echo
echo "✓ Reset complete."
echo "  18 CIS Controls v8 re-seeded (all not_implemented)"
echo "  Default users restored"
echo "  App: http://localhost"
