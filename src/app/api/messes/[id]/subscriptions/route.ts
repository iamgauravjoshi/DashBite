import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, requireApiUser } from "@/lib/auth-guards";
import { subscriberCounts } from "@/lib/subscriptions";
import { addDays } from "@/lib/ist";
import { todayInTz } from "@/lib/ist";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const result = await requireApiUser(request, ["MESS_OWNER", "MESS_STAFF", "PLATFORM_ADMIN"]);
  if ("response" in result) return result.response;
  const { user } = result;
  if (user.role === "MESS_OWNER") {
    const mess = await db.mess.findUnique({ where: { id } });
    if (!mess || mess.ownerId !== user.id) return apiError("NOT_FOUND", 404);
  } else if (user.role === "MESS_STAFF") {
    const assignment = await db.messStaff.findUnique({
      where: { messId_userId: { messId: id, userId: user.id } }
    });
    if (!assignment) return apiError("NOT_FOUND", 404);
  }
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const subscriptions = await db.subscription.findMany({
    where: {
      messId: id,
      ...(status ? { status } : {})
    },
    include: {
      customer: { select: { name: true, email: true } },
      plan: { include: { slot: { select: { name: true } } } },
      skips: { select: { serviceDate: true } },
      pauses: true
    },
    orderBy: { createdAt: "desc" },
    take: 200
  });
  const today = todayInTz();
  const counts = await subscriberCounts(id, today, addDays(today, 6));
  return NextResponse.json({
    subscriptions: subscriptions.map((s) => ({
      id: s.id,
      customer: s.customer,
      planName: s.planName,
      slotName: s.plan.slot.name,
      status: s.status,
      startDate: s.startDate.toISOString().slice(0, 10),
      endDate: s.endDate.toISOString().slice(0, 10),
      mealsTotal: s.mealsTotal,
      skips: s.skips.length,
      pauses: s.pauses.length
    })),
    upcomingCounts: counts
  });
}
