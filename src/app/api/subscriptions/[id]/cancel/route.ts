import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/auth-guards";
import { cancelSubscription, subscriptionAccess } from "@/lib/subscriptions";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const result = await requireApiUser(request, ["CUSTOMER"]);
  if ("response" in result) return result.response;
  if (!(await subscriptionAccess(id, result.user.id, result.user.role))) {
    return apiError("NOT_FOUND", 404);
  }
  const outcome = await cancelSubscription(id, result.user.id);
  if (!outcome.ok) {
    const status = outcome.code === "NOT_FOUND" ? 404 : 409;
    return apiError(outcome.code, status);
  }
  return NextResponse.json({
    cancelled: id,
    note: "Remaining meals are forfeited with no cash refund, per the disclosed policy."
  });
}
