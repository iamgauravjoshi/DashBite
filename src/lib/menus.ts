import { db } from "@/lib/db";
import { isBeforeCutoff } from "@/lib/menu-rules";
import { timeInTz, toDbDate, todayInTz } from "@/lib/ist";

export interface ResolvedMenuItem {
  itemId: string;
  name: string;
  description: string | null;
  pricePaise: number;
  vegType: string;
  photoUrl: string | null;
}

export type MenuClosedReason =
  "SLOT_INACTIVE" | "NOT_OPERATING_DAY" | "HOLIDAY" | "DATE_CLOSED" | "NO_MENU";

export interface ResolvedMenu {
  status: "open" | "closed";
  closedReason?: MenuClosedReason;
  slotId: string;
  slotName: string;
  cutoffTime: string;
  capacity: number | null;
  items: ResolvedMenuItem[];
  /** Ordering closed for this service date (past cutoff); the menu stays viewable. */
  orderable: boolean;
}

export async function getMenuForDate(
  messId: string,
  dateStr: string,
  slotId: string,
  opts: { now?: Date; timezone?: string } = {}
): Promise<ResolvedMenu | null> {
  const timezone = opts.timezone ?? "Asia/Kolkata";
  const now = opts.now ?? new Date();
  const [mess, slot] = await Promise.all([
    db.mess.findUnique({ where: { id: messId } }),
    db.menuSlot.findUnique({ where: { id: slotId } })
  ]);
  if (!mess || !slot || slot.messId !== messId) return null;
  if (!slot.active) {
    return closed(slot, null, "SLOT_INACTIVE");
  }
  const jsDay = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
  const dayCode = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][jsDay];
  if (!mess.operatingDays.includes(dayCode)) {
    return closed(slot, null, "NOT_OPERATING_DAY");
  }
  const holiday = await db.holiday.findUnique({
    where: { messId_date: { messId, date: toDbDate(dateStr) } }
  });
  if (holiday) return closed(slot, null, "HOLIDAY");

  const dateMenu = await db.dateMenu.findUnique({
    where: { messId_slotId_date: { messId, slotId, date: toDbDate(dateStr) } },
    include: { items: { include: { item: true } } }
  });
  if (dateMenu) {
    if (dateMenu.closed) return closed(slot, null, "DATE_CLOSED");
    return open(slot, dateMenu.capacity, itemsOf(dateMenu.items), now, timezone, dateStr);
  }
  const weekly = await db.weeklyMenu.findUnique({
    where: { messId_slotId_dayOfWeek: { messId, slotId, dayOfWeek: jsDay } },
    include: { items: { include: { item: true } } }
  });
  if (!weekly || !weekly.active) {
    return closed(slot, null, "NO_MENU");
  }
  return open(slot, weekly.capacity, itemsOf(weekly.items), now, timezone, dateStr);
}

function itemsOf(
  rows: Array<{
    active: boolean;
    pricePaise: number;
    item: {
      id: string;
      name: string;
      description: string | null;
      vegType: string;
      photoUrl: string | null;
      active: boolean;
    };
  }>
): ResolvedMenuItem[] {
  return rows
    .filter((r) => r.active && r.item.active)
    .map((r) => ({
      itemId: r.item.id,
      name: r.item.name,
      description: r.item.description,
      pricePaise: r.pricePaise,
      vegType: r.item.vegType,
      photoUrl: r.item.photoUrl
    }));
}

function closed(
  slot: { id: string; name: string; cutoffTime: string },
  capacity: number | null,
  reason: MenuClosedReason
): ResolvedMenu {
  return {
    status: "closed",
    closedReason: reason,
    slotId: slot.id,
    slotName: slot.name,
    cutoffTime: slot.cutoffTime,
    capacity,
    items: [],
    orderable: false
  };
}

function open(
  slot: { id: string; name: string; cutoffTime: string },
  capacity: number | null,
  items: ResolvedMenuItem[],
  now: Date,
  timezone: string,
  dateStr: string
): ResolvedMenu {
  if (items.length === 0) return closed(slot, capacity, "NO_MENU");
  const today = todayInTz(timezone, now);
  const orderable =
    dateStr > today ||
    (dateStr === today && isBeforeCutoff(timeInTz(timezone, now), slot.cutoffTime));
  return {
    status: "open",
    slotId: slot.id,
    slotName: slot.name,
    cutoffTime: slot.cutoffTime,
    capacity,
    items,
    orderable
  };
}
