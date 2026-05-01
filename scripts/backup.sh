#!/usr/bin/env bash
# Snapshot CSAT data + uploads to a tarball in ./backups/.
#
# Useful before running scripts/reset-data.sh, or to capture state before
# handing the deployment to a client. The tarball can be restored with
# scripts/restore.sh.
#
# Usage:
#   scripts/backup.sh             # creates backups/csat-backup-<utc>.tar.gz

set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT="$(docker compose config --format json 2>/dev/null | python3 -c 'import sys,json;print(json.load(sys.stdin).get("name","csat"))' 2>/dev/null || echo "csat")"
DATA_VOL="${PROJECT}_csat-data"
UPLOADS_VOL="${PROJECT}_csat-uploads"

mkdir -p backups
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="backups/csat-backup-${STAMP}.tar.gz"

echo "→ Snapshotting volumes ${DATA_VOL} + ${UPLOADS_VOL} to ${OUT}..."

docker run --rm \
  -v "${DATA_VOL}:/data:ro" \
  -v "${UPLOADS_VOL}:/uploads:ro" \
  -v "$(pwd)/backups:/out" \
  alpine \
  tar czf "/out/csat-backup-${STAMP}.tar.gz" -C / data uploads

SIZE=$(du -h "$OUT" | cut -f1)
echo "✓ Backup saved: $OUT ($SIZE)"
