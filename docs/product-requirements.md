# Product Requirements — Smart Mess & Tiffin Management SaaS

Status: Phase 0 baseline. Source of truth for MVP scope.
Timezone default: `Asia/Kolkata`. All dates, cutoffs, validity interpreted in mess local time (IST for launch).
Launch geography: one city initially (configurable `City` model, seed city TBD — default `Pune` placeholder, changeable via seed). Multi-city is out of MVP.

## 1. Product model

Hybrid marketplace + mess-owner SaaS. Customers discover messes, buy one-time meals, subscribe to recurring plans. Owners manage menus, pricing, order windows, capacity, kitchen production, deliveries. Platform operator manages verification, monetization, disputes.

Primary differentiator: recurring-meal lifecycle (entitlements, skip, pause, resume, renewal, remaining-meal tracking) integrated with daily kitchen operations.

## 2. Roles

| Role           | Capabilities (MVP)                                                                                                                                                                                                                       |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Customer       | Register/sign-in, profile, addresses, discovery, menus, one-time orders, subscriptions + skip/pause/resume/history, checkout + payment status, order history/tracking, notifications, issue reporting                                    |
| Mess owner     | Onboarding + verification, profile, menu/schedule, per-slot order windows, capacity, one-time order mgmt, subscriber/subscription mgmt, daily counts + prep lists, self-managed + agent delivery assignment, basic revenue/order reports |
| Mess staff     | Restricted to assigned responsibilities (order queue, kitchen/packing, pickup/dispatch). Cannot manage another owner's business. Scoped by owner assignment.                                                                             |
| Delivery agent | Assigned task list, pickup/delivery status, address + instructions (authorized tasks only), failed-delivery recording, completion records                                                                                                |
| Platform admin | User/provider mgmt, verification/suspension, commission + SaaS plan config, refund/complaint oversight, financial + operational reporting                                                                                                |

Auth MVP: email + password (approved). Phone stored as field. OTP/SMS deferred. See `decision-log.md`.

## 3. Core workflows (summary)

- Customer: discover (city/locality/search/filters) → mess profile → menu by date/slot → one-time checkout (pickup/delivery) → payment → order tracking/history. Subscribe: plan discovery → checkout → entitlements → upcoming meals → skip/pause/resume → renewal/expiry → history.
- Owner: register business → verification (Draft/Submitted/Under Review/Approved/Rejected/Suspended) → publish/unpublish → menus + weekly recurrence + date overrides + holidays → slot cutoffs + capacity → order queue → subscriber counts → prep sheet + packing list → finalize → assign fulfillment → revenue reports.
- Delivery: onboarding → assignment (self/staff/agent) → task list → pickup/dispatch/complete or fail with reason → reconciliation.
- Admin: verify/suspend → commission + SaaS plans → refunds/complaints → reports (GOV, commissions, payment costs, refunds, owner payables).

## 4. MVP boundary

IN (per spec §6): all rows in Roles table above. No advanced recommendations, no live GPS, no auto route optimization, no AI forecasting, no procurement, no complex loyalty, no multi-city ops.

OUT explicitly: live GPS tracking, route optimization, AI demand forecasting, supplier procurement, complex loyalty, accounting integrations, automated tax filings, payouts automation.

## 5. Non-functional (MVP)

- Responsive: desktop/tablet/mobile (bottom nav / sheets on mobile per DESIGN.md).
- Accessibility: WCAG AA basics, keyboard, focus-visible, semantic HTML.
- Privacy: addresses/instructions visible only to authorized fulfillment participants. No raw card storage.
- Auditability: verification decisions, financial adjustments (actor+reason+record), subscription skips/pauses/resumes/adjustments, kitchen corrections, complaint resolutions, admin actions.
- Consistency: IST cutoffs, idempotent payments/webhooks, no double-counting in production, capacity shared between subscriptions + one-time.
