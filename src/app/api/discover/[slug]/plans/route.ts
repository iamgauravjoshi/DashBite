import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/auth-guards";

/** Public plan discovery: active plans of eligible messes only. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse> {
  const { slug } = await params;
  const mess = await db.mess.findUnique({ where: { slug } });
  if (!mess || mess.verificationStatus !== "APPROVED" || !mess.published) {
    return apiError("NOT_FOUND", 404);
  }
  const plans = await db.subscriptionPlan.findMany({
    where: { messId: mess.id, active: true },
    include: { slot: { select: { id: true, name: true, cutoffTime: true, active: true } } }
  });
  return NextResponse.json({
    plans: plans
      .filter((p) => p.slot.active)
      .map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        slotName: p.slot.name,
        cutoffTime: p.slot.cutoffTime,
        mealsTotal: p.mealsTotal,
        validityDays: p.validityDays,
        pricePaise: p.pricePaise
      }))
  });
}
