import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, requireApiUser } from "@/lib/auth-guards";
import { handlePaymentFailure, handlePaymentSuccess } from "@/lib/payments";

/**
 * DEV/TEST ONLY payment simulator. Drives the same settle core as real webhooks
 * so money logic is identical; refused in production.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return apiError("NOT_FOUND", 404);
  const result = await requireApiUser(request, ["CUSTOMER"]);
  if ("response" in result) return result.response;
  const body = (await request.json().catch(() => null)) as {
    orderId?: string;
    subscriptionId?: string;
    action?: string;
  } | null;
  if (
    (!body?.orderId && !body?.subscriptionId) ||
    (body.action !== "capture" && body.action !== "fail")
  ) {
    return apiError("INVALID", 400);
  }
  const payment = body.orderId
    ? await db.payment.findFirst({
        where: { orderId: body.orderId, provider: "MOCK" },
        orderBy: { createdAt: "desc" }
      })
    : await db.payment.findFirst({
        where: { subscriptionId: body.subscriptionId, provider: "MOCK" },
        orderBy: { createdAt: "desc" }
      });
  if (!payment) return apiError("NOT_FOUND", 404);
  const order = payment.orderId
    ? await db.order.findUnique({ where: { id: payment.orderId } })
    : null;
  const subscription = payment.subscriptionId
    ? await db.subscription.findUnique({ where: { id: payment.subscriptionId } })
    : null;
  const record = order ?? subscription;
  if (!record) return apiError("NOT_FOUND", 404);
  if (record.customerId !== result.user.id) return apiError("NOT_FOUND", 404);
  const eventId = `mock_evt_${payment.id}_${body.action}`;
  if (body.action === "fail") {
    const outcome = await handlePaymentFailure({
      provider: "MOCK",
      eventId,
      providerOrderId: payment.providerOrderId
    });
    return NextResponse.json({ outcome: outcome.outcome });
  }
  const outcome = await handlePaymentSuccess({
    provider: "MOCK",
    eventId,
    providerOrderId: payment.providerOrderId,
    providerPaymentId: `mock_pay_${payment.id.slice(0, 8)}`,
    amountPaise: payment.amountPaise
  });
  return NextResponse.json({
    outcome: outcome.outcome,
    ...(payment.orderId ? { orderId: payment.orderId } : {}),
    ...(payment.subscriptionId ? { subscriptionId: payment.subscriptionId } : {})
  });
}
