import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  cancellableByCustomer,
  signMockPayload,
  verifyMockSignature,
  verifyRazorpaySignature
} from "../src/lib/payment-rules";

describe("webhook signatures", () => {
  it("verifies Razorpay HMAC-SHA256(order|payment)", () => {
    const secret = "test-secret";
    const signature = createHmac("sha256", secret).update("order_1|pay_1").digest("hex");
    expect(verifyRazorpaySignature("order_1", "pay_1", signature, secret)).toBe(true);
    expect(verifyRazorpaySignature("order_1", "pay_2", signature, secret)).toBe(false);
    expect(verifyRazorpaySignature("order_1", "pay_1", "deadbeef", secret)).toBe(false);
    expect(verifyRazorpaySignature("order_1", "pay_1", signature, "other")).toBe(false);
  });

  it("round-trips mock payload signatures", () => {
    const payload = JSON.stringify({ orderId: "o1", action: "capture" });
    expect(verifyMockSignature(payload, signMockPayload(payload))).toBe(true);
    expect(verifyMockSignature(payload, "nope")).toBe(false);
    expect(verifyMockSignature(`${payload} `, signMockPayload(payload))).toBe(false);
  });
});

describe("customer cancellation windows", () => {
  const cutoff = "09:30";
  it("allows pending orders anytime", () => {
    expect(
      cancellableByCustomer(
        "PENDING_PAYMENT",
        "2026-10-20",
        cutoff,
        new Date("2026-10-25T00:00:00Z")
      )
    ).toBe(true);
  });

  it("allows future confirmed orders, blocks past ones", () => {
    const now = new Date("2026-10-25T00:00:00Z");
    expect(cancellableByCustomer("CONFIRMED", "2026-10-26", cutoff, now)).toBe(true);
    expect(cancellableByCustomer("CONFIRMED", "2026-10-24", cutoff, now)).toBe(false);
  });

  it("closes same-day cancellation at the cutoff minute", () => {
    // 09:29 IST == 03:59 UTC; 09:30 IST == 04:00 UTC on 2026-10-26.
    expect(
      cancellableByCustomer("CONFIRMED", "2026-10-26", cutoff, new Date("2026-10-26T03:59:00Z"))
    ).toBe(true);
    expect(
      cancellableByCustomer("CONFIRMED", "2026-10-26", cutoff, new Date("2026-10-26T04:00:00Z"))
    ).toBe(false);
  });

  it("never cancels terminal orders", () => {
    const now = new Date("2026-10-25T00:00:00Z");
    expect(cancellableByCustomer("CANCELLED", "2026-10-26", cutoff, now)).toBe(false);
  });
});
