# Requirements Traceability — MVP

Format: REQ-ID | Scenario | Phase | Implementation | Tests | Status.

## Customer

- REQ-C01 Registration/sign-in | P2 | better-auth email+password, `/sign-up`, `/sign-in`, `/verify-email`, `/forgot-password`, `/reset-password` | `tests/integration/auth-flow.test.ts` (10), `auth-access.test.ts` | Complete
- REQ-C02 Profile + addresses | P2 | `/api/profile`, `/api/addresses*`, `/app/profile`, `/app/addresses`, per-role profiles | integration ownership/status tests, validation tests | Complete
- REQ-C03 Discovery + profiles | P3 | `/discover` (city search/filters), `/discover/[slug]` (eligible-only, 404 otherwise), no ratings (no review data) | integration filter/eligibility tests, dev sweep | Complete
- REQ-C04 Menu/pricing visibility | P4 | `/discover/[slug]` menu section (7-day strip, slot tabs, INR prices, cutoff + capacity notes) | resolution tests, dev sweep | Complete
- REQ-C05 One-time orders | P5 | `/discover/[slug]/order` checkout, server-priced quotes, cutoff/capacity gates | integration happy-path + concurrency tests | Complete
- REQ-C06 Subscriptions + skip/pause/resume/history | P6 | plans, `/app/subscriptions` + detail, skip/pause/resume/cancel/renew, audit history | engine unit (11) + lifecycle integration (7) + e2e | Complete
- REQ-C07 Checkout + payment status | P5 | Mock sandbox + Razorpay adapter, idempotent webhooks, `/app/orders/[id]` payment/refund states | duplicate-notification + failure tests | Complete (live Razorpay pending keys)
- REQ-C08 Order history + tracking | P5 | `/app/orders` history, detail with items/refunds/cancel | integration consistency test | Complete
- REQ-C09 Notifications + issue reporting | P9 | — | — | Not Started

## Owner

- REQ-O01 Onboarding + verification | P3 | `/owner/messes/new`, `/owner/settings` editor, submit/withdraw/publish, `/admin/verifications` + decisions, `MessVerificationEvent` audit | `tests/integration/mess-lifecycle.test.ts` (lifecycle, audit, isolation) | Complete
- REQ-O02 Profile mgmt | P3 | same as O01 (business profile, hours, areas, fulfillment) | same | Complete
- REQ-O03 Menu + schedule mgmt | P4 | `/owner/menus` (slots/items/weekly/dates/holidays), menu APIs, snapshot semantics | `tests/integration/menu-capacity.test.ts`, `menu-rules.test.ts` | Complete
- REQ-O04 Per-slot order windows | P4 | per-slot `cutoffTime`, `orderable` resolution, cutoff display | cutoff boundary tests | Complete
- REQ-O05 Capacity limits | P4 | weekly/date capacity, `SlotDay` ledger, atomic `tryReserve`, edit flooring | 20-way concurrency test | Complete
- REQ-O06 One-time order mgmt | P5 | `/owner/orders` queue (filters, detail, reasoned cancel), staff-shared, owner/admin cancel APIs | integration cancel/isolation tests | Complete
- REQ-O07 Subscriber/subscription mgmt | P6 | `/owner/subscribers` (plans manager, states, demand counts, per-sub schedule/audit), staff sees nothing (PII) | integration counts/isolation | Complete
- REQ-O08 Daily counts + prep lists | P7 | `/owner/kitchen` (prep sheet, packing, pending, exceptions, late changes, finalize, adjustments) + `buildSheet` service | `tests/integration/kitchen-ops.test.ts` (5) + e2e render | Complete
- REQ-O09 Self + agent delivery assignment | P8 | — | — | Not Started
- REQ-O10 Revenue/order reports (basic) | P10 | — | — | Not Started

## Delivery

- REQ-D01 Task list | P8 | — | — | Not Started
- REQ-D02 Pickup/delivery status | P8 | — | — | Not Started
- REQ-D03 Address + instructions (scoped) | P8 | — | — | Not Started
- REQ-D04 Failed-delivery recording | P8 | — | — | Not Started
- REQ-D05 Completion records | P8 | — | — | Not Started

## Admin

- REQ-A01 User/provider mgmt | P10 | — | — | Not Started
- REQ-A02 Verification/suspension | P3/P10 | — | — | Not Started
- REQ-A03 Commission + SaaS plan config | P10 | — | — | Not Started
- REQ-A04 Refund/complaint oversight | P9/P10 | — | — | Not Started
- REQ-A05 Financial/operational reporting | P10 | — | — | Not Started

## Foundation

- REQ-F01 App shell + design system + navigation (4 roles) | P1 | `src/config/navigation.ts`, `AppShell`/`PublicShell`, `(public)` + role routes, `/system` | `tests/navigation.test.ts`, `status-badge.test.ts`, 28-route 200 sweep, build | Complete
- REQ-F02 Foundation baseline (repo, env, lint, test, build, DB) | P0 | this phase | baseline checks | In Progress

Update Implementation/Tests/Status as phases complete. Business-rule coverage: BR-01…BR-18 mapped in phase test plans from P3 onward.
