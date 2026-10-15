import { db } from "@/lib/db";
import { addDays, compareDates, toDbDate, todayInTz } from "@/lib/ist";
import { timeInTz } from "@/lib/ist";
import { isBeforeCutoff } from "@/lib/menu-rules";
import { getMenuForDate } from "@/lib/menus";
import {
  canSkip,
  effectiveStatus,
  isPausedOn,
  pauseExtensionDays,
  pauseStartFor,
  remainingMeals,
  renewalStart,
  servicedDates,
  upcomingMeals,
  usedCount,
  type EffectiveSubStatus,
  type EntitlementState
} from "@/lib/subscription-rules";
import { activeProvider } from "@/lib/payments";

export type { EffectiveSubStatus };

const TZ = "Asia/Kolkata";

type FullSub = Awaited<ReturnType<typeof loadSub>>;

async function loadSub(subscriptionId: string) {
  return db.subscription.findUnique({
    where: { id: subscriptionId },
    include: {
      mess: true,
      plan: { include: { slot: true } },
      skips: true,
      pauses: true,
      adjustments: { orderBy: { createdAt: "desc" } }
    }
  });
}

async function holidaySet(messId: string): Promise<Set<string>> {
  const rows = await db.holiday.findMany({ where: { messId }, select: { date: true } });
  return new Set(rows.map((r) => r.date.toISOString().slice(0, 10)));
}

export async function entitlementOf(sub: NonNullable<FullSub>): Promise<{
  state: EntitlementState;
  cutoffTime: string;
  today: string;
  beforeCutoff: boolean;
}> {
  const today = todayInTz(TZ);
  const slot = await db.menuSlot.findUnique({ where: { id: sub.slotId } });
  const cutoffTime = slot?.cutoffTime ?? "23:59";
  return {
    state: {
      startDate: sub.startDate.toISOString().slice(0, 10),
      endDate: sub.endDate.toISOString().slice(0, 10),
      mealsTotal: sub.mealsTotal,
      operatingDays: sub.mess.operatingDays,
      holidays: await holidaySet(sub.messId),
      skips: new Set(sub.skips.map((s) => s.serviceDate.toISOString().slice(0, 10))),
      pauses: sub.pauses.map((p) => ({
        start: p.startDate.toISOString().slice(0, 10),
        end: p.endDate ? p.endDate.toISOString().slice(0, 10) : null
      }))
    },
    cutoffTime,
    today,
    beforeCutoff: isBeforeCutoff(timeInTz(TZ), cutoffTime)
  };
}

export interface SubscriptionView {
  id: string;
  messId: string;
  messName: string;
  planName: string;
  slotId: string;
  slotName: string;
  status: EffectiveSubStatus;
  storedStatus: string;
  startDate: string;
  endDate: string;
  mealsTotal: number;
  used: number;
  remaining: number;
  upcoming: string[];
  cutoffTime: string;
  pricePaise: number;
  expiringSoon: boolean;
  skips: Array<{ date: string; reason: string | null }>;
  pauses: Array<{ start: string; end: string | null; extensionDays: number }>;
  adjustments: Array<{
    kind: string;
    reason: string;
    days: number | null;
    meals: number | null;
    at: string;
  }>;
}

export async function subscriptionView(subscriptionId: string): Promise<SubscriptionView | null> {
  const sub = await loadSub(subscriptionId);
  if (!sub) return null;
  const { state, cutoffTime, today, beforeCutoff } = await entitlementOf(sub);
  const used = usedCount(state, today, !beforeCutoff);
  const computedRemaining = remainingMeals(state, today, !beforeCutoff);
  const status = effectiveStatus(
    sub.status as "PENDING_PAYMENT" | "ACTIVE" | "CANCELLED",
    state,
    today,
    !beforeCutoff
  );
  // Only live subscriptions project meals; cancelled ones forfeit the balance.
  const live = status === "ACTIVE" || status === "PAUSED";
  const upcoming = live ? upcomingMeals(state, today, !beforeCutoff, 30) : [];
  const remaining = status === "CANCELLED" ? 0 : computedRemaining;
  const expiringSoon =
    (status === "ACTIVE" || status === "PAUSED") &&
    (compareDates(state.endDate, addDays(today, 3)) <= 0 || remaining <= 3);
  return {
    id: sub.id,
    messId: sub.messId,
    messName: sub.mess.name,
    planName: sub.planName,
    slotId: sub.slotId,
    slotName: sub.plan.slot.name,
    status,
    storedStatus: sub.status,
    startDate: state.startDate,
    endDate: state.endDate,
    mealsTotal: sub.mealsTotal,
    used,
    remaining,
    upcoming,
    cutoffTime,
    pricePaise: sub.pricePaise,
    expiringSoon,
    skips: sub.skips.map((s) => ({
      date: s.serviceDate.toISOString().slice(0, 10),
      reason: s.reason
    })),
    pauses: sub.pauses.map((p) => ({
      start: p.startDate.toISOString().slice(0, 10),
      end: p.endDate ? p.endDate.toISOString().slice(0, 10) : null,
      extensionDays: p.extensionDays
    })),
    adjustments: sub.adjustments.map((a) => ({
      kind: a.kind,
      reason: a.reason,
      days: a.daysDelta,
      meals: a.mealsDelta,
      at: a.createdAt.toISOString()
    }))
  };
}

export async function previewSubscription(customerId: string, planId: string) {
  const plan = await db.subscriptionPlan.findUnique({
    where: { id: planId },
    include: { mess: true, slot: true }
  });
  if (!plan || !plan.active) return { ok: false as const, code: "PLAN_UNAVAILABLE" };
  const mess = plan.mess;
  if (mess.verificationStatus !== "APPROVED" || !mess.published) {
    return { ok: false as const, code: "MESS_UNAVAILABLE" };
  }
  if (!plan.slot.active) return { ok: false as const, code: "PLAN_UNAVAILABLE" };
  const today = todayInTz(TZ);
  void customerId;
  return {
    ok: true as const,
    quote: {
      planId: plan.id,
      planName: plan.name,
      messId: plan.messId,
      messName: mess.name,
      slotName: plan.slot.name,
      cutoffTime: plan.slot.cutoffTime,
      mealsTotal: plan.mealsTotal,
      validityDays: plan.validityDays,
      pricePaise: plan.pricePaise,
      startDate: today,
      endDate: addDays(today, plan.validityDays - 1),
      policy: [
        `Skip any day before the ${plan.slot.cutoffTime} IST cutoff — skipped meals stay usable until ${addDays(today, plan.validityDays - 1)}.`,
        "Pause takes effect tomorrow and extends validity by paused service days.",
        "Cancelling forfeits remaining meals with no cash refund."
      ]
    }
  };
}

async function providerCreateOrder(
  provider: "RAZORPAY" | "MOCK",
  receipt: string,
  amountPaise: number
) {
  if (provider === "MOCK") {
    const { randomUUID } = await import("node:crypto");
    return { providerOrderId: `mock_${randomUUID().replace(/-/g, "")}` };
  }
  const Razorpay = (await import("razorpay")).default;
  const client = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID ?? "",
    key_secret: process.env.RAZORPAY_KEY_SECRET ?? ""
  });
  const created = (await client.orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt
  })) as unknown as {
    id: string;
  };
  return { providerOrderId: created.id };
}

export async function purchaseSubscription(
  customerId: string,
  planId: string,
  startDateOverride?: string
) {
  const preview = await previewSubscription(customerId, planId);
  if (!preview.ok) return preview;
  const q = preview.quote;
  const startDate = startDateOverride ?? q.startDate;
  if (compareDates(startDate, q.startDate) < 0) return { ok: false as const, code: "BAD_START" };
  const provider = activeProvider();
  const created = await db.$transaction(async (tx) => {
    const sub = await tx.subscription.create({
      data: {
        messId: q.messId,
        customerId,
        planId: q.planId,
        slotId: (await tx.subscriptionPlan.findUniqueOrThrow({ where: { id: planId } })).slotId,
        planName: q.planName,
        mealsTotal: q.mealsTotal,
        validityDays: q.validityDays,
        pricePaise: q.pricePaise,
        status: "PENDING_PAYMENT",
        startDate: toDbDate(startDate),
        endDate: toDbDate(addDays(startDate, q.validityDays - 1))
      }
    });
    const { providerOrderId } = await providerCreateOrder(provider, sub.id, q.pricePaise);
    const payment = await tx.payment.create({
      data: {
        subscriptionId: sub.id,
        provider,
        providerOrderId,
        amountPaise: q.pricePaise,
        currency: "INR",
        status: "CREATED"
      }
    });
    return { sub, payment };
  });
  return {
    ok: true as const,
    subscriptionId: created.sub.id,
    provider,
    providerOrderId: created.payment.providerOrderId,
    payablePaise: q.pricePaise,
    keyId: provider === "RAZORPAY" ? (process.env.RAZORPAY_KEY_ID ?? null) : null
  };
}

export async function activateSubscription(paymentId: string): Promise<boolean> {
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment?.subscriptionId) return false;
  await db.subscription.update({
    where: { id: payment.subscriptionId },
    data: { status: "ACTIVE" }
  });
  return true;
}

export async function skipMeals(
  subscriptionId: string,
  customerId: string,
  dates: string[],
  reason?: string
): Promise<{ ok: true; skipped: string[] } | { ok: false; code: string; date?: string }> {
  const sub = await loadSub(subscriptionId);
  if (!sub || sub.customerId !== customerId) return { ok: false, code: "NOT_FOUND" };
  if (sub.status !== "ACTIVE") return { ok: false, code: "NOT_ACTIVE" };
  const { state, today, beforeCutoff } = await entitlementOf(sub);
  const unique = [...new Set(dates)].sort();
  for (const date of unique) {
    // Serviced check uses this slot's own cutoff via beforeCutoff (BR-02),
    // and requires a real menu that date — skipping a closed kitchen is meaningless.
    const serviced =
      servicedDates(state, date, date).length === 1 &&
      (await getMenuForDate(sub.messId, date, sub.slotId))?.status === "open";
    const verdict = canSkip({
      date,
      today,
      beforeCutoff,
      serviced,
      alreadySkipped: state.skips.has(date)
    });
    if (!verdict.ok) return { ok: false, code: verdict.code, date };
  }
  const created = await db.$transaction(
    unique.map((date) =>
      db.subscriptionSkip.create({
        data: { subscriptionId, serviceDate: toDbDate(date), reason: reason?.trim() || null }
      })
    )
  );
  return { ok: true, skipped: created.map((s) => s.serviceDate.toISOString().slice(0, 10)) };
}

export async function pauseSubscription(
  subscriptionId: string,
  customerId: string
): Promise<{ ok: true; pauseStart: string } | { ok: false; code: string }> {
  const sub = await loadSub(subscriptionId);
  if (!sub || sub.customerId !== customerId) return { ok: false, code: "NOT_FOUND" };
  if (sub.status !== "ACTIVE") return { ok: false, code: "NOT_ACTIVE" };
  const today = todayInTz(TZ);
  const { state } = await entitlementOf(sub);
  if (compareDates(state.endDate, today) <= 0) return { ok: false, code: "ENDING" };
  if (sub.pauses.some((p) => p.endDate == null)) return { ok: false, code: "ALREADY_PAUSED" };
  const start = pauseStartFor(today);
  await db.subscriptionPause.create({ data: { subscriptionId, startDate: toDbDate(start) } });
  return { ok: true, pauseStart: start };
}

export async function resumeSubscription(
  subscriptionId: string,
  customerId: string
): Promise<{ ok: true; extensionDays: number; endDate: string } | { ok: false; code: string }> {
  const sub = await loadSub(subscriptionId);
  if (!sub || sub.customerId !== customerId) return { ok: false, code: "NOT_FOUND" };
  if (sub.status !== "ACTIVE") return { ok: false, code: "NOT_ACTIVE" };
  const open = sub.pauses.find((p) => p.endDate == null);
  if (!open) return { ok: false, code: "NOT_PAUSED" };
  const today = todayInTz(TZ);
  const { state } = await entitlementOf(sub);
  const pauseStart = open.startDate.toISOString().slice(0, 10);
  if (compareDates(pauseStart, today) > 0) {
    // Paused for the future only — remove without touching validity.
    await db.subscriptionPause.delete({ where: { id: open.id } });
    return { ok: true, extensionDays: 0, endDate: state.endDate };
  }
  const extension = pauseExtensionDays(
    {
      startDate: state.startDate,
      endDate: state.endDate,
      mealsTotal: state.mealsTotal,
      operatingDays: state.operatingDays,
      holidays: state.holidays,
      skips: state.skips
    },
    pauseStart,
    today,
    state.skips
  );
  const newEnd = addDays(state.endDate, extension);
  await db.$transaction(async (tx) => {
    await tx.subscriptionPause.update({
      where: { id: open.id },
      data: { endDate: toDbDate(today), extensionDays: extension, resumedAt: new Date() }
    });
    await tx.subscription.update({
      where: { id: subscriptionId },
      data: { endDate: toDbDate(newEnd) }
    });
  });
  return { ok: true, extensionDays: extension, endDate: newEnd };
}

export async function cancelSubscription(
  subscriptionId: string,
  customerId: string
): Promise<{ ok: true } | { ok: false; code: string }> {
  const sub = await db.subscription.findUnique({ where: { id: subscriptionId } });
  if (!sub || sub.customerId !== customerId) return { ok: false, code: "NOT_FOUND" };
  if (sub.status !== "ACTIVE") return { ok: false, code: "NOT_CANCELLABLE" };
  await db.$transaction(async (tx) => {
    await tx.subscriptionPause.updateMany({
      where: { subscriptionId, endDate: null },
      data: { endDate: toDbDate(todayInTz(TZ)), resumedAt: new Date() }
    });
    await tx.subscription.update({
      where: { id: subscriptionId },
      data: { status: "CANCELLED", cancelReason: "CUSTOMER_CANCEL", cancelledAt: new Date() }
    });
  });
  return { ok: true };
}

export async function renewSubscription(subscriptionId: string, customerId: string) {
  const sub = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true }
  });
  if (!sub || sub.customerId !== customerId) return { ok: false as const, code: "NOT_FOUND" };
  if (!sub.plan.active) return { ok: false as const, code: "PLAN_UNAVAILABLE" };
  const today = todayInTz(TZ);
  const start = renewalStart(sub.endDate.toISOString().slice(0, 10), today);
  return purchaseSubscription(customerId, sub.planId, start);
}

export async function adjustSubscription(
  subscriptionId: string,
  actorId: string,
  input: { kind: "EXTEND_VALIDITY" | "ADD_MEALS"; days?: number; meals?: number; reason: string }
) {
  const sub = await db.subscription.findUnique({ where: { id: subscriptionId } });
  if (!sub) return { ok: false as const, code: "NOT_FOUND" };
  if (sub.status === "CANCELLED") return { ok: false as const, code: "NOT_ADJUSTABLE" };
  if (input.kind === "EXTEND_VALIDITY") {
    if (!input.days || input.days < 1 || input.days > 90)
      return { ok: false as const, code: "INVALID" };
    const end = sub.endDate.toISOString().slice(0, 10);
    const updated = await db.$transaction(async (tx) => {
      const next = await tx.subscription.update({
        where: { id: subscriptionId },
        data: { endDate: toDbDate(addDays(end, input.days as number)) }
      });
      await tx.subscriptionAdjustment.create({
        data: {
          subscriptionId,
          actorId,
          kind: "EXTEND_VALIDITY",
          daysDelta: input.days,
          reason: input.reason
        }
      });
      return next;
    });
    return { ok: true as const, endDate: updated.endDate.toISOString().slice(0, 10) };
  }
  if (!input.meals || input.meals < 1 || input.meals > 100)
    return { ok: false as const, code: "INVALID" };
  const updated = await db.$transaction(async (tx) => {
    const next = await tx.subscription.update({
      where: { id: subscriptionId },
      data: { mealsTotal: { increment: input.meals } }
    });
    await tx.subscriptionAdjustment.create({
      data: {
        subscriptionId,
        actorId,
        kind: "ADD_MEALS",
        mealsDelta: input.meals,
        reason: input.reason
      }
    });
    return next;
  });
  return { ok: true as const, mealsTotal: updated.mealsTotal };
}

/** Upcoming subscriber demand per slot for a date range (owner planning + Phase 7 input).
 * Uses the same serviced-set + balance gate as customer display (BR-18), and the
 * same cutoff rule: a slot past cutoff serves nothing more today. */
export async function subscriberCounts(
  messId: string,
  from: string,
  to: string,
  now = new Date()
): Promise<Array<{ date: string; slotId: string; count: number }>> {
  const mess = await db.mess.findUnique({ where: { id: messId } });
  if (!mess) return [];
  const today = todayInTz(TZ, now);
  const slots = await db.menuSlot.findMany({ where: { messId } });
  const cutoffBySlot = new Map(slots.map((s) => [s.id, s.cutoffTime] as const));
  const pastCutoff = (slotId: string) =>
    !isBeforeCutoff(timeInTz(TZ, now), cutoffBySlot.get(slotId) ?? "23:59");
  const subs = await db.subscription.findMany({
    where: { messId, status: "ACTIVE" },
    include: { skips: true, pauses: true }
  });
  const holidays = await holidaySet(messId);
  const counts = new Map<string, number>();
  for (const sub of subs) {
    const state: import("@/lib/subscription-rules").EntitlementState = {
      startDate: sub.startDate.toISOString().slice(0, 10),
      endDate: sub.endDate.toISOString().slice(0, 10),
      mealsTotal: sub.mealsTotal,
      operatingDays: mess.operatingDays,
      holidays,
      skips: new Set(sub.skips.map((s) => s.serviceDate.toISOString().slice(0, 10))),
      pauses: sub.pauses.map((p) => ({
        start: p.startDate.toISOString().slice(0, 10),
        end: p.endDate ? p.endDate.toISOString().slice(0, 10) : null
      }))
    };
    const days = servicedDates(state, from, to);
    for (const date of days) {
      if (date === today && pastCutoff(sub.slotId)) continue;
      // Balance gate: only count while the subscriber still has meals (BR-18 consistency).
      const used = servicedDates(state, state.startDate, addDays(date, -1)).length;
      if (used >= sub.mealsTotal) continue;
      const key = `${date}|${sub.slotId}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([key, count]) => {
      const [date, slotId] = key.split("|");
      return { date, slotId, count };
    })
    .sort((a, b) =>
      a.date === b.date ? (a.slotId < b.slotId ? -1 : 1) : a.date < b.date ? -1 : 1
    );
}

export { isPausedOn };

/** Record visibility: customer owns it, owner holds the mess, staff assigned, admin all. */
export async function subscriptionAccess(
  subscriptionId: string,
  userId: string,
  role: string
): Promise<boolean> {
  const sub = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: { mess: { select: { ownerId: true } } }
  });
  if (!sub) return false;
  if (sub.customerId === userId) return true;
  if (role === "PLATFORM_ADMIN") return true;
  if (role === "MESS_OWNER" && sub.mess.ownerId === userId) return true;
  if (role === "MESS_STAFF") {
    const assignment = await db.messStaff.findUnique({
      where: { messId_userId: { messId: sub.messId, userId } }
    });
    return Boolean(assignment);
  }
  return false;
}
