import { db } from "@/lib/db";
import { toDbDate } from "@/lib/ist";
import { getMenuForDate, type ResolvedMenu } from "@/lib/menus";
import { subscriberCounts } from "@/lib/subscriptions";

export interface SheetLine {
  itemId: string;
  name: string;
  vegType: string;
  qty: number;
}

export interface PackingRow {
  orderId: string;
  shortId: string;
  customer: string;
  fulfillment: string;
  address: string | null;
  items: Array<{ name: string; qty: number }>;
  totalQty: number;
}

export interface LateChange {
  kind: "ORDER_CONFIRMED" | "ORDER_CANCELLED" | "ADJUSTMENT";
  ref: string;
  detail: string;
  at: string;
}

export interface SheetException {
  orderId: string;
  customer: string;
  status: string;
  reason: string | null;
  at: string;
}

export interface KitchenSheetView {
  sheet: { id: string; status: string; finalizedAt: string | null } | null;
  menu: ResolvedMenu | null;
  date: string;
  slotId: string;
  oneTime: SheetLine[];
  oneTimeTotal: number;
  subscribers: number;
  adjustments: Array<{
    id: string;
    itemLabel: string;
    qtyDelta: number;
    reason: string;
    at: string;
  }>;
  adjustmentTotal: number;
  prepTotal: number;
  packing: PackingRow[];
  pending: Array<{ orderId: string; customer: string; qty: number; totalPaise: number }>;
  exceptions: SheetException[];
  lateChanges: LateChange[];
}

/** Kitchen read access: mess owner, assigned staff, platform admin. */
export async function kitchenAccess(
  messId: string,
  userId: string,
  role: string
): Promise<boolean> {
  if (role === "PLATFORM_ADMIN") return true;
  const mess = await db.mess.findUnique({ where: { id: messId } });
  if (!mess) return false;
  if (role === "MESS_OWNER" && mess.ownerId === userId) return true;
  if (role === "MESS_STAFF") {
    const assignment = await db.messStaff.findUnique({
      where: { messId_userId: { messId, userId } }
    });
    return Boolean(assignment);
  }
  return false;
}

export async function buildSheet(
  messId: string,
  slotId: string,
  dateStr: string,
  now = new Date()
): Promise<KitchenSheetView> {
  const menu = await getMenuForDate(messId, dateStr, slotId);
  const date = toDbDate(dateStr);
  const sheet = await db.kitchenSheet.findUnique({
    where: { messId_slotId_date: { messId, slotId, date } },
    include: { adjustments: { orderBy: { createdAt: "asc" } } }
  });

  const confirmed = await db.order.findMany({
    where: { messId, slotId, serviceDate: date, status: "CONFIRMED" },
    include: { items: true, customer: { select: { name: true } } },
    orderBy: { createdAt: "asc" }
  });
  const byItem = new Map<string, SheetLine>();
  const itemIds = [...new Set(confirmed.flatMap((o) => o.items.map((i) => i.itemId)))];
  const catalog = await db.menuItem.findMany({ where: { id: { in: itemIds } } });
  const vegById = new Map(catalog.map((c) => [c.id, c.vegType]));
  for (const order of confirmed) {
    for (const line of order.items) {
      const key = line.itemId;
      const prev = byItem.get(key) ?? {
        itemId: key,
        name: line.name,
        vegType: vegById.get(key) ?? "UNKNOWN",
        qty: 0
      };
      prev.qty += line.qty;
      byItem.set(key, prev);
    }
  }
  const oneTime = [...byItem.values()].sort((a, b) => (a.name < b.name ? -1 : 1));
  const oneTimeTotal = oneTime.reduce((n, l) => n + l.qty, 0);

  const counts = await subscriberCounts(messId, dateStr, dateStr, now);
  const subscribers = counts.find((c) => c.slotId === slotId)?.count ?? 0;

  const adjustments = (sheet?.adjustments ?? []).map((a) => ({
    id: a.id,
    itemLabel: a.itemLabel,
    qtyDelta: a.qtyDelta,
    reason: a.reason,
    at: a.createdAt.toISOString()
  }));
  const adjustmentTotal = adjustments.reduce((n, a) => n + a.qtyDelta, 0);

  const packing: PackingRow[] = confirmed.map((order) => ({
    orderId: order.id,
    shortId: order.id.slice(-6).toUpperCase(),
    customer: order.customer.name,
    fulfillment: order.fulfillment,
    address: null,
    items: order.items.map((i) => ({ name: i.name, qty: i.qty })),
    totalQty: order.items.reduce((n, i) => n + i.qty, 0)
  }));
  const deliveryIds = confirmed.filter((o) => o.fulfillment === "DELIVERY").map((o) => o.addressId);
  if (deliveryIds.some(Boolean)) {
    const addresses = await db.address.findMany({
      where: { id: { in: deliveryIds.filter(Boolean) as string[] } }
    });
    const byId = new Map(addresses.map((a) => [a.id, `${a.line1}, ${a.locality} ${a.pincode}`]));
    for (const row of packing) {
      const order = confirmed.find((o) => o.id === row.orderId);
      row.address = (order?.addressId && byId.get(order.addressId)) || null;
    }
  }

  const pendingOrders = await db.order.findMany({
    where: { messId, slotId, serviceDate: date, status: "PENDING_PAYMENT" },
    include: { customer: { select: { name: true } }, items: true },
    orderBy: { createdAt: "asc" }
  });

  const cancelled = await db.order.findMany({
    where: { messId, slotId, serviceDate: date, status: "CANCELLED" },
    include: { customer: { select: { name: true } } },
    orderBy: { cancelledAt: "desc" }
  });

  const finalizedAt = sheet?.finalizedAt ?? null;
  const lateChanges: LateChange[] = [];
  if (finalizedAt) {
    const stamp = finalizedAt.toISOString();
    for (const order of confirmed) {
      if (order.updatedAt.toISOString() > stamp) {
        lateChanges.push({
          kind: "ORDER_CONFIRMED",
          ref: order.id.slice(-6).toUpperCase(),
          detail: `${order.customer.name} · ${order.items.reduce((n, i) => n + i.qty, 0)} meals confirmed after finalization`,
          at: order.updatedAt.toISOString()
        });
      }
    }
    for (const order of cancelled) {
      const at = (order.cancelledAt ?? order.updatedAt).toISOString();
      if (at > stamp) {
        lateChanges.push({
          kind: "ORDER_CANCELLED",
          ref: order.id.slice(-6).toUpperCase(),
          detail: `${order.customer.name} · cancelled (${(order.cancelReason ?? "no reason").toLowerCase().replace(/_/g, " ")})`,
          at
        });
      }
    }
    for (const adj of adjustments) {
      if (adj.at > stamp) {
        lateChanges.push({
          kind: "ADJUSTMENT",
          ref: adj.itemLabel,
          detail: `${adj.qtyDelta > 0 ? "+" : ""}${adj.qtyDelta} · ${adj.reason}`,
          at: adj.at
        });
      }
    }
    lateChanges.sort((a, b) => (a.at < b.at ? -1 : 1));
  }

  return {
    sheet: sheet
      ? {
          id: sheet.id,
          status: sheet.status,
          finalizedAt: sheet.finalizedAt?.toISOString() ?? null
        }
      : null,
    menu,
    date: dateStr,
    slotId,
    oneTime,
    oneTimeTotal,
    subscribers,
    adjustments,
    adjustmentTotal,
    prepTotal: oneTimeTotal + subscribers + adjustmentTotal,
    packing,
    pending: pendingOrders.map((o) => ({
      orderId: o.id,
      customer: o.customer.name,
      qty: o.items.reduce((n, i) => n + i.qty, 0),
      totalPaise: o.payablePaise
    })),
    exceptions: cancelled.map((o) => ({
      orderId: o.id,
      customer: o.customer.name,
      status: o.status,
      reason: o.cancelReason,
      at: (o.cancelledAt ?? o.updatedAt).toISOString()
    })),
    lateChanges
  };
}

export async function finalizeSheet(
  messId: string,
  slotId: string,
  dateStr: string,
  actorId: string
) {
  const existing = await db.kitchenSheet.findUnique({
    where: { messId_slotId_date: { messId, slotId, date: toDbDate(dateStr) } }
  });
  if (existing?.status === "FINALIZED") return existing;
  return db.kitchenSheet.upsert({
    where: { messId_slotId_date: { messId, slotId, date: toDbDate(dateStr) } },
    create: {
      messId,
      slotId,
      date: toDbDate(dateStr),
      status: "FINALIZED",
      finalizedAt: new Date(),
      finalizedBy: actorId
    },
    update: { status: "FINALIZED", finalizedAt: new Date(), finalizedBy: actorId }
  });
}

export async function addAdjustment(
  messId: string,
  slotId: string,
  dateStr: string,
  actorId: string,
  input: { itemLabel: string; qtyDelta: number; reason: string }
) {
  const sheet = await db.kitchenSheet.upsert({
    where: { messId_slotId_date: { messId, slotId, date: toDbDate(dateStr) } },
    create: { messId, slotId, date: toDbDate(dateStr), status: "OPEN" },
    update: {}
  });
  return db.kitchenAdjustment.create({
    data: {
      sheetId: sheet.id,
      actorId,
      itemLabel: input.itemLabel,
      qtyDelta: input.qtyDelta,
      reason: input.reason
    }
  });
}
