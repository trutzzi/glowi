# syntax=docker/dockerfile:1.7
# Multi-stage image for the Next.js app (output: "standalone").
#   migrator: runs `prisma migrate deploy` (and the seed) before each release
#   runner:   the production server, as a non-root user
# The build prerenders pages from the database (Cache Components), so it needs
# DATABASE_URL, passed as a BuildKit secret: it never ends up in an image layer.

FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS migrator
COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json ./
# The demo seed imports these helpers.
COPY lib/time.ts lib/dates.ts ./lib/
RUN npx prisma generate
CMD ["npx", "prisma", "migrate", "deploy"]

FROM deps AS builder
COPY . .
RUN npx prisma generate
RUN --mount=type=secret,id=database_url,required=true \
    DATABASE_URL="$(cat /run/secrets/database_url)" npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
