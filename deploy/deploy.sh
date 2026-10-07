#!/usr/bin/env bash
# Release a version on the server. Called by GitHub Actions over SSH, or by hand:
#   ./deploy/deploy.sh <git-commit>     (default: latest origin/main)
# Order matters: migrate first, because the app build reads the database.
set -euo pipefail
cd "$(dirname "$0")/.."

TARGET="${1:-origin/main}"
log() { printf '\n==> %s\n' "$*"; }

log "Fetching $TARGET"
git fetch --prune origin
git checkout --force --detach "$TARGET"

# Settings for compose interpolation, and the database URL for the image build.
set -a
# shellcheck disable=SC1091
. ./.env
set +a
export BUILD_DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:${DB_HOST_PORT:-5432}/${POSTGRES_DB}"

# Behind the server's existing reverse proxy (PROXY_NETWORK), or with the bundled
# Caddy (COMPOSE_PROFILES=caddy in .env).
COMPOSE=(docker compose -f compose.prod.yaml)
if [ -n "${PROXY_NETWORK:-}" ]; then
  docker network inspect "$PROXY_NETWORK" >/dev/null || { echo "Docker network '$PROXY_NETWORK' not found (PROXY_NETWORK in .env)"; exit 1; }
  COMPOSE+=(-f deploy/compose.external-proxy.yaml)
fi

log "Database"
"${COMPOSE[@]}" up -d --wait db

log "Migrations"
"${COMPOSE[@]}" build migrate
"${COMPOSE[@]}" run --rm migrate

# Production seed: only adds what is missing (catalogue, first admin), so it is
# safe on every deploy. Skipped when no ADMIN_PASSWORD is configured.
if [ -n "${ADMIN_PASSWORD:-}" ]; then
  log "Seed (adds missing data only)"
  "${COMPOSE[@]}" run --rm migrate npx prisma db seed
fi

log "Building the app"
docker image tag glowi-app:latest glowi-app:previous 2>/dev/null || true
"${COMPOSE[@]}" build app cron

log "Starting"
# Starts db, app, cron, and caddy only when its profile is enabled.
if ! "${COMPOSE[@]}" up -d --wait; then
  log "New version is unhealthy: rolling back to the previous image"
  if docker image inspect glowi-app:previous >/dev/null 2>&1; then
    docker image tag glowi-app:previous glowi-app:latest
    "${COMPOSE[@]}" up -d --no-build app
  fi
  exit 1
fi

curl -fsS -m 10 "http://127.0.0.1:${APP_HOST_PORT:-3000}/api/health" >/dev/null
docker image prune -f >/dev/null
log "Deployed $(git rev-parse --short HEAD)"
