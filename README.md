# Youth Camp Programme Registration System

Registration and administration platform for the **Gospel Of Truth Mission (Lagos Ogun Badagry Branch)** Youth Camp Programme.

## Features

**Public site**
- Camp landing page with programme details pulled from admin settings.
- Guided registration form with conditional fields (e.g. guardian consent for minors), live validation, Nigerian phone-number (E.164) normalisation.
- Idempotent submissions: a browser refresh or retry never creates a duplicate registration.
- Confirmation page showing the participant's unique reference (`GTM-YC-2026-00001`) and what happens next.
- Built-in protection against duplicate registrations (name + phone + date of birth).

**Admin dashboard** (`/admin`)
- Login with Argon2id password hashing, signed session cookies and database-backed rate limiting.
- Three roles — Super Admin, Admin, Staff — with a permission matrix (view, view sensitive contact/health data, manage registrations, manage settings, manage admins, export).
- Dashboard with live totals (active, today, this week), gender/category/assembly breakdowns and recent registrations, all computed in the Africa/Lagos timezone.
- Registrations list: search, filter (status, gender, category, assembly, date range) and pagination.
- Participant detail: view, edit, change status with a reason, add internal notes, full audit trail.
- Reports: CSV export (formula-injection safe) and clean printable reports (full list, by assembly, by category, summary) that exclude private contact data.
- Programme settings: title, dates, venue, fees, capacity, deadlines, required fields, categories, T-shirt sizes, assemblies (branches), privacy/terms notes.

## Tech stack

- **Next.js 15** (App Router, React 19, TypeScript, Tailwind CSS 4)
- **Prisma ORM + PostgreSQL**
- **Zod 4** for validation, **react-hook-form** for forms
- **@node-rs/argon2** for password hashing, **jose** for signed session/confirmation tokens
- **Vitest** for unit + integration tests against an isolated test database

## Getting started

Requirements: Node 20+, npm, PostgreSQL 14+.

```bash
npm install
cp .env.example .env     # then edit the values
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed      # creates the first administrator
npm run dev
```

### Environment variables

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | Prisma connection string for the app database |
| `DIRECT_URL` | Direct (non-pooled) connection string — required on Neon |
| `TEST_DATABASE_URL` | Connection string for the isolated test database |
| `AUTH_SECRET` | Long random string used to sign sessions and tokens |
| `ADMIN_EMAIL` / `ADMIN_NAME` / `ADMIN_PASSWORD` | Credentials for the seeded Super Admin |
| `APP_URL` | Public base URL (e.g. `https://your-app.vercel.app`) |

### First administrator

The seed script creates a Super Admin using the `ADMIN_EMAIL`, `ADMIN_NAME` and `ADMIN_PASSWORD` environment variables:

- Email: `pastor.admin@gospeloftruthmission.org`
- Password: `ChangeMe!Camp2026` (change it immediately after first login from the Account page)

## Tests

The suite runs against a separate `TEST_DATABASE_URL` database; migrations are applied automatically and the data is truncated between tests. It is a hard error to point the test URL at production.

```bash
npm test          # one run
npm run test:watch
```

Run type checks and a production build before deploying:

```bash
npm run typecheck
npm run build
```

## Database

- Schema and migrations live in `prisma/`; apply with `npm run prisma:deploy` on servers.
- Registrations are stored with an atomic per-year reference counter, a row-locked capacity check, and idempotency keys for safe retries.
- Timezone-dependent logic (daily/weekly stats, day boundaries) is pinned to `Africa/Lagos` in `src/lib/timezone.ts`.
- A `backup.sh`-style routine is recommended: schedule regular `pg_dump` of the database (see the deployment checklist).

### Neon connection strings: pooled vs direct

| | Host shape | Used for |
| --- | --- | --- |
| **Pooled** (`DATABASE_URL`) | `ep-<id>-pooler.c-<n>.<region>.aws.neon.tech` | Application runtime queries |
| **Direct** (`DIRECT_URL`) | `ep-<id>.<region>.aws.neon.tech` (no `-pooler`) | `prisma migrate deploy` only |

- Copy **both** from the Neon Console (Connection Details → toggle "Direct connection"). Do not derive `DIRECT_URL` from `DATABASE_URL`.
- Keep `sslmode=require` and any `channel_binding` parameters exactly as Neon provides them.
- Verify connectivity at any time with the read-only check (`SELECT 1`; never creates, updates or deletes records):

```bash
npm run db:check
```

### Local development vs production

> **Warning:** `DATABASE_URL` may point at the production Neon database. `npm run prisma:migrate`
> runs `prisma migrate dev`, which can prompt to **reset** a drifted database. For local development
> and schema changes, point `DATABASE_URL` at a **local PostgreSQL** database (or a disposable Neon
> dev branch) — never run `prisma migrate dev` against production. Use `prisma migrate deploy`
> against the direct connection for production only.

```bash
# Local development against a local database
DATABASE_URL="postgresql://USER@127.0.0.1:5432/youthcamp?schema=public" npm run dev
```

Never run `prisma db push` or `prisma migrate reset` against production.

## Deploying (Vercel + Neon)

1. Create a Neon project and copy the **pooled** `DATABASE_URL` and the **direct** `DIRECT_URL` from the console.
2. Set `DATABASE_URL` and the other variables in your local `.env` (never commit it).
3. Verify connectivity locally before deploying:

   ```bash
   npm run db:check
   ```

4. Review the pending migrations (`prisma/migrations/…`) and apply them **once** against the **non-pooled** direct connection (this is the only connection allowed to run migrations):

   ```bash
   DATABASE_URL="postgresql://...neon-pooled..." \
   DIRECT_URL="postgresql://...neon-direct..." \
   npx prisma migrate deploy
   ```

   Never run `prisma db push` or `prisma migrate reset` against production. Never run migrations through the pooler.
5. Seed the first administrator with the `ADMIN_*` variables, or create the first admin directly in the database:

   ```bash
   DATABASE_URL="postgresql://...neon-pooled..." \
   ADMIN_EMAIL="..." ADMIN_NAME="..." ADMIN_PASSWORD="..." \
   npm run prisma:seed
   ```

6. Push the repository to GitHub and import it into Vercel (framework preset: Next.js). Set the environment variables in Vercel → Project → Settings → Environment Variables (see checklist below).
7. Deploy. Create additional admins from `/admin/account`.

### Vercel environment variables (names only — values belong in the Vercel dashboard)

```
DATABASE_URL        # Neon POOLED connection string (runtime)
DIRECT_URL          # Neon DIRECT connection string (migrations only)
AUTH_SECRET         # long random string, ≥ 32 chars
ADMIN_EMAIL         # first Super Admin seed (optional post-seed)
ADMIN_NAME
ADMIN_PASSWORD
APP_URL             # https://your-domain.vercel.app
```

### Deployment checklist

- [ ] Neon `DATABASE_URL` (pooled) and `DIRECT_URL` (direct) copied from the console; verified with `npm run db:check`.
- [ ] `prisma migrate deploy` run against the direct connection; migration `20261009174139_init` applied on Neon.
- [ ] `AUTH_SECRET` is a long random value, never committed.
- [ ] Default admin password changed after first login (never reuse `ChangeMe!Camp2026` in production).
- [ ] `TEST_DATABASE_URL` still points at the isolated `youthcamp_test` database before running `npm test`.
- [ ] Either the Neon credential shared in this change is rotated (recommended — it appeared in plaintext) or access is otherwise controlled.
- [ ] Public registration form turned off (`registrationOpen: false`) or a deadline set once the camp is full.
- [ ] Daily `pg_dump` backups automated; restore tested.
- [ ] Domain registered in Vercel and `APP_URL` matches it.

## Security notes

- Passwords hashed with Argon2id (19 MiB, 2 iterations); failed logins are rate limited.
- Sessions are short-lived signed JWT cookies (`HttpOnly`, `Secure`, `SameSite=Lax`).
- Confirmation URLs embed a signed short-lived token, not database IDs.
- CSV exports escape spreadsheet formula characters (`= + - @`) and never include password or internal metadata.
- Admin audit log records every edit, status change, note and administration action.
- Private guardian / emergency-contact / health fields are only exposed to roles with the `view_sensitive` permission and are always excluded from printable reports.# youthcamp-attandce
