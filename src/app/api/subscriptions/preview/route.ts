import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/auth-guards";
import { previewSubscription } from "@/lib/subscriptions";

export async function GET(request: Request): Promise<NextResponse> {
  const result = await requireApiUser(request, ["CUSTOMER"]);
  if ("response" in result) return result.response;
  const planId = new URL(request.url).searchParams.get("planId");
  if (!planId) return apiError("INVALID", 400);
  const preview = await previewSubscription(result.user.id, planId);
  if (!preview.ok) return apiError(preview.code, 409);
  return NextResponse.json({ quote: preview.quote });
}
