# Business Rules — MVP baseline

All rules enforced server-side. IDs stable for traceability (BR-01…).

- BR-01 Order only from active, eligible, serviceable messes. Eligibility = Approved + Published + operating day + slot open + service-area match. Unverified/suspended/unavailable/incomplete listings never appear in public discovery.
- BR-02 Each meal slot has explicit availability + cutoff. Cutoff configured independently per slot (e.g., lunch 09:30, dinner 16:00 IST). Orders/subscription actions after cutoff apply to next eligible service day.
- BR-03 Closing new orders never silently discards existing commitments. Confirmed one-time orders + entitled subscription meals survive menu/availability changes; changes apply forward only.
- BR-04 Subscription entitlements traceable + consistently calculated. Entitlement = f(plan type, validity window, service calendar, weekly holidays, slot entitlements, skips, pauses, extensions, admin adjustments). Single calculation function, single audit log.
- BR-05 Skips/pauses/resumes/extensions/cancellations/refunds follow disclosed policy visible before confirmation. Customer sees consequence (meals credited/extended/forfeited) before confirming.
- BR-06 Same committed meal never counted twice in production. Dedupe key = (subscriptionId + serviceDate + slot) or (orderId + item). One-time + subscription share capacity pool.
- BR-07 Subscription + one-time share meal capacity. Capacity check in DB transaction; oversell rejected through normal placement. Concurrent purchases serialized.
- BR-08 Confirmed order never double-confirmed/charged due to duplicate payment events. Payment provider webhooks idempotent via provider event ID unique constraint. Order transitions: Pending → Confirmed only once.
- BR-09 Payment success, order confirmation, fulfillment completion, refund status are distinct. Separate timestamps/statuses; delivery status never mutates payment; refund never implies auto-fulfillment reversal without policy.
- BR-10 Role enforcement server-side. Customer sees own records only. Owner manages own business only. Staff/delivery scoped to assignments. Admin privileges gated. UI hiding is not enforcement.
- BR-11 Financial adjustments traceable: actor + reason + linked record (order/subscription/refund). No silent edits.
- BR-12 Provider cancellation + delivery failure have defined resolution: reason code + customer notification + refund/credit per policy + actionable queue for owner/admin.
- BR-13 Pause ≠ cash refund. Pause extends validity or preserves meals per plan policy; cash refund only via explicit cancellation/refund flow.
- BR-14 Future menu changes never silently change purchased plan terms. Price/menu edits apply to new purchases; existing entitlements keep purchased terms unless customer consents.
- BR-15 Every state transition has clear business meaning + allowed-transition matrix (verification, order, subscription, fulfillment, complaint, refund).
- BR-16 Dates/cutoffs/validity in mess local time (Asia/Kolkata). Store UTC, display IST. Cutoff boundary tests inclusive/exclusive documented in testing.md.
- BR-17 Customer-facing prices, fees, expiry, cancellation terms visible before confirmation. No cost surprises at checkout.
- BR-18 Capacity + entitlement changes reflected consistently across owner dashboard + customer experience (same source query/transaction).

Emerging rules go here with approval note. Material changes require decision-log entry.
