import { createHmac } from "node:crypto";
import { timeInTz, todayInTz } from "@/lib/ist";
import { isBeforeCutoff } from "@/lib/menu-rules";

/** Razorpay webhook HMAC: hex(sha256(order_id|payment_id, key_secret)). */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): boolean {
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++)
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

export function verifyMockSignature(payload: string, signature: string): boolean {
  const secret = process.env.MOCK_WEBHOOK_SECRET ?? "dev-mock-secret";
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  return expected === signature;
}

export function signMockPayload(payload: string): string {
  const secret = process.env.MOCK_WEBHOOK_SECRET ?? "dev-mock-secret";
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/** Customer cancellation rules: pending anytime; confirmed only before the cutoff. */
export function cancellableByCustomer(
  status: string,
  serviceDate: string,
  cutoffTime: string,
  now = new Date(),
  timezone = "Asia/Kolkata"
): boolean {
  if (status === "PENDING_PAYMENT") return true;
  if (status !== "CONFIRMED") return false;
  const today = todayInTz(timezone, now);
  if (serviceDate > today) return true;
  if (serviceDate < today) return false;
  return isBeforeCutoff(timeInTz(timezone, now), cutoffTime);
}
