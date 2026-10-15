import { db } from "@/lib/db";
import { toDbDate, todayInTz } from "@/lib/ist";
import { getMenuForDate } from "@/lib/menus";

export interface Availability {
  slotDayId: string;
  capacity: number;
  booked: number;
  left: number;
}

/**
 * Materialize the booking ledger for an open slot-day. Returns null when the
 * menu is closed (no ledger, nothing bookable). Capacity edits sync through
 * syncSlotDayCapacity so existing bookings are never stranded (BR-18).
 */
export async function ensureSlotDay(
  messId: string,
  slotId: string,
  dateStr: string
): Promise<Availability | null> {
  const menu = await getMenuForDate(messId, dateStr, slotId);
  if (!menu || menu.status !== "open" || menu.capacity == null) return null;
  const key = { messId_slotId_date: { messId, slotId, date: toDbDate(dateStr) } };
  const toAvailability = (day: { id: string; capacity: number; booked: number }): Availability => ({
    slotDayId: day.id,
    capacity: day.capacity,
    booked: day.booked,
    left: Math.max(0, day.capacity - day.booked)
  });
  // Fast path first; on a concurrent first-touch race the losers re-read the winner (BR-07).
  const existing = await db.slotDay.findUnique({ where: key });
  if (existing) return toAvailability(existing);
  try {
    const created = await db.slotDay.create({
      data: { messId, slotId, date: toDbDate(dateStr), capacity: menu.capacity, booked: 0 }
    });
    return toAvailability(created);
  } catch (error) {
    if ((error as { code?: string }).code !== "P2002") throw error;
    return toAvailability(await db.slotDay.findUniqueOrThrow({ where: key }));
  }
}

/**
 * Sync ledger capacity after a menu capacity edit. Never strands bookings:
 * capacity floors at already-booked. Applies to one date; callers fan out.
 */
export async function syncSlotDayCapacity(
  messId: string,
  slotId: string,
  dateStr: string,
  effectiveCapacity: number
): Promise<void> {
  const existing = await db.slotDay.findUnique({
    where: { messId_slotId_date: { messId, slotId, date: toDbDate(dateStr) } }
  });
  if (!existing) return;
  await db.slotDay.update({
    where: { id: existing.id },
    data: { capacity: Math.max(effectiveCapacity, existing.booked) }
  });
}

/**
 * Spread a weekly capacity edit to future booking ledgers without stranding bookings.
 * Past ledgers are history and stay untouched.
 */
export async function syncWeeklyCapacity(
  messId: string,
  slotId: string,
  dayOfWeek: number,
  capacity: number
) {
  const rows = await db.slotDay.findMany({
    where: { messId, slotId, date: { gte: toDbDate(todayInTz()) } }
  });
  for (const row of rows) {
    if (new Date(row.date).getUTCDay() !== dayOfWeek) continue;
    await db.slotDay.update({
      where: { id: row.id },
      data: { capacity: Math.max(capacity, row.booked) }
    });
  }
}

/**
 * Atomic reservation (BR-07): a single UPDATE … WHERE booked + qty <= capacity.
 * Concurrent callers serialize in Postgres; oversell is impossible through this path.
 */
export async function tryReserve(
  messId: string,
  slotId: string,
  dateStr: string,
  qty: number
): Promise<{ ok: true; left: number } | { ok: false; reason: "NO_MENU" | "SOLD_OUT" }> {
  if (!Number.isInteger(qty) || qty <= 0) return { ok: false, reason: "SOLD_OUT" };
  const day = await ensureSlotDay(messId, slotId, dateStr);
  if (!day) return { ok: false, reason: "NO_MENU" };
  const affected = await db.$executeRaw`
    UPDATE "slot_day"
    SET "booked" = "booked" + ${qty}, "updatedAt" = NOW()
    WHERE "id" = ${day.slotDayId} AND "booked" + ${qty} <= "capacity"`;
  if (affected !== 1) return { ok: false, reason: "SOLD_OUT" };
  return { ok: true, left: Math.max(0, day.left - qty) };
}

export async function releaseReservation(
  messId: string,
  slotId: string,
  dateStr: string,
  qty: number
): Promise<void> {
  const day = await db.slotDay.findUnique({
    where: { messId_slotId_date: { messId, slotId, date: toDbDate(dateStr) } }
  });
  if (!day) return;
  await db.$executeRaw`
    UPDATE "slot_day" SET "booked" = GREATEST("booked" - ${qty}, 0) WHERE "id" = ${day.id}`;
}

export function upcomingDates(timezone: string, days: number, now = new Date()): string[] {
  const start = todayInTz(timezone, now);
  const out: string[] = [];
  const [y, m, d] = start.split("-").map(Number);
  for (let i = 0; i < days; i++) {
    const dt = new Date(Date.UTC(y, m - 1, d + i));
    out.push(dt.toISOString().slice(0, 10));
  }
  return out;
}
