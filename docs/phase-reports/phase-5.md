# Phase 5 Completion Report — One-time ordering, checkout, payments, history

Date: 2026-10-16. Status: **Complete**.

## 1. Phase objective

Customers purchase individual meals with server-priced quotes, cutoff/capacity gates, reliable payment settle (Razorpay-ready, Mock sandbox), order history, and cancellations with refunds. Owners get a live queue.

## 2. Tasks completed

1. Reviewed requirements + BR-02/03/07/08/09/11/17; confirmed DB healthy.
2. Schema: `Order(+Item)`, `Payment` (+`providerPaymentId`), `Refund`, `ProcessedWebhook`, `Mess.deliveryFeePaise`; migrated twice.
3. Money core (`payments.ts` + `payment-rules.ts`): provider interface (Razorpay adapter coded, Mock sandbox, prod refuses keyless), server-side quotes, create with 30-min expiry, idempotent success/failure webhooks, sold-out auto-refund, cutoff-aware cancels with release+refund, expiry sweep.
4. Razorpay: SDK wired (orders API, HMAC webhook verify, refunds API). Live calls need test keys — recorded as pilot prerequisite, never silently mocked in prod.
5. Validation + 10 API routes: preview/create/history/detail/cancel, webhook (raw-body HMAC), mock simulator (non-prod), owner/staff queue + reasoned cancel, mess operations (fee/fulfillment, always editable).
6. UI: checkout (qty, fulfillment, addresses, review, Razorpay.js/Mock pay), mock-pay page, customer history + detail (poll-free status, cancel dialog), owner queue (filters, expand, reasoned cancel), fulfillment card, kitchen order CTA, stale-copy cleanup.
7. Verified: 75 tests, build, sweeps, 10/10 authenticated e2e, docs.

## 3. Files created/modified

- `prisma/schema.prisma` + 2 migrations; `src/lib/payments.ts`, `payment-rules.ts`, `order-validation.ts`, `order-access.ts`
- 10 API routes; `components/order/*` (5); customer history/detail; owner queue; fulfillment card; `[slug]` order page + CTA
- `tests/order-rules.test.ts`, `tests/integration/order-payment.test.ts` (own `smartmess_test_orders` DB)
- Docs: D-15, traceability REQ-O06/C05/C07/C08 → Complete, admin-orders copy fix

## 4. Workflows implemented

Browse → qty → fulfillment/address → server quote → pay (Razorpay/Mock) → webhook-confirmed or sold-out-refunded → history/detail → cancel (customer cutoff rules, owner reasoned) → refunds recorded. Expiry sweeps stale unpaid orders.

## 5. Tests/commands (actual)

- `format:check`/`typecheck`/`lint` — PASS
- `test` — PASS, 12 files / 75 tests
- Unit proves: Razorpay HMAC vectors, mock round-trip, cancellation windows incl. cutoff-minute boundary
- Integration proves: quote math + all rejection codes; confirm + booked ledger + payment id stored; duplicate delivery single-effect; failure leaves pending + unreserved; expiry sweep; 8-buyer cap-5 race → 5 CONFIRMED + 3 SOLD_OUT with captured=5×payable and refunded=3×payable (COMPLETED); future cancel refunds + releases; post-cutoff cancel 409; owner cancel reason-required + 404s; stranger 404s (ownership-before-status)
- `build` — PASS (all routes)
- Sweeps — pages 200, anon order APIs 401, guarded HTML leak-free
- Authenticated e2e (env-aligned, reverted, cleaned): 10/10 — signup→menu build→quote 18000→order→capture→history/detail/queue/public-menu all render
- Real bugs fixed: Prisma upsert race (read/create/re-read), cancel existence leak, [slug]/[id] route conflict, Razorpay keyId exposure shape

## 6. Known issues / outstanding

- Live Razorpay calls unverified (no keys) — test keys + sandbox walkthrough required before pilot; Mock refuses production.
- Razorpay Checkout.js loads from CDN at pay time (documented; SRI/pinning deferred to Phase 11 hardening).
- Screenshot browser matrix deferred to Phase 11; redirects verified structurally.
- Subscription plan prices Phase 6; tax/discount fields reserved at 0.
- A stray dev server holds `:3000` (not ours; untouched). Manual POST testing must target the configured `BETTER_AUTH_URL` origin.

## 7. Acceptance

- [x] Valid one-time orders completable (e2e + integration)
- [x] Closed slots not purchasable (cutoff/menu gates + NOT_ORDERABLE)
- [x] No false confirmation on failure (FAILED ≠ CONFIRMED; expiry path)
- [x] Duplicate notifications single-effect (ProcessedWebhook unique claim)
- [x] Customer/owner views consistent (shared records, queue/detail agreement test)
- [x] Amounts/refunds auditable (payments, refunds with actor/reason, reconciliation sums)

Status: **Complete**.

## 8. Run

```powershell
npm.cmd run db:up; npx.cmd prisma migrate dev
# Optional Razorpay sandbox: set RAZORPAY_KEY_ID/SECRET (+ webhook secret). Otherwise Mock sandbox serves dev/test.
npm.cmd run format:check; npm.cmd run typecheck; npm.cmd run lint; npm.cmd run test
npm.cmd run build; npm.cmd run dev  # /discover/[slug]/order /app/orders /owner/orders
```

## 9. Config/credentials

Docker only. Razorpay test keys pending (pilot prerequisite). `MOCK_WEBHOOK_SECRET` dev default documented.

## 10. Next + prerequisites

Phase 6 — subscription plans + recurring lifecycle (needs plan types/pricing, entitlement engine, skip/pause/resume, renewal; capacity ledger + cutoff helpers ready). Prereq met. Awaiting explicit instruction.
