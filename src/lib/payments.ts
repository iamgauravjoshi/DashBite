import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { toDbDate, todayInTz } from "@/lib/ist";
import { getMenuForDate } from "@/lib/menus";
import { releaseReservation, tryReserve } from "@/lib/capacity";
import { cancellableByCustomer } from "@/lib/payment-rules";
import { ensureFulfillment } from "@/lib/fulfillment";

export {
  cancellableByCustomer,
  signMockPayload,
  verifyMockSignature,
  verifyRazorpaySignature
} from "@/lib/payment-rules";

export type ProviderName = "RAZORPAY" | "MOCK";
export type OrderStatus = "PENDING_PAYMENT" | "CONFIRMED" | "CANCELLED";
export type PaymentStatus =
  | "CREATED"
  | "AUTHORIZED"
  | "CAPTURED"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";
export type Fulfillment = "PICKUP" | "DELIVERY";

export interface QuoteLine {
  itemId: string;
  name: string;
  pricePaise: number;
  qty: number;
  lineTotal: number;
}

export interface Quote {
  messId: string;
  slotId: string;
  serviceDate: string;
  fulfillment: Fulfillment;
  lines: QuoteLine[];
  totalQty: number;
  itemTotalPaise: number;
  deliveryFeePaise: number;
  discountPaise: number;
  taxPaise: number;
  payablePaise: number;
  orderable: boolean;
  left: number | null;
}

export type QuoteFailure =
  | "MESS_UNAVAILABLE"
  | "SLOT_CLOSED"
  | "MENU_CLOSED"
  | "UNKNOWN_ITEM"
  | "BAD_QTY"
  | "FULFILLMENT_UNSUPPORTED"
  | "ADDRESS_REQUIRED"
  | "ADDRESS_UNKNOWN"
  | "PAST_DATE";

/** Which provider handles money. Mock is dev/test only and refuses production. */
export function activeProvider(): ProviderName {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) return "RAZORPAY";
  if (process.env.NODE_ENV === "production") {
    throw new Error("No payment provider configured for production.");
  }
  return "MOCK";
}

export function publicKeyId(): string | null {
  return process.env.RAZORPAY_KEY_ID ?? null;
}

async function providerCreateOrder(
  provider: ProviderName,
  orderId: string,
  amountPaise: number
): Promise<{ providerOrderId: string }> {
  if (provider === "MOCK") return { providerOrderId: `mock_${randomUUID().replace(/-/g, "")}` };
  const Razorpay = (await import("razorpay")).default;
  const client = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID ?? "",
    key_secret: process.env.RAZORPAY_KEY_SECRET ?? ""
  });
  const created = (await client.orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt: orderId
  })) as unknown as { id: string };
  return { providerOrderId: created.id };
}

async function providerRefund(
  provider: ProviderName,
  providerPaymentId: string | null,
  amountPaise: number
): Promise<{ providerRefundId: string; completed: boolean }> {
  if (provider === "MOCK" || !providerPaymentId) {
    return { providerRefundId: `mock_rf_${randomUUID().replace(/-/g, "")}`, completed: true };
  }
  const Razorpay = (await import("razorpay")).default;
  const client = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID ?? "",
    key_secret: process.env.RAZORPAY_KEY_SECRET ?? ""
  });
  const refund = (await client.payments.refund(providerPaymentId, {
    amount: amountPaise
  })) as unknown as { id: string };
  return { providerRefundId: refund.id, completed: true };
}

export interface QuoteInput {
  messId: string;
  slotId: string;
  serviceDate: string;
  items: Array<{ itemId: string; qty: number }>;
  fulfillment: Fulfillment;
  addressId?: string;
  customerId: string;
}

export async function buildQuote(
  input: QuoteInput
): Promise<{ ok: true; quote: Quote } | { ok: false; code: QuoteFailure }> {
  const mess = await db.mess.findUnique({ where: { id: input.messId } });
  if (!mess || mess.verificationStatus !== "APPROVED" || !mess.published) {
    return { ok: false, code: "MESS_UNAVAILABLE" };
  }
  if (input.serviceDate < todayInTz()) return { ok: false, code: "PAST_DATE" };
  const slot = await db.menuSlot.findUnique({ where: { id: input.slotId } });
  if (!slot || slot.messId !== input.messId || !slot.active)
    return { ok: false, code: "SLOT_CLOSED" };
  const menu = await getMenuForDate(input.messId, input.serviceDate, input.slotId);
  if (!menu || menu.status !== "open") return { ok: false, code: "MENU_CLOSED" };
  if (input.fulfillment === "PICKUP" && !mess.pickupAllowed) {
    return { ok: false, code: "FULFILLMENT_UNSUPPORTED" };
  }
  if (input.fulfillment === "DELIVERY" && !mess.deliveryAllowed) {
    return { ok: false, code: "FULFILLMENT_UNSUPPORTED" };
  }
  if (input.fulfillment === "DELIVERY") {
    if (!input.addressId) return { ok: false, code: "ADDRESS_REQUIRED" };
    const address = await db.address.findFirst({
      where: { id: input.addressId, userId: input.customerId }
    });
    if (!address) return { ok: false, code: "ADDRESS_UNKNOWN" };
  }
  if (input.items.length === 0 || input.items.length > 20) return { ok: false, code: "BAD_QTY" };
  const byId = new Map(menu.items.map((i) => [i.itemId, i]));
  const lines: QuoteLine[] = [];
  for (const row of input.items) {
    const menuItem = byId.get(row.itemId);
    if (!menuItem) return { ok: false, code: "UNKNOWN_ITEM" };
    if (!Number.isInteger(row.qty) || row.qty < 1 || row.qty > 20)
      return { ok: false, code: "BAD_QTY" };
    lines.push({
      itemId: menuItem.itemId,
      name: menuItem.name,
      pricePaise: menuItem.pricePaise,
      qty: row.qty,
      lineTotal: menuItem.pricePaise * row.qty
    });
  }
  const totalQty = lines.reduce((n, l) => n + l.qty, 0);
  if (totalQty > 50) return { ok: false, code: "BAD_QTY" };
  const itemTotalPaise = lines.reduce((n, l) => n + l.lineTotal, 0);
  const deliveryFeePaise = input.fulfillment === "DELIVERY" ? mess.deliveryFeePaise : 0;
  const payablePaise = itemTotalPaise + deliveryFeePaise;
  const availability =
    menu.capacity == null
      ? null
      : await db.slotDay
          .findUnique({
            where: {
              messId_slotId_date: {
                messId: input.messId,
                slotId: input.slotId,
                date: toDbDate(input.serviceDate)
              }
            }
          })
          .then((d) => (d ? Math.max(0, d.capacity - d.booked) : menu.capacity));
  return {
    ok: true,
    quote: {
      messId: input.messId,
      slotId: input.slotId,
      serviceDate: input.serviceDate,
      fulfillment: input.fulfillment,
      lines,
      totalQty,
      itemTotalPaise,
      deliveryFeePaise,
      discountPaise: 0,
      taxPaise: 0,
      payablePaise,
      orderable: menu.orderable,
      left: availability
    }
  };
}

export async function createOrder(input: QuoteInput): Promise<
  | {
      ok: true;
      orderId: string;
      provider: ProviderName;
      providerOrderId: string;
      payablePaise: number;
      keyId: string | null;
    }
  | { ok: false; code: QuoteFailure | "NOT_ORDERABLE" }
> {
  const quoted = await buildQuote(input);
  if (!quoted.ok) return quoted;
  if (!quoted.quote.orderable) return { ok: false, code: "NOT_ORDERABLE" };
  const quote = quoted.quote;
  const provider = activeProvider();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  const created = await db.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        messId: quote.messId,
        customerId: input.customerId,
        slotId: quote.slotId,
        serviceDate: toDbDate(quote.serviceDate),
        fulfillment: quote.fulfillment,
        status: "PENDING_PAYMENT",
        itemTotalPaise: quote.itemTotalPaise,
        deliveryFeePaise: quote.deliveryFeePaise,
        discountPaise: 0,
        taxPaise: 0,
        payablePaise: quote.payablePaise,
        addressId: input.fulfillment === "DELIVERY" ? input.addressId : null,
        expiresAt,
        items: {
          create: quote.lines.map((l) => ({
            itemId: l.itemId,
            name: l.name,
            pricePaise: l.pricePaise,
            qty: l.qty
          }))
        }
      }
    });
    const { providerOrderId } = await providerCreateOrder(provider, order.id, quote.payablePaise);
    await tx.payment.create({
      data: {
        orderId: order.id,
        provider,
        providerOrderId,
        amountPaise: quote.payablePaise,
        currency: "INR",
        status: "CREATED"
      }
    });
    return { order, providerOrderId };
  });
  return {
    ok: true,
    orderId: created.order.id,
    provider,
    providerOrderId: created.providerOrderId,
    payablePaise: quote.payablePaise,
    keyId: provider === "RAZORPAY" ? publicKeyId() : null
  };
}

/** Idempotency guard: true when this event was already processed. */
export async function claimWebhookEvent(provider: ProviderName, eventId: string): Promise<boolean> {
  try {
    await db.processedWebhook.create({ data: { provider, eventId } });
    return false;
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return true;
    throw error;
  }
}

export interface SuccessWebhook {
  provider: ProviderName;
  eventId: string;
  providerOrderId: string;
  providerPaymentId: string | null;
  amountPaise: number;
}

export async function handlePaymentSuccess(
  input: SuccessWebhook
): Promise<
  | { outcome: "CONFIRMED"; orderId?: string; subscriptionId?: string }
  | { outcome: "SOLD_OUT"; orderId: string }
  | { outcome: "DUPLICATE" }
  | { outcome: "UNKNOWN_ORDER" }
  | { outcome: "ALREADY_SETTLED"; orderId?: string; subscriptionId?: string }
> {
  if (await claimWebhookEvent(input.provider, input.eventId)) return { outcome: "DUPLICATE" };
  const payment = await db.payment.findUnique({
    where: { providerOrderId: input.providerOrderId },
    include: { order: { include: { items: true } } }
  });
  if (!payment) return { outcome: "UNKNOWN_ORDER" };
  if (payment.subscriptionId) {
    return handleSubscriptionPaymentSuccess(payment.id, payment.subscriptionId, payment, input);
  }
  const order = payment.order;
  if (!order) return { outcome: "UNKNOWN_ORDER" };
  if (payment.status !== "CREATED" && payment.status !== "AUTHORIZED") {
    return { outcome: "ALREADY_SETTLED", orderId: order.id };
  }
  if (order.status !== "PENDING_PAYMENT") {
    return { outcome: "ALREADY_SETTLED", orderId: order.id };
  }
  if (input.amountPaise !== payment.amountPaise) {
    await db.$transaction(async (tx) => {
      await tx.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
      await tx.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED", cancelReason: "PAYMENT_MISMATCH", cancelledAt: new Date() }
      });
    });
    return { outcome: "ALREADY_SETTLED", orderId: order.id };
  }
  const totalQty = order.items.reduce((n, i) => n + i.qty, 0);
  const dateStr = order.serviceDate.toISOString().slice(0, 10);
  const reservation = await tryReserve(order.messId, order.slotId, dateStr, totalQty);
  if (!reservation.ok) {
    // Kitchen filled up while paying: money back, no silent loss (BR-03).
    const refund = await providerRefund(
      input.provider,
      input.providerPaymentId,
      payment.amountPaise
    );
    await db.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: "REFUNDED", providerPaymentId: input.providerPaymentId }
      });
      await tx.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED", cancelReason: "SOLD_OUT", cancelledAt: new Date() }
      });
      await tx.refund.create({
        data: {
          paymentId: payment.id,
          amountPaise: payment.amountPaise,
          reason: "SOLD_OUT",
          status: refund.completed ? "COMPLETED" : "INITIATED",
          providerRefundId: refund.providerRefundId,
          actorId: "system"
        }
      });
    });
    return { outcome: "SOLD_OUT", orderId: order.id };
  }
  await db.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "CAPTURED",
        providerPaymentId: input.providerPaymentId,
        attempts: { increment: 1 }
      }
    });
    await tx.order.update({
      where: { id: order.id },
      data: { status: "CONFIRMED", confirmedAt: new Date() }
    });
  });
  // Every confirmed order gets a traceable fulfillment path (Phase 8).
  await ensureFulfillment(order.id);
  return { outcome: "CONFIRMED", orderId: order.id };
}

async function handleSubscriptionPaymentSuccess(
  paymentId: string,
  subscriptionId: string,
  payment: { status: string; amountPaise: number },
  input: SuccessWebhook
): Promise<
  | { outcome: "CONFIRMED"; subscriptionId: string }
  | { outcome: "DUPLICATE" }
  | { outcome: "ALREADY_SETTLED"; subscriptionId: string }
> {
  if (payment.status !== "CREATED" && payment.status !== "AUTHORIZED") {
    return { outcome: "ALREADY_SETTLED", subscriptionId };
  }
  if (input.amountPaise !== payment.amountPaise) {
    await db.payment.update({ where: { id: paymentId }, data: { status: "FAILED" } });
    await db.subscription.update({
      where: { id: subscriptionId },
      data: { status: "CANCELLED", cancelReason: "PAYMENT_MISMATCH", cancelledAt: new Date() }
    });
    return { outcome: "ALREADY_SETTLED", subscriptionId };
  }
  await db.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: paymentId },
      data: { status: "CAPTURED", providerPaymentId: input.providerPaymentId }
    });
    await tx.subscription.update({ where: { id: subscriptionId }, data: { status: "ACTIVE" } });
  });
  return { outcome: "CONFIRMED", subscriptionId };
}

export async function handlePaymentFailure(input: {
  provider: ProviderName;
  eventId: string;
  providerOrderId: string;
}): Promise<{
  outcome: "FAILED" | "DUPLICATE" | "UNKNOWN_ORDER" | "ALREADY_SETTLED";
  orderId?: string;
  subscriptionId?: string;
}> {
  if (await claimWebhookEvent(input.provider, input.eventId)) return { outcome: "DUPLICATE" };
  const payment = await db.payment.findUnique({
    where: { providerOrderId: input.providerOrderId },
    include: { order: true }
  });
  if (!payment) return { outcome: "UNKNOWN_ORDER" };
  if (payment.status !== "CREATED" && payment.status !== "AUTHORIZED") {
    return {
      outcome: "ALREADY_SETTLED",
      ...(payment.orderId ? { orderId: payment.orderId } : {}),
      ...(payment.subscriptionId ? { subscriptionId: payment.subscriptionId } : {})
    };
  }
  await db.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
  return {
    outcome: "FAILED",
    ...(payment.orderId ? { orderId: payment.orderId } : {}),
    ...(payment.subscriptionId ? { subscriptionId: payment.subscriptionId } : {})
  };
}

export async function cancelOrder(
  orderId: string,
  actor: { id: string; kind: "CUSTOMER" | "OWNER" | "STAFF"; reason?: string }
): Promise<{ ok: true; refunded: boolean } | { ok: false; code: string }> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true, payments: { orderBy: { createdAt: "desc" } } }
  });
  if (!order) return { ok: false, code: "NOT_FOUND" };
  // Ownership before status: strangers learn nothing about foreign orders.
  if (actor.kind === "CUSTOMER" && order.customerId !== actor.id) {
    return { ok: false, code: "NOT_FOUND" };
  }
  if (order.status !== "PENDING_PAYMENT" && order.status !== "CONFIRMED") {
    return { ok: false, code: "NOT_CANCELLABLE" };
  }
  const payment = order.payments[0] ?? null;
  if (actor.kind === "CUSTOMER") {
    if (order.status === "CONFIRMED") {
      const slot = await db.menuSlot.findUnique({ where: { id: order.slotId } });
      const dateStr = order.serviceDate.toISOString().slice(0, 10);
      if (!slot || !cancellableByCustomer(order.status, dateStr, slot.cutoffTime)) {
        return { ok: false, code: "NOT_CANCELLABLE" };
      }
    }
  } else {
    if (!actor.reason?.trim()) return { ok: false, code: "REASON_REQUIRED" };
  }
  const totalQty = order.items.reduce((n, i) => n + i.qty, 0);
  const dateStr = order.serviceDate.toISOString().slice(0, 10);
  let refunded = false;
  if (order.status === "CONFIRMED") {
    await releaseReservation(order.messId, order.slotId, dateStr, totalQty);
    if (payment && payment.status === "CAPTURED") {
      const refund = await providerRefund(
        payment.provider as ProviderName,
        payment.providerPaymentId,
        payment.amountPaise
      );
      await db.$transaction(async (tx) => {
        await tx.payment.update({ where: { id: payment.id }, data: { status: "REFUNDED" } });
        await tx.refund.create({
          data: {
            paymentId: payment.id,
            amountPaise: payment.amountPaise,
            reason:
              actor.kind === "CUSTOMER" ? "CUSTOMER_CANCEL" : (actor.reason ?? "OWNER_CANCEL"),
            status: refund.completed ? "COMPLETED" : "INITIATED",
            providerRefundId: refund.providerRefundId,
            actorId: actor.id
          }
        });
      });
      refunded = true;
    } else if (payment) {
      await db.payment.update({ where: { id: payment.id }, data: { status: "CANCELLED" } });
    }
  } else if (payment && (payment.status === "CREATED" || payment.status === "FAILED")) {
    await db.payment.update({ where: { id: payment.id }, data: { status: "CANCELLED" } });
  }
  await db.order.update({
    where: { id: orderId },
    data: {
      status: "CANCELLED",
      cancelReason:
        actor.kind === "CUSTOMER" ? "CUSTOMER_CANCEL" : (actor.reason ?? "OWNER_CANCEL"),
      cancelledAt: new Date()
    }
  });
  return { ok: true, refunded };
}

/** Sweep stale unpaid orders. Called opportunistically; a scheduler owns it in production. */
export async function expirePendingOrders(now = new Date()): Promise<number> {
  const stale = await db.order.findMany({
    where: { status: "PENDING_PAYMENT", expiresAt: { lt: now } },
    select: { id: true }
  });
  for (const row of stale) {
    await db.$transaction(async (tx) => {
      await tx.payment.updateMany({
        where: { orderId: row.id, status: { in: ["CREATED", "FAILED"] } },
        data: { status: "CANCELLED" }
      });
      await tx.order.update({
        where: { id: row.id },
        data: { status: "CANCELLED", cancelReason: "PAYMENT_EXPIRED", cancelledAt: now }
      });
    });
  }
  return stale.length;
}
