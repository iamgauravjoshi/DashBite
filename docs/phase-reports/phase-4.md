# Phase 4 Completion Report — Menu, pricing, schedules, windows, capacity

Date: 2026-10-16. Status: **Complete**.

## 1. Phase objective

Owners control what they sell, when, and how much: slots, items, weekly recurrence, date overrides, holidays, cutoffs, capacity — with customers seeing the correct menu per date and slot.

## 2. Tasks completed

1. Reviewed requirements + BR-02/03/06/07/14/16/18; confirmed DB healthy.
2. Schema: `MenuSlot`, `MenuItem`, `WeeklyMenu(+Item)`, `DateMenu(+Item)`, `Holiday`, `SlotDay`; migrated `20261015041236_menu_pricing_capacity`.
3. Pure libs: `ist.ts` (IST dates), `menu-rules.ts` (cutoff boundary, INR, day codes), `mess-rules.ts` existing.
4. Services: `menus.ts` `getMenuForDate` (weekly → override → holiday/closed precedence, snapshot isolation, orderable flag), `capacity.ts` (`ensureSlotDay`, atomic `tryReserve`, `releaseReservation`, `syncSlotDayCapacity`, weekly fan-out).
5. Validation: `menu-validation.ts` (paise ₹1–₹10,000, capacity 1–10,000, HH:mm, dates, `MessPayload`).
6. APIs: 11 owner routes (slots/items/weekly/items/dates/holidays) — owner-scoped, validated, capacity-synced. No hard deletes where history matters.
7. UI: `/owner/menus` console (mess switch, 5 tabs: slots/items/weekly/dates/holidays), registration flow kept, public `[slug]` menu (7-day strip, slot tabs, prices, cutoffs, honest closed reasons). Photos URL-only (D-14).
8. Staff cannot manage menus (403, tested); cross-owner 404s.
9. Verified: 63 tests, build, dev + prod sweeps, authenticated e2e, docs.

## 3. Files created/modified

- `prisma/schema.prisma` + migration; `src/lib/ist.ts`, `menu-rules.ts`, `menus.ts`, `capacity.ts`, `mess-validation.ts` (+`MessPayload`), `messes.ts` (+`weeklyById`)
- 11 API routes under `/api/messes/[id]/*`; `components/mess/*` (console + 5 managers + menu section); owner menus page; `[slug]` menu wiring
- `tests/menu-rules.test.ts`, `tests/integration/menu-capacity.test.ts` (own `smartmess_test_menu` DB)
- Docs: D-14, traceability REQ-O03/O04/O05/C04 → Complete, operations menu runbook

## 4. Workflows implemented

Slots (one-click defaults) → items → weekly capacity+items → date overrides (copy weekly, close, custom) → holidays; public date/slot menu browsing. Reservation ledger ready for Phase 5 orders and Phase 6 entitlements.

## 5. Tests/commands (actual)

- `format:check`/`typecheck`/`lint` — PASS
- `test` — PASS, 10 files / 63 tests
- Unit proves: cutoff minute itself closed; IST day rollover; paise formatting; transition matrix; eligibility
- Integration proves: weekly resolution + prices; holiday/closed/override precedence; snapshot immunity to catalog + template edits; deactivation hides but preserves rows; 20 concurrent reserves on cap-10 → exactly 10 succeed; release/rebook; capacity flooring at booked; orderable true/future, false at/past cutoff; staff 403; cross-owner 404s; holiday validation
- `build` — PASS (all routes compile; guarded dynamic)
- Sweeps — public/auth 200; anon menu APIs 403 via role gate; anon profile APIs 401; guarded HTML leak-free
- Authenticated e2e (temporary env-aligned run, reverted): signup 200 → verify 302 → signin 200 → session binds → menus shell → mess 201 → slots 201 → settings editor renders. 10/11 script checks passed; the one FAIL was a bad assertion (tabs render only with a mess — confirmed rendering by subsequent checks)
- Dev data cleaned; `.env` restored to `:3000` (verified)

## 6. Known issues / outstanding

- Launch city still default Pune (configurable).
- Subscription plan prices are Phase 6; current prices are one-time display prices.
- `notFound()` on dead slugs renders correct UI + noindex but HTTP 200 (streaming artifact; SEO-safe).
- Unassigned staff pass segments but own no data; Phase 5/7/8 must scope by assignment.
- Measurement lessons (for future phases): PowerShell `curl.exe -s` assigned to var yields line arrays (use `Out-String`); minified HTML needs full-print checks; manual sign-ins trip rate limits + origin checks (test on the configured port).
- A stray dev server holds `:3000` (not started by this session; left untouched).

## 7. Acceptance

- [x] Owners publish/update menus (console + APIs, validated)
- [x] Correct menu per date+slot (resolution precedence tested + UI)
- [x] Orders close per rules (cutoff boundary + orderable flag; enforcement in Phase 5)
- [x] No oversell via normal placement (atomic reserve, 20-way concurrency proven)
- [x] Changes don't silently invalidate commitments (snapshot isolation proven)

Status: **Complete**.

## 8. Run

```powershell
npm.cmd run db:up; npx.cmd prisma migrate dev
npm.cmd run format:check; npm.cmd run typecheck; npm.cmd run lint; npm.cmd run test
npm.cmd run build; npm.cmd run dev  # /owner/menus /discover/[slug]
```

## 9. Config/credentials

Docker only. No new credentials.

## 10. Next + prerequisites

Phase 5 — one-time ordering, checkout, Razorpay sandbox, order history. Needs payment sandbox keys + idempotency design; capacity ledger and cutoff helpers are ready. Prereq met. Awaiting explicit instruction.
