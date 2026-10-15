import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  handlePaymentFailure,
  handlePaymentSuccess,
  verifyRazorpaySignature
} from "@/lib/payments";

interface RazorpayEntity {
  id: string;
  order_id?: string;
  amount?: number;
}

function errorJson(code: string, status: number) {
  return NextResponse.json({ error: { code } }, { status });
}

/**
 * Razorpay posts `{event, payload}` with `x-razorpay-signature` over the RAW body.
 * Success and failure settle through the same idempotent core as every other path.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!signature || !secret) return errorJson("UNAUTHORIZED", 401);
  let body: { event?: string; payload?: { payment?: { entity?: RazorpayEntity } } };
  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    return errorJson("INVALID", 400);
  }
  const entity = body.payload?.payment?.entity;
  if (!entity?.id || !entity.order_id) return errorJson("INVALID", 400);
  if (!verifyRazorpaySignature(entity.order_id, entity.id, signature, secret)) {
    return errorJson("BAD_SIGNATURE", 401);
  }
  const eventId = `${body.event ?? "event"}:${entity.id}`;
  if (body.event === "payment.captured") {
    const outcome = await handlePaymentSuccess({
      provider: "RAZORPAY",
      eventId,
      providerOrderId: entity.order_id,
      providerPaymentId: entity.id,
      amountPaise: entity.amount ?? 0
    });
    return NextResponse.json({ outcome: outcome.outcome });
  }
  if (body.event === "payment.failed") {
    const outcome = await handlePaymentFailure({
      provider: "RAZORPAY",
      eventId,
      providerOrderId: entity.order_id
    });
    return NextResponse.json({ outcome: outcome.outcome });
  }
  if (body.event === "refund.processed") {
    const refundId = (body.payload as { refund?: { entity?: { id?: string } } })?.refund?.entity
      ?.id;
    if (refundId) {
      await db.refund.updateMany({
        where: { providerRefundId: refundId },
        data: { status: "COMPLETED" }
      });
    }
    return NextResponse.json({ outcome: "REFUND_RECORDED" });
  }
  return errorJson("IGNORED_EVENT", 200);
}
