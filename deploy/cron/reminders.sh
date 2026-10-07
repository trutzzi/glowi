#!/bin/sh
set -eu
. /etc/cron.env
echo "$(date -Iseconds) reminders: $(curl -fsS -m 120 -H "Authorization: Bearer $CRON_SECRET" http://app:3000/api/cron/reminders 2>&1)" > /proc/1/fd/1
