# Architecture and development notes

How the app is put together and the conventions to follow when changing it.
Setup and deployment: [README](../README.md) and [DEPLOY.md](DEPLOY.md).

## Commands


- `npm run dev` — dev server (http://localhost:3000)
- `npm run build` / `npm run start` — production build / serve
- `npm run lint` — ESLint (flat config, `eslint-config-next`); `npx tsc --noEmit` for types
- No test runner is configured.
- Database (Postgres via Prisma 7, connection in `.env` `DATABASE_URL`):
  - `npx prisma migrate dev --name <change>` then `npx prisma generate` after editing [prisma/schema.prisma](../prisma/schema.prisma). `migrate dev` is interactive; it refuses to run without a TTY.
  - `npx prisma db seed` — catalogue (categories, services) + `admin@glowi.test` / `password123` and client Elena.
  - `npm run db:seed:demo` — demo clients and appointments relative to today, plus service photos from `prisma/seed-images/` ([prisma/seed-demo.ts](../prisma/seed-demo.ts)). `-- --remove` deletes them (every demo id starts with `demo-`). Demo clients log in by phone, e.g. `0744 555 101` / `Demo2026`.
  - `npx prisma studio` to browse data.
- **Restart `npm run dev` after `prisma generate`**: [lib/db.ts](../lib/db.ts) keeps one Prisma client on `globalThis`, so a running server keeps the old client (symptom: `db.<model>` is undefined). If dev hangs on "Compiling …" with 0% CPU, the Turbopack cache is corrupt: stop it and delete `.next/dev`.

- **Deploy**: Docker on a VPS, see [docs/DEPLOY.md](DEPLOY.md). `next.config.ts` uses `output: "standalone"`. `npm run build` **needs a reachable database**: Cache Components prerender pages from it, so the production image is built on the server (`deploy/deploy.sh` migrates first, then builds with `BUILD_DATABASE_URL` as a BuildKit secret). CI builds against a throwaway Postgres service. In production the seed only adds missing rows and requires `ADMIN_EMAIL`/`ADMIN_PASSWORD`.

## Next.js version warning

This repo uses Next.js 16.4 / React 19.3, with breaking changes from older versions. Read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code, and heed deprecation notices. [next.config.ts](../next.config.ts) enables `cacheComponents` and `partialPrefetching`, which shape most of the code:

- Anything reading request data (`cookies()`, session, `params`, `searchParams`, `usePathname()` on dynamic routes) must sit inside `<Suspense>`; pages render a static heading and an async child that does the reads.
- Reading the current time on the server needs `await connection()` first.
- On one page, read the user either through `getCurrentUser()` (`'use cache: private'`) or through `verifySession()`/`requireRole()` — never both (mixing triggers prerender errors from `jose` reading the clock).
- Shared data is cached with `'use cache'` + `cacheTag` and refreshed with `updateTag` in Server Actions (tags: `services`, `announcement`, `salon`, `current-user`). Direct DB edits (psql, seeds) don't refresh these caches.
- Error boundaries receive `retry()` (not `reset()`).

## Architecture

Glowi is a Romanian-language beauty-salon app: clients see their appointments; the admin manages services, clients, appointments, attendance and SMS reminders. UI text is Romanian; code and comments are English.

- **Data access layer** (`app/lib/*.ts`, all `server-only`): every function that reads or writes data checks the session itself — `verifySession()` / `requireRole('admin')` in [app/lib/dal.ts](../app/lib/dal.ts). Server Actions live in `app/actions/*.ts`, re-check the role, validate with Zod, and return `{ errors, values }` for `useActionState` forms. Never trust the page for authorization.
- **Auth**: signed JWT cookie `session` ([app/lib/session.ts](../app/lib/session.ts), `jose`, `SESSION_SECRET`), set by the Route Handlers under `app/api/auth/*` that `components/AuthProvider.tsx` (SWR) calls. Clients log in with phone (or optional email), admins with email; phones are matched after normalising (`lib/phone.ts`) and must be unique.
- **Routing**: `app/page.tsx` welcome, `app/login`, `app/admin/login`; client tabs in `app/(app)/` (MobileShell `variant="app"`, `BottomNav`); admin screens in `app/admin/(panel)/` (full-width layout, `AdminNav`). New admin pages call `requireRole('admin')` inside Suspense.
- **Appointments**: times are entered in `Europe/Bucharest` and stored in UTC via [lib/time.ts](../lib/time.ts). `endsAt` = start + service duration + cleanup buffer, stored at booking. A Postgres exclusion constraint (hand-written in a migration, not in `schema.prisma`) forbids overlapping appointments salon-wide for statuses SCHEDULED/HONORED/NOT_HONORED; actions pre-check and also catch error `23P01`. Price is copied from the service at booking.
- **SMS**: SMSLink HTTP API in [lib/sms.ts](../lib/sms.ts) (POST, GSM-7 text, `SMSLINK_TEST=1` simulates). [lib/reminders.ts](../lib/reminders.ts) sends a confirmation after booking/rescheduling (via `after()` in the booking action) and a reminder for tomorrow's appointments from 10:00 (salon time, until 21:00), claiming `reminderSentAt` first; reminders are triggered hourly by `GET /api/cron/reminders` with `Authorization: Bearer $CRON_SECRET`, or the dashboard button (any hour).
- **Settings** (`Setting` table, [app/lib/settings.ts](../app/lib/settings.ts)): salon name/phone, client announcement, admin-guide visibility, weekly opening hours.
- **Availability** ([app/lib/availability.ts](../app/lib/availability.ts)) is the single place that decides whether a time is bookable: opening hours (clients only), `CalendarEvent`s (everyone, also checked in the admin booking action), other appointments. The client reschedule calendar and the admin booking form both use it; always re-check on the server before writing.
- **Client requests** (`AppointmentRequest`): PENDING → APPROVED → COMPLETED for reschedules (the client picks the slot after approval), PENDING → COMPLETED for cancellations (status by notice: ≥ 24h before = MISSED_ANNOUNCED). A partial unique index (hand-written in the migration) allows one open request per appointment. Admin edits to an appointment close its open requests.
- **Maintenance** (`Maintenance`, `Service.maintenanceWeeks`): started/renewed by the "Întreținere?" popup when a visit is marked HONORED (`recordHonored`); one SMS per cycle at 10:00 on `dueDate`, skipped when the client already booked that service. `clientDeclined` = the client turned it off; only the client can turn it back on.
- **Errors**: [instrumentation.ts](../instrumentation.ts) `onRequestError` and the error boundaries write to the `ErrorLog` table via [lib/logger.ts](../lib/logger.ts); admins read it at `/admin/logs` (faint link in the admin footer).
- **Service images** are stored in the `ServiceImage` table and served by `app/service-images/[id]/[v]/route.ts` (`v` = upload time, immutable caching). `public/` is not used for uploads.
- **Styling**: Tailwind v4 configured in CSS. Semantic tokens (`primary`, `primary-dark`, `primary-soft`, `blush`, `hero`, `ivory`, `canvas`, `gold`) and warm greys live in the `@theme` block of [app/globals.css](../app/globals.css); `h1` uses the Playfair Display serif. Fonts load `latin-ext` for ș/ț. Responsive: phone first, `md:` for tablets.
- Icons use `lucide-react`. Path alias `@/*` maps to the repo root.

## Known issues

- The working tree contains stray duplicates (`next copy.config.ts`, `package copy.json`, `tsconfig copy.json`); the unsuffixed files are the real ones.
