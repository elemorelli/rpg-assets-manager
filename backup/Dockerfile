FROM postgres:17-alpine

RUN apk add --no-cache rclone bash ca-certificates

COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh

# No cron daemon: busybox crond doesn't inherit the container's env vars,
# which is exactly what pg_dump/rclone need. A plain sleep loop sidesteps
# that and runs a backup immediately on every deploy.
CMD ["/bin/sh", "-c", "while true; do /usr/local/bin/backup.sh; sleep \"${BACKUP_INTERVAL_SECONDS:-86400}\"; done"]
