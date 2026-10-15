import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, requireApiUser } from "@/lib/auth-guards";
import { getOwnerMess } from "@/lib/messes";
import { planSchema } from "@/lib/subscription-validation";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const result = await requireApiUser(request, ["MESS_OWNER"]);
  if ("response" in result) return result.response;
  if (!(await getOwnerMess(result.user.id, id))) return apiError("NOT_FOUND", 404);
  const plans = await db.subscriptionPlan.findMany({
    where: { messId: id },
    include: { slot: { select: { name: true } } },
    orderBy: { createdAt: "asc" }
  });
  return NextResponse.json({ plans });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const result = await requireApiUser(request, ["MESS_OWNER"]);
  if ("response" in result) return result.response;
  if (!(await getOwnerMess(result.user.id, id))) return apiError("NOT_FOUND", 404);
  const body = await request.json().catch(() => null);
  const parsed = planSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "INVALID",
      400,
      parsed.error.issues.map((i) => i.message)
    );
  }
  const slot = await db.menuSlot.findUnique({ where: { id: parsed.data.slotId } });
  if (!slot || slot.messId !== id) return apiError("NOT_FOUND", 404);
  const plan = await db.subscriptionPlan.create({
    data: {
      messId: id,
      slotId: parsed.data.slotId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      mealsTotal: parsed.data.mealsTotal,
      validityDays: parsed.data.validityDays,
      pricePaise: parsed.data.pricePaise,
      active: parsed.data.active ?? true
    }
  });
  return NextResponse.json({ plan }, { status: 201 });
}
