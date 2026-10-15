import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/auth-guards";
import { isValidDateString, todayInTz } from "@/lib/ist";
import { getMenuForDate } from "@/lib/menus";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse> {
  const { slug } = await params;
  const mess = await db.mess.findUnique({ where: { slug } });
  if (!mess || mess.verificationStatus !== "APPROVED" || !mess.published) {
    return apiError("NOT_FOUND", 404);
  }
  const search = new URL(request.url).searchParams;
  const date = search.get("date") ?? todayInTz();
  const slotId = search.get("slotId") ?? null;
  if (!isValidDateString(date) || date < todayInTz()) return apiError("INVALID", 400);
  const slots = await db.menuSlot.findMany({
    where: { messId: mess.id, active: true },
    orderBy: { sortOrder: "asc" }
  });
  const slot = (slotId && slots.find((s) => s.id === slotId)) || slots[0];
  if (!slot) return apiError("NO_SLOTS", 404);
  const menu = await getMenuForDate(mess.id, date, slot.id);
  const day = menu
    ? await db.slotDay.findUnique({
        where: {
          messId_slotId_date: {
            messId: mess.id,
            slotId: slot.id,
            date: new Date(`${date}T00:00:00.000Z`)
          }
        }
      })
    : null;
  return NextResponse.json({
    mess: {
      id: mess.id,
      name: mess.name,
      pickupAllowed: mess.pickupAllowed,
      deliveryAllowed: mess.deliveryAllowed,
      deliveryFeePaise: mess.deliveryFeePaise,
      deliveryNote: mess.deliveryNote
    },
    slots: slots.map((s) => ({ id: s.id, name: s.name })),
    date,
    menu: menu
      ? {
          status: menu.status,
          closedReason: menu.closedReason ?? null,
          slotId: menu.slotId,
          slotName: menu.slotName,
          cutoffTime: menu.cutoffTime,
          capacity: menu.capacity,
          orderable: menu.orderable,
          left: day ? Math.max(0, day.capacity - day.booked) : menu.capacity,
          items: menu.items
        }
      : null
  });
}
