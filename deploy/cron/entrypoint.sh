#!/bin/sh
# crond starts jobs with an empty environment, so keep the settings the jobs need in a file.
set -eu
env | grep -E '^(CRON_SECRET|PG[A-Z]+|BACKUP_KEEP_DAYS|TZ)=' | sed 's/^/export /; s/=\(.*\)$/="\1"/' > /etc/cron.env
chmod 600 /etc/cron.env
exec crond -f -l 8
