import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, requireApiUser } from "@/lib/auth-guards";
import { cancelOrder } from "@/lib/payments";
import { orderCancelSchema } from "@/lib/order-validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; orderId: string }> }
): Promise<NextResponse> {
  const { id, orderId } = await params;
  const result = await requireApiUser(request, ["MESS_OWNER", "MESS_STAFF", "PLATFORM_ADMIN"]);
  if ("response" in result) return result.response;
  const { user } = result;
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || order.messId !== id) return apiError("NOT_FOUND", 404);
  if (user.role === "MESS_OWNER") {
    const mess = await db.mess.findUnique({ where: { id } });
    if (!mess || mess.ownerId !== user.id) return apiError("NOT_FOUND", 404);
  } else if (user.role === "MESS_STAFF") {
    const assignment = await db.messStaff.findUnique({
      where: { messId_userId: { messId: id, userId: user.id } }
    });
    if (!assignment) return apiError("NOT_FOUND", 404);
  }
  const body = await request.json().catch(() => null);
  const parsed = orderCancelSchema.safeParse(body ?? {});
  if (!parsed.success) return apiError("INVALID", 400);
  if (!parsed.data.reason?.trim()) return apiError("REASON_REQUIRED", 400);
  const outcome = await cancelOrder(orderId, {
    id: user.id,
    kind: user.role === "MESS_STAFF" ? "STAFF" : "OWNER",
    reason: parsed.data.reason
  });
  if (!outcome.ok) {
    const status = outcome.code === "NOT_FOUND" ? 404 : 409;
    return apiError(outcome.code, status);
  }
  return NextResponse.json({ cancelled: orderId, refunded: outcome.refunded });
}
