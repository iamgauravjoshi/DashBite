import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/auth-guards";
import { skipMeals, subscriptionAccess } from "@/lib/subscriptions";
import { skipSchema } from "@/lib/subscription-validation";

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
  const body = await request.json().catch(() => null);
  const parsed = skipSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "INVALID",
      400,
      parsed.error.issues.map((i) => i.message)
    );
  }
  const outcome = await skipMeals(id, result.user.id, parsed.data.dates, parsed.data.reason);
  if (!outcome.ok) {
    const status =
      outcome.code === "NOT_FOUND" ? 404 : outcome.code === "ALREADY_SKIPPED" ? 409 : 400;
    return NextResponse.json(
      { error: { code: outcome.code, ...(outcome.date ? { date: outcome.date } : {}) } },
      { status }
    );
  }
  return NextResponse.json({ skipped: outcome.skipped }, { status: 201 });
}
