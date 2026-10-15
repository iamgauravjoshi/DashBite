export type MessStatus =
  "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "SUSPENDED";

export type VegType = "VEG" | "NON_VEG" | "BOTH";
export type FulfillmentFilter = "pickup" | "delivery";

/** Allowed status transitions. Owner paths use DRAFT↔SUBMITTED; admin paths use the rest. */
const TRANSITIONS: Record<MessStatus, MessStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["DRAFT", "UNDER_REVIEW", "REJECTED"],
  UNDER_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: ["SUSPENDED"],
  REJECTED: ["DRAFT", "SUBMITTED"],
  SUSPENDED: ["APPROVED"]
};

const OWNER_TRANSITIONS: Array<[MessStatus, MessStatus]> = [
  ["DRAFT", "SUBMITTED"],
  ["SUBMITTED", "DRAFT"],
  ["REJECTED", "DRAFT"],
  ["REJECTED", "SUBMITTED"]
];

export function canTransition(from: MessStatus, to: MessStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function isOwnerTransition(from: MessStatus, to: MessStatus): boolean {
  return OWNER_TRANSITIONS.some(([f, t]) => f === from && t === to);
}

/** Reasons are mandatory when rejecting or suspending — owners see them. */
export function requiresReason(to: MessStatus): boolean {
  return to === "REJECTED" || to === "SUSPENDED";
}

export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "mess";
}

export interface MessRow {
  id: string;
  published: boolean;
  verificationStatus: MessStatus;
  city: string;
}

/** BR-01: only approved + published listings are publicly visible. */
export function isDiscoverable(mess: MessRow): boolean {
  return mess.published && mess.verificationStatus === "APPROVED";
}
