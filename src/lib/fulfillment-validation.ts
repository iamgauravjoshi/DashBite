import { z } from "zod";
import { FAILURE_REASONS } from "@/lib/fulfillment-rules";

export const advanceSchema = z.object({
  to: z.enum(["READY", "ASSIGNED", "DISPATCHED", "PICKED_UP", "DELIVERED"]),
  assigneeType: z.enum(["SELF", "STAFF", "AGENT"]).optional(),
  assigneeEmail: z.string().trim().toLowerCase().email().max(254).optional()
});

export const failSchema = z.object({
  reason: z.enum(FAILURE_REASONS as unknown as [string, ...string[]]),
  note: z.string().trim().max(300).optional().or(z.literal(""))
});
