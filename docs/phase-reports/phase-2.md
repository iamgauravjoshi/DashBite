# Phase 2 Completion Report — Auth, profiles, roles, permissions

Date: 2026-10-16. Status: **Complete**.

## 1. Phase objective

Trustworthy identities + server-enforced role access for all five roles, with profile and address management, verification/recovery flows, and onboarding states.

## 2. Tasks completed

1. Reviewed Phase 0/1 baselines; confirmed DB healthy.
2. Library spike (D-11): **better-auth 1.7.8 stable** — Prisma 7 + Postgres first-class, email+password/verification/reset/sessions/admin plugin native, zod v4 compatible. Rejected next-auth v5 (still beta) and v4 (pre-App-Router).
3. Schema: `npx auth generate` (User/Session/Account/Verification + role/banned/status/phone), hand-added `Address` (+`addresses` backref), migrated `20261015023211_auth_better_auth_addresses`. Old empty `User`/enums dropped.
4. `src/lib/auth.ts`: scrypt passwords, `requireEmailVerification`, dev-console mail + test outbox (throws in production), reset with session revocation, role allowlist hook, UNVERIFIED→ACTIVE update hook, admin plugin with 5 custom roles (`permissions.ts`), 7-day sessions, rate limiting (off under test only).
5. `POST /api/auth/sign-up` (D-12): Zod-validated allowlisted roles stamped by created-row id — the admin plugin strips `role` from public signup (proven by types); synthetic enumeration responses match nothing.
6. First-admin bootstrap exception in the create hook; verified: first `create-admin` succeeded (ACTIVE+verified), second rejected.
7. Guards (`auth-guards.ts` + `roles.ts`): `requireUsableAccount` (verify/suspend/deactivate redirects), `requirePageAccess` (segment check → `/forbidden`), `safeNextPath`, `profilePath`. Layouts + owner-subset pages enforce server-side; `User` never crosses RSC boundary (serializable `SessionUser`).
8. UI: sign-up (ToggleGroup roles), sign-in (role home + safe next), forgot/reset, verify-email (verify + resend), forbidden/suspended, `UserMenu` in all shells, per-role profiles, customer addresses manager, Addresses nav item.
9. APIs: `/api/profile` (GET/PATCH), `/api/addresses` (GET/POST, default logic), `/api/addresses/[id]` (PATCH/DELETE, ownership + default promotion) — all session-scoped, status-gated, Zod-validated, transactional. Fixed a real gap found by tests: profile GET skipped status checks.
10. Verified: 33 tests green, build 45/45, dev + prod sweeps, admin bootstrap, docs.

## 3. Files created/modified

- `src/lib/auth.ts`, `auth-client.ts`, `permissions.ts`, `roles.ts` (+`profilePath`, `safeNextPath`), `auth-guards.ts`, `auth-validation.ts`
- `prisma/schema.prisma`, `prisma/migrations/20261015023211_*`, `prisma.config.ts` untouched
- `src/app/api/auth/[...all]/route.ts`, `api/auth/sign-up/route.ts`, `api/profile/route.ts`, `api/addresses/**`
- 7 public auth pages, `components/auth/*` (6), 4 profiles, addresses page, shell wiring, nav +Addresses
- `tests/auth-access.test.ts` (11), `tests/integration/auth-flow.test.ts` (10), `vitest` alias earlier
- Docs: D-11/D-12, traceability REQ-C01/C02 → Complete, `operations.md`, `testing.md`, README, `design-system.md` untouched

## 4. Workflows implemented

Sign-up → verify → sign-in → profile/addresses → sign-out; forgot → reset (revokes sessions); unverified/suspended/deactivated blocks; staff/owner subset; admin seed. No business workflows beyond Phase 2 scope.

## 5. Tests/commands (actual)

- `typecheck`/`lint`/`format:check` — PASS (fixed: Base toggle single-mode, client field inference, explicit route returns, `usable` union annotation)
- `test` — PASS, 6 files / 33 tests (unit 23 + integration 10 vs `smartmess_test`)
- Integration proves: CUSTOMER UNVERIFIED + sign-in blocked pre-verify; MESS_OWNER persisted; STAFF/ADMIN self-reg rejected, zero rows; verify → ACTIVE + redirect target; session cookie → getSession; wrong-password 401; ban → 403; reset link → new password works, old 401; profile self-only + anon 401; cross-account address PATCH/DELETE 404; unverified API use blocked; suspended → 403 SUSPENDED
- `build` — PASS 45/45 (guarded routes correctly dynamic)
- Dev sweep — all routes 200; prod sweep — public/auth 200, anon APIs 401, guarded HTML contains zero protected content + redirect target
- Admin seed — first created (ACTIVE/verified), second rejected
- Debugging artifacts removed (`zz-dbg`, `.check-users.cjs`)

## 6. Known issues / outstanding

- Email is dev-console only; production provider required before pilot (sender throws by design).
- Screenshot-based viewport/browser matrix deferred to Phase 11; layout redirects verified structurally + via HTML/headers.
- Admin user management UI lands in Phase 10; the create-hook will need admin-context awareness then (documented in D-12).
- `middleware`→`proxy.ts` rename noted in Next 16 docs; not needed (layout+page guards suffice).
- Rate limiting disabled under test only; enabled everywhere else.

## 7. Acceptance

- [x] Only authorized features/records (segment guards + ownership checks, tested incl. cross-account attempts)
- [x] Customer isolation (address/profile scoping proven)
- [x] Owner isolation (segment + ownership; business-record scoping extends in Phase 3+)
- [x] Staff/delivery restricted (segment allowlists, staff subset pages)
- [x] Admin controlled (bootstrap-once + role gate)
- [x] Auth failures/unauthorized handled safely (verification gate, ban/status blocks, safe errors, no enumeration)
- [x] Enforcement server-side, not UI-only (layouts/pages/API all guard)

Status: **Complete**.

## 8. Run

```powershell
npm.cmd run db:up
npx.cmd prisma migrate dev
npx.cmd auth@latest create-admin --email <e> --name "<n>" --role PLATFORM_ADMIN --password "<pw>" # first admin only
npm.cmd run format:check; npm.cmd run typecheck; npm.cmd run lint; npm.cmd run test
npm.cmd run build; npm.cmd run dev
```

## 9. Config/credentials

Docker only. No SMTP yet (dev console). `BETTER_AUTH_SECRET` ≥32 chars required.

## 10. Next + prerequisites

Phase 3 — mess onboarding, verification, discovery (needs launch-city confirmation; staff invites design). Prereq met. Awaiting explicit instruction.
