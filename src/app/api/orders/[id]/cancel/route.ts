import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/auth-guards";
import { cancelOrder } from "@/lib/payments";
import { orderCancelSchema } from "@/lib/order-validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const result = await requireApiUser(request, ["CUSTOMER"]);
  if ("response" in result) return result.response;
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = orderCancelSchema.safeParse(body ?? {});
  if (!parsed.success) return apiError("INVALID", 400);
  const outcome = await cancelOrder(id, { id: result.user.id, kind: "CUSTOMER" });
  if (!outcome.ok) {
    const status = outcome.code === "NOT_FOUND" ? 404 : 409;
    return apiError(outcome.code, status);
  }
  return NextResponse.json({ cancelled: id, refunded: outcome.refunded });
}
