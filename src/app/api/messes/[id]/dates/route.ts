import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, requireApiUser } from "@/lib/auth-guards";
import { syncSlotDayCapacity } from "@/lib/capacity";
import { toDbDate, todayInTz } from "@/lib/ist";
import { getOwnerMess } from "@/lib/messes";
import { dateMenuSchema } from "@/lib/menu-validation";

async function owned(request: Request, messId: string) {
  const result = await requireApiUser(request, ["MESS_OWNER"]);
  if ("response" in result) return result;
  if (!(await getOwnerMess(result.user.id, messId)))
    return { response: apiError("NOT_FOUND", 404) };
  return { user: result.user };
}

function windowBounds(searchParams: URLSearchParams) {
  const today = todayInTz();
  const from = searchParams.get("from") ?? today;
  const [y, m, d] = from.split("-").map(Number);
  const end = new Date(Date.UTC(y || 2000, (m || 1) - 1, (d || 1) + 13));
  return { from, to: end.toISOString().slice(0, 10) };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const result = await owned(request, id);
  if ("response" in result) return result.response;
  const { from, to } = windowBounds(new URL(request.url).searchParams);
  const dates = await db.dateMenu.findMany({
    where: { messId: id, date: { gte: toDbDate(from), lte: toDbDate(to) } },
    include: { slot: true, items: { include: { item: true } } },
    orderBy: [{ date: "asc" }]
  });
  return NextResponse.json({ dates });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const result = await owned(request, id);
  if ("response" in result) return result.response;
  const body = await request.json().catch(() => null);
  const parsed = dateMenuSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "INVALID",
      400,
      parsed.error.issues.map((i) => i.message)
    );
  }
  const data = parsed.data;
  if (data.date < todayInTz()) return apiError("PAST_DATE", 400);
  const slot = await db.menuSlot.findUnique({ where: { id: data.slotId } });
  if (!slot || slot.messId !== id) return apiError("NOT_FOUND", 404);
  for (const row of data.items) {
    const item = await db.menuItem.findUnique({ where: { id: row.itemId } });
    if (!item || item.messId !== id) return apiError("UNKNOWN_ITEM", 400);
  }
  const saved = await db.$transaction(async (tx) => {
    const dateMenu = await tx.dateMenu.upsert({
      where: { messId_slotId_date: { messId: id, slotId: data.slotId, date: toDbDate(data.date) } },
      create: {
        messId: id,
        slotId: data.slotId,
        date: toDbDate(data.date),
        closed: data.closed ?? false,
        capacity: data.capacity
      },
      update: {
        closed: data.closed ?? false,
        capacity: data.capacity
      }
    });
    await tx.dateMenuItem.deleteMany({ where: { dateMenuId: dateMenu.id } });
    if (data.items.length > 0) {
      await tx.dateMenuItem.createMany({
        data: data.items.map((row) => ({
          dateMenuId: dateMenu.id,
          itemId: row.itemId,
          pricePaise: row.pricePaise,
          active: row.active ?? true
        }))
      });
    }
    return tx.dateMenu.findUniqueOrThrow({
      where: { id: dateMenu.id },
      include: { items: { include: { item: true } } }
    });
  });
  if (data.capacity !== undefined) {
    await syncSlotDayCapacity(id, data.slotId, data.date, data.capacity);
  }
  return NextResponse.json({ dateMenu: saved }, { status: 201 });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const result = await owned(request, id);
  if ("response" in result) return result.response;
  const { searchParams } = new URL(request.url);
  const dateMenuId = searchParams.get("dateMenuId");
  if (!dateMenuId) return apiError("INVALID", 400);
  const dateMenu = await db.dateMenu.findUnique({ where: { id: dateMenuId } });
  if (!dateMenu || dateMenu.messId !== id) return apiError("NOT_FOUND", 404);
  await db.dateMenuItem.deleteMany({ where: { dateMenuId } });
  await db.dateMenu.delete({ where: { id: dateMenuId } });
  return NextResponse.json({ deleted: dateMenuId });
}
