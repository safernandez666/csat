#!/usr/bin/env bash
# Restore CSAT volumes from a tarball produced by scripts/backup.sh.
#
# This OVERWRITES the current data + uploads volumes.
#
# Usage:
#   scripts/restore.sh backups/csat-backup-20260501T143000Z.tar.gz

set -euo pipefail
cd "$(dirname "$0")/.."

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <backup-tarball>"
  echo "Available backups:"
  ls -1t backups/csat-backup-*.tar.gz 2>/dev/null || echo "  (none)"
  exit 1
fi

ARCHIVE="$1"
if [[ ! -f "$ARCHIVE" ]]; then
  echo "✗ Backup not found: $ARCHIVE"
  exit 1
fi

PROJECT="$(docker compose config --format json 2>/dev/null | python3 -c 'import sys,json;print(json.load(sys.stdin).get("name","csat"))' 2>/dev/null || echo "csat")"
DATA_VOL="${PROJECT}_csat-data"
UPLOADS_VOL="${PROJECT}_csat-uploads"

echo "This will OVERWRITE volumes:"
echo "  - ${DATA_VOL}"
echo "  - ${UPLOADS_VOL}"
echo "with contents of: ${ARCHIVE}"
read -rp "Type 'restore' to confirm: " confirm
[[ "$confirm" == "restore" ]] || { echo "Aborted."; exit 1; }

echo "→ Stopping containers..."
docker compose down

echo "→ Recreating empty volumes..."
docker volume rm "$DATA_VOL" "$UPLOADS_VOL" 2>/dev/null || true
docker volume create "$DATA_VOL" >/dev/null
docker volume create "$UPLOADS_VOL" >/dev/null

echo "→ Extracting backup..."
ABS_ARCHIVE="$(cd "$(dirname "$ARCHIVE")" && pwd)/$(basename "$ARCHIVE")"
docker run --rm \
  -v "${DATA_VOL}:/data" \
  -v "${UPLOADS_VOL}:/uploads" \
  -v "${ABS_ARCHIVE}:/backup.tar.gz:ro" \
  alpine \
  sh -c "cd / && tar xzf /backup.tar.gz"

echo "→ Starting containers..."
docker compose up -d

echo "✓ Restore complete from $ARCHIVE"
