import { db } from "@/lib/db";
import {
  allowedAdvance,
  isFailureReason,
  isTerminal,
  type AssigneeType,
  type FulfillmentStatus
} from "@/lib/fulfillment-rules";

export type { FulfillmentStatus, AssigneeType };

interface Actor {
  id: string;
  role: string;
}

/** Owner of the mess, staff assigned to it, or platform admin (read-only in practice). */
export async function fulfillmentScope(
  messId: string,
  userId: string,
  role: string
): Promise<"OWNER" | "STAFF" | "ADMIN" | null> {
  if (role === "PLATFORM_ADMIN") return "ADMIN";
  const mess = await db.mess.findUnique({ where: { id: messId } });
  if (!mess) return null;
  if (role === "MESS_OWNER" && mess.ownerId === userId) return "OWNER";
  if (role === "MESS_STAFF") {
    const assignment = await db.messStaff.findUnique({
      where: { messId_userId: { messId, userId } }
    });
    if (assignment) return "STAFF";
  }
  return null;
}

export async function ensureFulfillment(orderId: string): Promise<string> {
  const existing = await db.fulfillment.findUnique({ where: { orderId } });
  if (existing) return existing.id;
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  const created = await db.fulfillment.create({
    data: { orderId, messId: order.messId, method: order.fulfillment, status: "PENDING" }
  });
  await db.fulfillmentAttempt.create({
    data: { fulfillmentId: created.id, actorId: "system", action: "CREATED" }
  });
  return created.id;
}

async function resolveAssignee(
  messId: string,
  ownerId: string,
  type: AssigneeType,
  email?: string
): Promise<{ type: AssigneeType; userId: string } | { error: string }> {
  if (type === "SELF") return { type, userId: ownerId };
  if (!email) return { error: "ASSIGNEE_REQUIRED" };
  const user = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) return { error: "ASSIGNEE_UNKNOWN" };
  if (!user.emailVerified || user.status !== "ACTIVE" || user.banned) {
    return { error: "ASSIGNEE_INACTIVE" };
  }
  if (type === "STAFF") {
    if (user.role !== "MESS_STAFF") return { error: "NOT_STAFF" };
    const assignment = await db.messStaff.findUnique({
      where: { messId_userId: { messId, userId: user.id } }
    });
    if (!assignment) return { error: "STAFF_NOT_ASSIGNED" };
  } else {
    if (user.role !== "DELIVERY_AGENT") return { error: "NOT_AGENT" };
  }
  return { type, userId: user.id };
}

export async function advanceFulfillment(input: {
  fulfillmentId: string;
  actor: Actor;
  to: FulfillmentStatus;
  assigneeType?: AssigneeType;
  assigneeEmail?: string;
}): Promise<{ ok: true; status: FulfillmentStatus } | { ok: false; code: string }> {
  const record = await db.fulfillment.findUnique({
    where: { id: input.fulfillmentId },
    include: { order: true }
  });
  if (!record) return { ok: false, code: "NOT_FOUND" };
  if (record.order.status !== "CONFIRMED") return { ok: false, code: "ORDER_NOT_ACTIVE" };
  const method = record.method as "PICKUP" | "DELIVERY";
  if (!allowedAdvance(record.status as FulfillmentStatus, input.to, method)) {
    return { ok: false, code: "BAD_TRANSITION" };
  }
  const scope = await fulfillmentScope(record.messId, input.actor.id, input.actor.role);
  const isAssignee = record.assigneeId === input.actor.id;
  const managing = scope === "OWNER" || scope === "STAFF";
  const needsAssignment = input.to === "ASSIGNED";
  // Who may do what: management moves anything; assignees only progress their own run.
  if (needsAssignment || input.to === "READY" || input.to === "PICKED_UP") {
    if (!managing) return { ok: false, code: "FORBIDDEN" };
  } else if (!managing && !isAssignee) {
    return { ok: false, code: "FORBIDDEN" };
  }

  let assigneeType = record.assigneeType;
  let assigneeId = record.assigneeId;
  let assignedAt = undefined;
  if (needsAssignment) {
    const mess = await db.mess.findUniqueOrThrow({ where: { id: record.messId } });
    const resolved = await resolveAssignee(
      record.messId,
      mess.ownerId,
      input.assigneeType ?? "SELF",
      input.assigneeEmail
    );
    if ("error" in resolved) return { ok: false, code: resolved.error };
    assigneeType = resolved.type;
    assigneeId = resolved.userId;
    assignedAt = new Date();
  }

  const now = new Date();
  const terminal = input.to === "PICKED_UP" || input.to === "DELIVERED";
  const updated = await db.$transaction(async (tx) => {
    const next = await tx.fulfillment.update({
      where: { id: record.id },
      data: {
        status: input.to,
        ...(assigneeType ? { assigneeType } : {}),
        ...(assigneeId ? { assigneeId } : {}),
        ...(input.to === "READY" ? { readyAt: now } : {}),
        ...(assignedAt ? { assignedAt } : {}),
        ...(input.to === "DISPATCHED" ? { dispatchedAt: now } : {}),
        ...(terminal ? { completedAt: now } : {})
      }
    });
    await tx.fulfillmentAttempt.create({
      data: {
        fulfillmentId: record.id,
        actorId: input.actor.id,
        action: input.to === "ASSIGNED" && record.status !== "READY" ? "REASSIGNED" : input.to
      }
    });
    if (terminal) {
      // Reconciliation: handover completes the order. Payments and capacity untouched (BR-09).
      await tx.order.update({ where: { id: record.orderId }, data: { status: "COMPLETED" } });
    }
    return next;
  });
  return { ok: true, status: updated.status as FulfillmentStatus };
}

export async function recordFailedAttempt(input: {
  fulfillmentId: string;
  actor: Actor;
  reason: string;
  note?: string;
}): Promise<{ ok: true; attempts: number } | { ok: false; code: string }> {
  const record = await db.fulfillment.findUnique({
    where: { id: input.fulfillmentId },
    include: { order: true }
  });
  if (!record) return { ok: false, code: "NOT_FOUND" };
  if (record.order.status !== "CONFIRMED") return { ok: false, code: "ORDER_NOT_ACTIVE" };
  if (record.method !== "DELIVERY") return { ok: false, code: "PICKUP_HAS_NO_ATTEMPTS" };
  if (record.status !== "ASSIGNED" && record.status !== "DISPATCHED") {
    return { ok: false, code: "NOT_IN_TRANSIT" };
  }
  if (!isFailureReason(input.reason)) return { ok: false, code: "BAD_REASON" };
  if (input.reason === "OTHER" && !input.note?.trim()) return { ok: false, code: "NOTE_REQUIRED" };
  const scope = await fulfillmentScope(record.messId, input.actor.id, input.actor.role);
  const managing = scope === "OWNER" || scope === "STAFF";
  if (!managing && record.assigneeId !== input.actor.id) return { ok: false, code: "FORBIDDEN" };
  const created = await db.fulfillmentAttempt.create({
    data: {
      fulfillmentId: record.id,
      actorId: input.actor.id,
      action: "FAILED_ATTEMPT",
      reason: input.note?.trim() ? `${input.reason}: ${input.note.trim()}` : input.reason
    }
  });
  void created;
  const attempts = await db.fulfillmentAttempt.count({
    where: { fulfillmentId: record.id, action: "FAILED_ATTEMPT" }
  });
  return { ok: true, attempts };
}

export async function myTasks(userId: string) {
  return db.fulfillment.findMany({
    where: {
      assigneeId: userId,
      status: { in: ["ASSIGNED", "DISPATCHED"] }
    },
    include: {
      order: {
        include: {
          customer: { select: { name: true, phone: true } },
          items: true,
          address: true
        }
      },
      mess: { select: { name: true, phone: true } }
    },
    orderBy: { updatedAt: "desc" }
  });
}

export async function taskHistory(userId: string) {
  return db.fulfillment.findMany({
    where: { assigneeId: userId, status: { in: ["PICKED_UP", "DELIVERED"] } },
    include: {
      order: { include: { customer: { select: { name: true } }, items: true } },
      mess: { select: { name: true } }
    },
    orderBy: { completedAt: "desc" },
    take: 100
  });
}

export { isTerminal };
