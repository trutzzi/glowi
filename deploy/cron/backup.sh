#!/bin/sh
# Compressed SQL dump in the "backups" volume; dumps older than BACKUP_KEEP_DAYS are removed.
set -eu
. /etc/cron.env
file="/backups/glowi-$(date +%Y%m%d-%H%M).sql.gz"
pg_dump --no-owner --clean --if-exists | gzip > "$file"
find /backups -name 'glowi-*.sql.gz' -mtime +"${BACKUP_KEEP_DAYS:-14}" -delete
echo "$(date -Iseconds) backup: $file ($(du -h "$file" | cut -f1))" > /proc/1/fd/1
