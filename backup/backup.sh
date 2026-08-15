#!/bin/bash
set -euo pipefail

if [ -z "${BACKUP_RCLONE_REMOTE:-}" ]; then
  echo "BACKUP_RCLONE_REMOTE is not set, refusing to run a backup with nowhere to send it." >&2
  exit 1
fi

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DUMP_FILE="/tmp/rpgassets-${TIMESTAMP}.sql.gz"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

pg_dump "$DATABASE_URL" | gzip > "$DUMP_FILE"
rclone copy "$DUMP_FILE" "$BACKUP_RCLONE_REMOTE"
rm "$DUMP_FILE"

# Prunes remote backups past the retention window; local copy is already gone.
rclone delete "$BACKUP_RCLONE_REMOTE" --min-age "${RETENTION_DAYS}d"

echo "Backup ${TIMESTAMP} uploaded to ${BACKUP_RCLONE_REMOTE}, pruned entries older than ${RETENTION_DAYS}d."
