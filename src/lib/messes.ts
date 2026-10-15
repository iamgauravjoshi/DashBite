import { customAlphabet } from "nanoid";
import { db } from "@/lib/db";
import {
  canTransition,
  isDiscoverable,
  requiresReason,
  slugify,
  type FulfillmentFilter,
  type MessRow,
  type MessStatus,
  type VegType
} from "@/lib/mess-rules";

export type { FulfillmentFilter, MessRow, MessStatus, VegType };

const suffix = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6);

export async function uniqueSlug(name: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = `${slugify(name)}-${suffix()}`;
    const existing = await db.mess.findUnique({ where: { slug }, select: { id: true } });
    if (!existing) return slug;
  }
  throw new Error("Could not mint a unique mess slug");
}

export interface DiscoverFilters {
  city: string;
  q?: string;
  locality?: string;
  veg?: VegType;
  fulfillment?: FulfillmentFilter;
}

export async function listDiscoverable(filters: DiscoverFilters) {
  const { city, q, locality, veg, fulfillment } = filters;
  const query = q?.trim();
  return db.mess.findMany({
    where: {
      city,
      published: true,
      verificationStatus: "APPROVED",
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
              { locality: { contains: query, mode: "insensitive" } }
            ]
          }
        : {}),
      ...(locality ? { OR: [{ locality }, { serviceAreas: { has: locality } }] } : {}),
      ...(veg && veg !== "BOTH" ? { vegType: { in: [veg, "BOTH"] } } : {}),
      ...(fulfillment === "pickup" ? { pickupAllowed: true } : {}),
      ...(fulfillment === "delivery" ? { deliveryAllowed: true } : {})
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      locality: true,
      city: true,
      vegType: true,
      pickupAllowed: true,
      deliveryAllowed: true,
      opensAt: true,
      closesAt: true,
      operatingDays: true
    },
    orderBy: { updatedAt: "desc" },
    take: 50
  });
}

export async function getPublicMess(slug: string) {
  const mess = await db.mess.findUnique({ where: { slug } });
  if (!mess || !isDiscoverable(mess as MessRow)) return null;
  return mess;
}

/** Owner-scoped fetch: returns null unless this owner holds the record (404 semantics, no leaks). */
export async function getOwnerMess(ownerId: string, messId: string) {
  const mess = await db.mess.findUnique({ where: { id: messId } });
  if (!mess || mess.ownerId !== ownerId) return null;
  return mess;
}

export async function listOwnerMesses(ownerId: string) {
  return db.mess.findMany({
    where: { ownerId },
    orderBy: { updatedAt: "desc" }
  });
}

export async function listStaffMesses(userId: string) {
  const rows = await db.messStaff.findMany({
    where: { userId },
    include: { mess: true },
    orderBy: { createdAt: "asc" }
  });
  return rows.map((r) => r.mess);
}

export interface TransitionInput {
  messId: string;
  actorId: string;
  to: MessStatus;
  reason?: string;
}

export async function transitionMess({ messId, actorId, to, reason }: TransitionInput) {
  const mess = await db.mess.findUnique({ where: { id: messId } });
  if (!mess) throw Object.assign(new Error("Mess not found"), { code: "NOT_FOUND" });
  const from = mess.verificationStatus as MessStatus;
  if (!canTransition(from, to)) {
    throw Object.assign(new Error(`Cannot move from ${from} to ${to}`), { code: "BAD_TRANSITION" });
  }
  if (requiresReason(to) && !reason?.trim()) {
    throw Object.assign(new Error("A reason is required"), { code: "REASON_REQUIRED" });
  }
  const now = new Date();
  return db.$transaction(async (tx) => {
    const updated = await tx.mess.update({
      where: { id: messId },
      data: {
        verificationStatus: to,
        verificationReason: requiresReason(to) ? reason!.trim() : mess.verificationReason,
        submittedAt: to === "SUBMITTED" ? now : mess.submittedAt,
        decidedAt: ["APPROVED", "REJECTED", "SUSPENDED"].includes(to) ? now : mess.decidedAt,
        decidedById: ["UNDER_REVIEW", "APPROVED", "REJECTED", "SUSPENDED"].includes(to)
          ? actorId
          : mess.decidedById,
        // Suspending hides the listing immediately; reinstatement never republishes by itself.
        published: to === "SUSPENDED" ? false : mess.published
      }
    });
    await tx.messVerificationEvent.create({
      data: { messId, actorId, from, to, reason: reason?.trim() || null }
    });
    return updated;
  });
}

export async function setPublished(messId: string, published: boolean) {
  const mess = await db.mess.findUnique({ where: { id: messId } });
  if (!mess) throw Object.assign(new Error("Mess not found"), { code: "NOT_FOUND" });
  if (published && (mess.verificationStatus as MessStatus) !== "APPROVED") {
    throw Object.assign(new Error("Only approved messes can be published"), {
      code: "NOT_APPROVED"
    });
  }
  return db.mess.update({ where: { id: messId }, data: { published } });
}

export async function weeklyById(messId: string, weeklyId: string) {
  const weekly = await db.weeklyMenu.findUnique({
    where: { id: weeklyId },
    include: { items: { include: { item: true } } }
  });
  return weekly && weekly.messId === messId ? weekly : null;
}
