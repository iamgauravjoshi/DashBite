# Requirements Traceability — MVP

Format: REQ-ID | Scenario | Phase | Implementation | Tests | Status.

## Customer

- REQ-C01 Registration/sign-in | P2 | — | — | Not Started
- REQ-C02 Profile + addresses | P2 | — | — | Not Started
- REQ-C03 Discovery + profiles | P3 | — | — | Not Started
- REQ-C04 Menu/pricing visibility | P4 | — | — | Not Started
- REQ-C05 One-time orders | P5 | — | — | Not Started
- REQ-C06 Subscriptions + skip/pause/resume/history | P6 | — | — | Not Started
- REQ-C07 Checkout + payment status | P5 | — | — | Not Started
- REQ-C08 Order history + tracking | P5 | — | — | Not Started
- REQ-C09 Notifications + issue reporting | P9 | — | — | Not Started

## Owner

- REQ-O01 Onboarding + verification | P3 | — | — | Not Started
- REQ-O02 Profile mgmt | P3 | — | — | Not Started
- REQ-O03 Menu + schedule mgmt | P4 | — | — | Not Started
- REQ-O04 Per-slot order windows | P4 | — | — | Not Started
- REQ-O05 Capacity limits | P4 | — | — | Not Started
- REQ-O06 One-time order mgmt | P5 | — | — | Not Started
- REQ-O07 Subscriber/subscription mgmt | P6 | — | — | Not Started
- REQ-O08 Daily counts + prep lists | P7 | — | — | Not Started
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
