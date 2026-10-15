import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, requireApiUser } from "@/lib/auth-guards";
import { getOwnerMess } from "@/lib/messes";
import { syncWeeklyCapacity } from "@/lib/capacity";
import { weeklyMenuSchema } from "@/lib/menu-validation";

async function owned(request: Request, messId: string) {
  const result = await requireApiUser(request, ["MESS_OWNER"]);
  if ("response" in result) return result;
  if (!(await getOwnerMess(result.user.id, messId)))
    return { response: apiError("NOT_FOUND", 404) };
  return { user: result.user };
}

async function slotOf(messId: string, slotId: string) {
  const slot = await db.menuSlot.findUnique({ where: { id: slotId } });
  return slot && slot.messId === messId ? slot : null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const result = await owned(request, id);
  if ("response" in result) return result.response;
  const weekly = await db.weeklyMenu.findMany({
    where: { messId: id },
    include: { slot: true, items: { include: { item: true } } },
    orderBy: [{ slotId: "asc" }, { dayOfWeek: "asc" }]
  });
  return NextResponse.json({ weekly });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const result = await owned(request, id);
  if ("response" in result) return result.response;
  const body = await request.json().catch(() => null);
  const parsed = weeklyMenuSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "INVALID",
      400,
      parsed.error.issues.map((i) => i.message)
    );
  }
  if (!(await slotOf(id, parsed.data.slotId))) return apiError("NOT_FOUND", 404);
  const weekly = await db.weeklyMenu.upsert({
    where: {
      messId_slotId_dayOfWeek: {
        messId: id,
        slotId: parsed.data.slotId,
        dayOfWeek: parsed.data.dayOfWeek
      }
    },
    create: {
      messId: id,
      slotId: parsed.data.slotId,
      dayOfWeek: parsed.data.dayOfWeek,
      capacity: parsed.data.capacity,
      active: parsed.data.active ?? true
    },
    update: {
      capacity: parsed.data.capacity,
      active: parsed.data.active ?? true
    },
    include: { items: true }
  });
  await syncWeeklyCapacity(id, parsed.data.slotId, parsed.data.dayOfWeek, parsed.data.capacity);
  return NextResponse.json({ weekly }, { status: 201 });
}
