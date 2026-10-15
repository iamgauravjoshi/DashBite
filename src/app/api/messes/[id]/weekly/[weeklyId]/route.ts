import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, requireApiUser } from "@/lib/auth-guards";
import { syncWeeklyCapacity } from "@/lib/capacity";
import { getOwnerMess, weeklyById } from "@/lib/messes";
import { weeklyItemSchema, weeklyMenuSchema } from "@/lib/menu-validation";

async function ownedWeekly(request: Request, messId: string, weeklyId: string) {
  const result = await requireApiUser(request, ["MESS_OWNER"]);
  if ("response" in result) return result;
  if (!(await getOwnerMess(result.user.id, messId)))
    return { response: apiError("NOT_FOUND", 404) };
  const weekly = await weeklyById(messId, weeklyId);
  if (!weekly) return { response: apiError("NOT_FOUND", 404) };
  return { user: result.user, weekly };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; weeklyId: string }> }
): Promise<NextResponse> {
  const { id, weeklyId } = await params;
  const result = await ownedWeekly(request, id, weeklyId);
  if ("response" in result) return result.response;
  const body = await request.json().catch(() => null);
  const parsed = weeklyMenuSchema.partial().safeParse(body);
  if (!parsed.success) {
    return apiError(
      "INVALID",
      400,
      parsed.error.issues.map((i) => i.message)
    );
  }
  const updated = await db.weeklyMenu.update({
    where: { id: weeklyId },
    data: {
      ...(parsed.data.capacity !== undefined ? { capacity: parsed.data.capacity } : {}),
      ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {})
    }
  });
  if (parsed.data.capacity !== undefined) {
    await syncWeeklyCapacity(id, updated.slotId, updated.dayOfWeek, parsed.data.capacity);
  }
  return NextResponse.json({ weekly: updated });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; weeklyId: string }> }
): Promise<NextResponse> {
  const { id, weeklyId } = await params;
  const result = await ownedWeekly(request, id, weeklyId);
  if ("response" in result) return result.response;
  // Date menus are snapshots: deleting the template never touches them (BR-14).
  await db.weeklyMenuItem.deleteMany({ where: { weeklyMenuId: weeklyId } });
  await db.weeklyMenu.delete({ where: { id: weeklyId } });
  return NextResponse.json({ deleted: weeklyId });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; weeklyId: string }> }
): Promise<NextResponse> {
  const { id, weeklyId } = await params;
  const result = await ownedWeekly(request, id, weeklyId);
  if ("response" in result) return result.response;
  return NextResponse.json({ weekly: result.weekly });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; weeklyId: string }> }
): Promise<NextResponse> {
  const { id, weeklyId } = await params;
  const result = await ownedWeekly(request, id, weeklyId);
  if ("response" in result) return result.response;
  const body = await request.json().catch(() => null);
  const parsed = weeklyItemSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "INVALID",
      400,
      parsed.error.issues.map((i) => i.message)
    );
  }
  const item = await db.menuItem.findUnique({ where: { id: parsed.data.itemId } });
  if (!item || item.messId !== id) return apiError("NOT_FOUND", 404);
  try {
    const link = await db.weeklyMenuItem.create({
      data: {
        weeklyMenuId: weeklyId,
        itemId: parsed.data.itemId,
        pricePaise: parsed.data.pricePaise ?? item.pricePaise,
        active: parsed.data.active ?? true
      }
    });
    return NextResponse.json({ item: link }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return apiError("DUPLICATE_ITEM", 409);
    throw error;
  }
}
