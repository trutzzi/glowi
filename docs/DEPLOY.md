# Deploying Glowi to your own server

One server runs everything with Docker: the app, Postgres and a small scheduler for
SMS reminders and backups. HTTPS comes from the reverse proxy the server already has
(e.g. an existing Caddy container, see "Server that already runs Caddy") or from the
bundled Caddy on an empty server. Azure Pipelines (connected to the GitHub repository) checks every push and, on
`main`, deploys over SSH.

```
GitHub push to main
  └─ Azure Pipelines: npm ci → migrate test DB → lint → types → build
       └─ SSH to server → deploy/deploy.sh <commit>
            ├─ git checkout <commit>
            ├─ prisma migrate deploy        (before the build: the build reads the DB)
            ├─ docker compose build app     (prerenders pages from the real DB)
            └─ start; if unhealthy → roll back to the previous image
```

## 1. Server (once)

**Size:** Ubuntu 24.04, 2 vCPU, **4 GB RAM** (the build needs ~2 GB), 40 GB disk.
For example a Hetzner CX22 or a DigitalOcean 4 GB droplet.

**DNS:** an `A` record (and `AAAA` if you have IPv6) for your domain, e.g.
`programari.salonul-tau.ro`, pointing to the server's IP. HTTPS won't start until it resolves.

As root on the server:

```bash
# Docker + Compose (skip if Docker is already installed)
curl -fsSL https://get.docker.com | sh

# A user for deploys, allowed to run docker
adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy

# Firewall (skip if already configured): SSH, HTTP, HTTPS only; Postgres stays on 127.0.0.1
ufw allow OpenSSH && ufw allow 80,443/tcp && ufw allow 443/udp && ufw --force enable

mkdir -p /opt/glowi && chown deploy:deploy /opt/glowi
```

### Server that already runs Caddy (or another proxy) in Docker

Don't start a second Caddy: ports 80/443 are taken. The app joins your Caddy's Docker
network instead, and your Caddy forwards the salon's domain to it.

1. Find your Caddy container and its network:

   ```bash
   docker ps --format '{{.Names}}\t{{.Image}}\t{{.Ports}}' | grep -i caddy
   docker inspect <caddy-container> -f '{{range $name, $_ := .NetworkSettings.Networks}}{{$name}} {{end}}'
   ```

   If it prints only `bridge` (the default network), create a shared one and attach Caddy:
   `docker network create web && docker network connect web <caddy-container>`.

2. In `/opt/glowi/.env` (step 2): `PROXY_NETWORK=<that network>`, leave `COMPOSE_PROFILES` unset.
   If ports 3000 or 5432 are already used on the server's loopback, change
   `APP_HOST_PORT` / `DB_HOST_PORT`.

3. After the first deploy (step 3), add the block from `deploy/Caddyfile.snippet` to your
   Caddyfile with your domain, and reload Caddy:

   ```bash
   docker exec <caddy-container> caddy reload --config /etc/caddy/Caddyfile
   ```

   Your Caddy requests the HTTPS certificate for the new domain by itself.

On an **empty server** instead, set `COMPOSE_PROFILES=caddy` and `DOMAIN` / `ACME_EMAIL`:
the bundled Caddy then handles HTTPS.

## 2. Code on the server (once)

The server pulls the code with a **read-only deploy key**. As `deploy`:

```bash
su - deploy
ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -N "" -C "glowi server"
cat ~/.ssh/github_deploy.pub
```

GitHub → your repo → **Settings → Deploy keys → Add deploy key**: paste it, leave
"Allow write access" **off**. Then:

```bash
cat >> ~/.ssh/config <<'EOF'
Host github.com
  IdentityFile ~/.ssh/github_deploy
EOF
git clone git@github.com:<you>/<repo>.git /opt/glowi
cd /opt/glowi
cp .env.production.example .env && chmod 600 .env
nano .env   # fill in every value
```

## 3. First deploy (once)

```bash
cd /opt/glowi
./deploy/deploy.sh                     # database, migrations, build, start (~3–5 min)
docker compose -f compose.prod.yaml run --rm migrate npx prisma db seed
```

The seed creates the service catalogue and the admin from `ADMIN_EMAIL` /
`ADMIN_PASSWORD` (it refuses without a password of at least 10 characters). It never
overwrites existing data, so it is safe to run again. Then:

1. Open `https://<your domain>/admin/login` and log in.
2. **Profil:** set the salon name, phone and opening hours; change the admin password.
3. Add your clients. The demo seed (`db:seed:demo`) is for testing only; don't run it here.

You can now remove `ADMIN_PASSWORD` from `.env`.

## 4. Azure Pipelines (once)

The pipeline is `azure-pipelines.yml` in the repository.

**Key pair for the pipeline**, on your computer:

```bash
ssh-keygen -t ed25519 -f glowi_deploy_key -N "" -C "azure pipelines"
```

On the server, as `deploy`, allow it to log in:

```bash
echo "<contents of glowi_deploy_key.pub>" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

In **Azure DevOps** (dev.azure.com):

1. **Project** → **Pipelines → New pipeline → GitHub** → authorise → pick the repo →
   **Existing Azure Pipelines YAML file** → `/azure-pipelines.yml`. Save (don't run yet).
2. **Pipelines → Library → Secure files → + Secure file**: upload `glowi_deploy_key`
   (the private key, no extension). Open it → **Pipeline permissions** → allow the pipeline.
3. **Pipelines → Library → + Variable group** named exactly `glowi-production`:

   | Variable | Value |
   |---|---|
   | `SSH_HOST` | the server IP |
   | `SSH_USER` | `deploy` |
   | `SSH_KNOWN_HOSTS` | output of `ssh-keyscan -t ed25519 <server IP>` (one line) |
   | `SSH_PUBLIC_KEY` | contents of `glowi_deploy_key.pub` |
   | `SSH_PORT` | optional, default 22 |
   | `APP_DIR` | optional, default `/opt/glowi` |

   **Pipeline permissions** → allow the pipeline.
4. **Pipelines → Environments → New environment** `production` (resource: None). Add
   **Approvals and checks** there if every deploy should wait for your OK.
5. Run the pipeline. The first run asks you to **permit** the variable group, secure file
   and environment: click **Permit** for each.

From now on every push to `main` is checked and deployed; pull requests are only checked.

## Everyday operations

All commands on the server in `/opt/glowi`, as `deploy`.

| Task | Command |
|---|---|
| App logs | `docker compose -f compose.prod.yaml logs -f app` |
| SMS job / backup logs | `docker compose -f compose.prod.yaml logs -f cron` |
| Status | `docker compose -f compose.prod.yaml ps` |
| Change a setting in `.env` | edit `.env`, then `docker compose -f compose.prod.yaml up -d app cron` |
| Deploy a specific version | `./deploy/deploy.sh <commit>` |
| Database shell | `docker compose -f compose.prod.yaml exec db psql -U glowi glowi` |

**Rollback:** if a new version fails its health check, `deploy.sh` restarts the previous
image automatically. To go back on purpose: `./deploy/deploy.sh <older commit>`.
Migrations only go forward, so roll back the code only when the older version still
works with the newer database (adding columns or tables is fine; removing them is not).

**Health:** `https://<domain>/api/health` returns `{"status":"ok"}`. Point an uptime
monitor (e.g. UptimeRobot) at it.

## SMS

The scheduler calls `/api/cron/reminders` every hour at :05 (Europe/Bucharest). The app
sends tomorrow's reminders from 10:00 and maintenance reminders, each once.

- `SMSLINK_TEST=1` simulates (nothing is delivered).
- **Remove `SMS_REDIRECT_TO`** before real clients use the app, or their SMS go to that number.

## Backups

A compressed dump is written every night at 03:30 to the `backups` volume and kept
`BACKUP_KEEP_DAYS` days. **Copy them off the server too**: a disk failure would take the
volume with it.

```bash
# List
docker compose -f compose.prod.yaml exec cron ls -lh /backups
# Copy the newest to your computer
scp deploy@<server>:"$(ssh deploy@<server> 'docker volume inspect glowi_backups -f {{.Mountpoint}}')/<file>" .
# Restore (stops the app meanwhile)
docker compose -f compose.prod.yaml stop app cron
gunzip -c glowi-YYYYMMDD-HHMM.sql.gz | docker compose -f compose.prod.yaml exec -T db psql -U glowi glowi
docker compose -f compose.prod.yaml up -d app cron
```

## Notes

- Uploaded service photos are stored in the database, so backups include them.
- The build prerenders public pages (welcome, services) with the current salon name and
  services; admin changes refresh them immediately, no redeploy needed.
- Postgres listens only on the server's loopback (127.0.0.1:5432), used by the image
  build. It is never reachable from the internet.
