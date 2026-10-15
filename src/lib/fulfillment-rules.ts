export type FulfillmentStatus =
  "PENDING" | "READY" | "ASSIGNED" | "DISPATCHED" | "PICKED_UP" | "DELIVERED";

export type AssigneeType = "SELF" | "STAFF" | "AGENT";

export const FAILURE_REASONS = [
  "CUSTOMER_UNAVAILABLE",
  "WRONG_ADDRESS",
  "KITCHEN_DELAY",
  "VEHICLE_ISSUE",
  "CUSTOMER_REJECTED",
  "OTHER"
] as const;
export type FailureReason = (typeof FAILURE_REASONS)[number];

type Method = "PICKUP" | "DELIVERY";

const EDGES: Array<{ from: FulfillmentStatus; to: FulfillmentStatus; method: Method | "BOTH" }> = [
  { from: "PENDING", to: "READY", method: "BOTH" },
  { from: "READY", to: "ASSIGNED", method: "DELIVERY" },
  { from: "READY", to: "PICKED_UP", method: "PICKUP" },
  { from: "ASSIGNED", to: "DISPATCHED", method: "DELIVERY" },
  { from: "ASSIGNED", to: "ASSIGNED", method: "DELIVERY" },
  { from: "DISPATCHED", to: "DELIVERED", method: "DELIVERY" },
  { from: "DISPATCHED", to: "ASSIGNED", method: "DELIVERY" }
];

export function allowedAdvance(
  from: FulfillmentStatus,
  to: FulfillmentStatus,
  method: Method
): boolean {
  return EDGES.some(
    (e) => e.from === from && e.to === to && (e.method === "BOTH" || e.method === method)
  );
}

export function isTerminal(status: FulfillmentStatus): boolean {
  return status === "PICKED_UP" || status === "DELIVERED";
}

/** Two failed attempts flag the parcel for owner review. */
export function needsAttention(failedAttempts: number): boolean {
  return failedAttempts >= 2;
}

/** Service date passed without terminal handover. */
export function isOverdue(status: string, serviceDate: string, today: string): boolean {
  if (status === "PICKED_UP" || status === "DELIVERED") return false;
  return serviceDate < today;
}

export function isFailureReason(value: string): value is FailureReason {
  return (FAILURE_REASONS as readonly string[]).includes(value);
}
