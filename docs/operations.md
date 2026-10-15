# Operations — baseline (Phase 0)

## Local development

1. Start Docker Desktop.
2. Copy `.env.example` → `.env`, adjust `POSTGRES_PASSWORD` if needed.
3. `npm.cmd install`
4. `npm.cmd run db:up` (Postgres 18-alpine on 5432)
5. `npx.cmd prisma migrate dev --name init` (first run)
6. `npm.cmd run dev` → http://localhost:3000, `/api/health`

## Environment variables

See `.env.example`. Never commit `.env`. Required: `DATABASE_URL`, `BETTER_AUTH_SECRET` (≥32 chars), `BETTER_AUTH_URL`, `APP_TIMEZONE=Asia/Kolkata`, `APP_DEFAULT_CITY`.

## Auth operations (Phase 2)

- Email delivery is DEV-CONSOLE ONLY (server terminal + test outbox). Production MUST configure a real provider before pilot — the sender throws in `NODE_ENV=production` by design.
- First platform admin: `npx.cmd auth@latest create-admin --email <e> --name "<n>" --role PLATFORM_ADMIN --password "<pw>"`. The bootstrap opens exactly once; later attempts are rejected. Further admins are managed in-console (Phase 10).
- Staff accounts cannot self-register (API + hook reject with guidance). Owner invites arrive in Phase 3.
- Suspended/deactivated accounts: sign-in blocked (ban) and API blocked (status); ban revokes sessions.

## Test database

Integration suites use isolated databases on the same Postgres container (`smartmess_test_auth`, `smartmess_test_mess`; auto-created + `migrate deploy` in `beforeAll`). Never point them at the dev database. Rate limiting is disabled under `NODE_ENV=test` only.

## Verification runbook (Phase 3)

- Owner submits from `/owner/settings` (Draft/Rejected → Submitted). Withdrawing returns to Draft.
- Admins review oldest-first at `/admin/verifications`: Submitted → Under review → Approved/Rejected (reason required); Approved → Suspended (reason required, unpublishes immediately); Suspended → Approved (reinstate, stays unpublished until owner republishes).
- Every decision writes `mess_verification_event` (actor, from→to, reason, timestamp).
- Publish toggle needs APPROVED. Only published + approved listings appear in `/discover`.
- Suspended mess? Vanishes from discovery instantly; existing commitments are preserved by rule (enforced in Phase 5+ flows).

## Menu runbook (Phase 4)

- Slots first (`/owner/menus` → Slots; one-click Breakfast/Lunch/Dinner with 07:00/09:30/16:00 cutoffs), then Items, then Weekly plans, then date overrides and Holidays.
- Weekly templates repeat; a saved date override snapshots items+prices+capacity and never changes when catalog/templates move. Delete the override to fall back to weekly.
- Capacity edits propagate to future `slot_day` ledgers floored at already-booked. Past ledgers are history.
- Prices are whole paise (₹1–₹10,000). Photos are pasted image URLs; uploads are out of MVP.
- Customers see date strips + slot tabs with INR prices, cutoff notes, and honest closed reasons. Ordering enforcement arrives in Phase 5.

## Subscription runbook (Phase 6)

- Plans live per mess + slot (`/owner/subscribers` → plans). Deactivating stops new sales; sold terms never change.
- Policy to disclose: skips keep balance until expiry (before cutoff); pauses start tomorrow and extend validity; cancels forfeit without refund; renewals chain after expiry.
- Admin adjustments (`POST /api/admin/subscriptions/[id]/adjust`): EXTEND_VALIDITY / ADD_MEALS with mandatory reason — every adjustment is audited.
- Expiry reminders surface in-app (expiring-soon flags); email/push reminders arrive with Phase 9 notifications.

## Kitchen runbook (Phase 7)

- Open `/owner/kitchen`, pick mess + date + slot. Prep sheet = confirmed one-time items (with veg split) + subscriber headcount + audited adjustments.
- Pending payments never count. Cancelled orders show under exceptions with reasons.
- Finalize when the count is locked; late confirmations, cancels, and adjustments appear under late changes with timestamps.
- Subscriber demand comes from the same entitlement engine as customer screens — skips and pauses move both sides together.

## Fulfillment runbook (Phase 8)

- Every confirmed order opens a PENDING parcel. Kitchen marks READY; pickup hands over directly, delivery assigns self/staff/agent by account email.
- Agents work their task list only — addresses appear solely for assigned stops. Failed attempts need a reason code and keep the parcel actionable; two failures flag owner review.
- Terminal handover (picked up / delivered) reconciles the order to COMPLETED without touching money or capacity. Unfulfillable parcels cancel through the normal refund path.
- No OTP proof-of-delivery in MVP (never in approved scope); the actor-stamped attempt log + Phase 9 issue reporting is the backstop.

## Backups / recovery / monitoring

- Pilot (P11): documented backup (pg_dump schedule), recovery drill, log retention, uptime check. Not configured in Phase 0 beyond Docker volume `smartmess-pgdata`.
- Production deploy: blocked until Phase 11 checklist + explicit authorization. No prod secrets in repo.

## Support

Pilot support procedures defined in Phase 11. Phase 0: file issues with repro + logs (no customer data in logs).
