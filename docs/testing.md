# Testing Strategy — baseline (Phase 0)

## Commands (verified in Phase 0 report)

- `npm.cmd run dev` — local dev (Next.js)
- `npm.cmd run lint` — ESLint
- `npm.cmd run typecheck` — tsc --noEmit
- `npm.cmd run test` — Vitest run (unit)
- `npm.cmd run build` — production build
- `npm.cmd run db:up` / `db:down` — Postgres via Docker
- `npx.cmd prisma migrate dev` — migrations (needs DATABASE_URL)

## What we test each phase

Per spec §8: happy + unhappy flows, invalid input, missing records, unauthorized access, cutoff boundaries (IST), duplicate/repeated events, concurrent capacity, payment success/failure, expiry/renewal, skip/pause interactions, owner cancellation/delivery failure, refunds/reconciliation, regression.

Phase 0 verifies only: install reproduces, lint/type/test/build pass, DB connects, `/api/health` returns 200 with DB check, docs present.

Phase 2 adds: `tests/integration/auth-flow.test.ts` — full lifecycle against `smartmess_test` (signup roles, verification, sign-in, wrong-password, ban, reset, profile ownership, address cross-account isolation, suspension). Unit `tests/auth-access.test.ts` covers segment guards, redirect safety, role model, Zod schemas. Layout redirects verified by dev-server sweep (anonymous → `/sign-in`, no protected HTML leaks).

## Conventions

- Unit: `*.test.ts` colocated or in `tests/unit`, Vitest.
- Integration (from P2): API route tests with test DB, idempotency + authz cases.
- E2E (from P1): Playwright for critical journeys (deferred until shell exists).
- Every major workflow gets: REQ-ID, story, preconditions, steps, expected, coverage, status.

## Baseline status

See `docs/phase-reports/phase-0.md` for actual outcomes. Never mark unexecuted checks as passed.
