# Tiny scheduler: hourly SMS job and a daily database backup.
FROM alpine:3.20
RUN apk add --no-cache curl postgresql16-client tzdata
ENV TZ=Europe/Bucharest
COPY crontab /etc/crontabs/root
COPY entrypoint.sh reminders.sh backup.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/*.sh
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
