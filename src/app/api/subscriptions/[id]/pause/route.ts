import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/auth-guards";
import { pauseSubscription, subscriptionAccess } from "@/lib/subscriptions";

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
  const outcome = await pauseSubscription(id, result.user.id);
  if (!outcome.ok) return apiError(outcome.code, 409);
  return NextResponse.json({
    paused: true,
    pauseStart: outcome.pauseStart,
    note: "Pause starts tomorrow. Validity extends by paused service days on resume."
  });
}
