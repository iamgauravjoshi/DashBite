# SmartMess — Mess & Tiffin Management SaaS

Hybrid marketplace + mess-owner SaaS. Core differentiator: recurring-meal lifecycle (entitlements, skip/pause/resume) integrated with kitchen ops.

> Phase 0 foundation. Full role shells land in Phase 1. See `docs/`.

## Stack (approved)

- Next.js 16.4.1 App Router + React 19 + TypeScript 5.9 (monolith)
- PostgreSQL 18-alpine (Docker) + Prisma 7.10.0 stable
- Tailwind CSS v4 + shadcn/ui (Phase 1), Zod validation
- Vitest (unit) + Playwright (E2E from Phase 1)
- Payments: Razorpay sandbox behind abstraction (from Phase 5, not installed in Phase 0)
- Auth: email + password (Phase 2; `next-auth` selection deferred to Phase 2 spike)
- Timezone: store UTC, interpret/display `Asia/Kolkata`

Why not absolute-latest TS/ESLint: TS 7.0 + ESLint 10 break `eslint-config-next@16.4.1` (peer `typescript <6.1`, `eslint ^9`). Pinned to latest compatible stable: TS 5.9.3, ESLint 9.39.5. Prisma 7.10.0 stable over 8.0.0-rc for pilot integrity. See `docs/decision-log.md`.

## Prerequisites (verified)

- Node v24.20.0, `npm.cmd` 11.19.0 (use `.cmd` on Windows — `.ps1` blocked by execution policy)
- Docker Desktop running, `postgres:18-alpine` image present
- Git 2.45.1

## Setup (verified 2026-10-15)

```powershell
# 1. env
Copy-Item .env.example .env -Force

# 2. deps
npm.cmd install

# 3. db (Postgres 18 — volume must be /var/lib/postgresql, not /data)
npm.cmd run db:up

# 4. migrate
npx.cmd prisma migrate dev

# 5. checks
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run build

# 6. run
npm.cmd run dev
# → http://localhost:3000
# → http://localhost:3000/api/health  ({"status":"ok","database":{"ok":true}})
```

Postgres 18 note: `docker-compose.yml` mounts `smartmess-pgdata:/var/lib/postgresql`. Mounting `/var/lib/postgresql/data` makes PG18 fail to boot (see Phase 0 report). If you upgraded from a PG17 volume, `docker compose down -v` once.

Prisma 7 note: connection URL lives in `prisma.config.ts` (`datasource.url = env("DATABASE_URL")`), not in `schema.prisma`. `prisma.config.ts` imports `dotenv/config` so CLI picks up `.env` on Windows.

## Scripts

| Command                          | Purpose               |
| -------------------------------- | --------------------- |
| `npm.cmd run dev`                | Next.js dev           |
| `npm.cmd run build` / `start`    | Production build/run  |
| `npm.cmd run lint` / `typecheck` | ESLint / tsc --noEmit |
| `npm.cmd run test`               | Vitest run            |
| `npm.cmd run db:up` / `db:down`  | Postgres via Docker   |
| `npx.cmd prisma migrate dev`     | Apply migrations      |
| `npx.cmd prisma studio`          | DB browser            |

## Docs

- `docs/product-requirements.md` — scope, roles, MVP boundary
- `docs/business-rules.md` — BR-01…BR-18
- `docs/roadmap.md` — phases + status
- `docs/decision-log.md` — D-01…D-07
- `docs/requirements-traceability.md` — REQ → phase → tests
- `docs/testing.md` — commands + conventions
- `docs/operations.md` — local dev, env, pilot notes
- `docs/phase-reports/phase-0.md` — Phase 0 completion report
- `DESIGN.md` / `SKILLS.md` — product + UI standards (pre-existing)

## Project structure

```
prisma/
  schema.prisma        # City, User baseline (extended P2/P3)
  migrations/          # 20261015015727_init
prisma.config.ts       # Prisma 7 datasource config
src/
  app/
    layout.tsx page.tsx
    api/health/route.ts
  lib/
    db.ts env.ts time.ts
tests/
  smoke.test.ts timezone.test.ts
docker-compose.yml     # postgres:18-alpine
.env.example
```

## Status

Phase 0: In Progress → pending final verification + report. Do not start Phase 1 without explicit instruction.
