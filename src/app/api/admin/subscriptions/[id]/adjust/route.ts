import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/auth-guards";
import { adjustSubscription } from "@/lib/subscriptions";
import { adjustSchema } from "@/lib/subscription-validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const result = await requireApiUser(request, ["PLATFORM_ADMIN"]);
  if ("response" in result) return result.response;
  const body = await request.json().catch(() => null);
  const parsed = adjustSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "INVALID",
      400,
      parsed.error.issues.map((i) => i.message)
    );
  }
  const outcome = await adjustSubscription(id, result.user.id, {
    kind: parsed.data.kind,
    days: parsed.data.days,
    meals: parsed.data.meals,
    reason: parsed.data.reason
  });
  if (!outcome.ok) {
    const status = outcome.code === "NOT_FOUND" ? 404 : 400;
    return apiError(outcome.code, status);
  }
  return NextResponse.json({ adjusted: id, ...outcome });
}
