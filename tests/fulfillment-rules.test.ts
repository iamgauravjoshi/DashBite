import { describe, expect, it } from "vitest";
import {
  allowedAdvance,
  isOverdue,
  isTerminal,
  needsAttention
} from "../src/lib/fulfillment-rules";

describe("fulfillment transitions (BR-15)", () => {
  it("walks the pickup path without assignment", () => {
    expect(allowedAdvance("PENDING", "READY", "PICKUP")).toBe(true);
    expect(allowedAdvance("READY", "PICKED_UP", "PICKUP")).toBe(true);
    expect(allowedAdvance("READY", "ASSIGNED", "PICKUP")).toBe(false);
    expect(allowedAdvance("PENDING", "PICKED_UP", "PICKUP")).toBe(false);
  });

  it("walks the delivery path with assignment and redispatch", () => {
    expect(allowedAdvance("PENDING", "READY", "DELIVERY")).toBe(true);
    expect(allowedAdvance("READY", "ASSIGNED", "DELIVERY")).toBe(true);
    expect(allowedAdvance("ASSIGNED", "DISPATCHED", "DELIVERY")).toBe(true);
    expect(allowedAdvance("DISPATCHED", "DELIVERED", "DELIVERY")).toBe(true);
    expect(allowedAdvance("ASSIGNED", "ASSIGNED", "DELIVERY")).toBe(true);
    expect(allowedAdvance("DISPATCHED", "ASSIGNED", "DELIVERY")).toBe(true);
  });

  it("forbids skips, reversals, and cross-method moves", () => {
    expect(allowedAdvance("PENDING", "DISPATCHED", "DELIVERY")).toBe(false);
    expect(allowedAdvance("READY", "DELIVERED", "DELIVERY")).toBe(false);
    expect(allowedAdvance("DELIVERED", "DISPATCHED", "DELIVERY")).toBe(false);
    expect(allowedAdvance("PICKED_UP", "DELIVERED", "PICKUP")).toBe(false);
    expect(allowedAdvance("ASSIGNED", "PICKED_UP", "DELIVERY")).toBe(false);
  });

  it("marks terminal states", () => {
    expect(isTerminal("PICKED_UP")).toBe(true);
    expect(isTerminal("DELIVERED")).toBe(true);
    expect(isTerminal("DISPATCHED")).toBe(false);
    expect(isTerminal("PENDING")).toBe(false);
  });

  it("flags attention and overdue honestly", () => {
    expect(needsAttention(1)).toBe(false);
    expect(needsAttention(2)).toBe(true);
    expect(isOverdue("DISPATCHED", "2026-10-20", "2026-10-21")).toBe(true);
    expect(isOverdue("DISPATCHED", "2026-10-21", "2026-10-21")).toBe(false);
    expect(isOverdue("DELIVERED", "2026-10-20", "2026-10-21")).toBe(false);
  });
});
