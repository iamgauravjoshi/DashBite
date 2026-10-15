import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/auth-guards";
import { subscriptionAccess, subscriptionView } from "@/lib/subscriptions";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const result = await requireApiUser(request);
  if ("response" in result) return result.response;
  if (!(await subscriptionAccess(id, result.user.id, result.user.role))) {
    return apiError("NOT_FOUND", 404);
  }
  const view = await subscriptionView(id);
  if (!view) return apiError("NOT_FOUND", 404);
  return NextResponse.json({ subscription: view });
}
