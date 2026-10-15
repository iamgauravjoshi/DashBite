import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/auth-guards";
import { resumeSubscription, subscriptionAccess } from "@/lib/subscriptions";

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
  const outcome = await resumeSubscription(id, result.user.id);
  if (!outcome.ok) return apiError(outcome.code, 409);
  return NextResponse.json({
    resumed: true,
    extensionDays: outcome.extensionDays,
    endDate: outcome.endDate
  });
}
