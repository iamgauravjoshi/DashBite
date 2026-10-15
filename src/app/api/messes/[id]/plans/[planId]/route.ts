import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, requireApiUser } from "@/lib/auth-guards";
import { getOwnerMess } from "@/lib/messes";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; planId: string }> }
): Promise<NextResponse> {
  const { id, planId } = await params;
  const result = await requireApiUser(request, ["MESS_OWNER"]);
  if ("response" in result) return result.response;
  if (!(await getOwnerMess(result.user.id, id))) return apiError("NOT_FOUND", 404);
  const plan = await db.subscriptionPlan.findUnique({ where: { id: planId } });
  if (!plan || plan.messId !== id) return apiError("NOT_FOUND", 404);
  const body = (await request.json().catch(() => null)) as { active?: unknown } | null;
  if (typeof body?.active !== "boolean") return apiError("INVALID", 400);
  const updated = await db.subscriptionPlan.update({
    where: { id: planId },
    data: { active: body.active }
  });
  return NextResponse.json({ plan: updated });
}
