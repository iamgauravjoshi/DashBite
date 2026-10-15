import { z } from "zod";

const dateStr = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const sheetQuerySchema = z.object({
  slotId: z.string().min(1),
  date: dateStr
});

export const adjustmentSchema = z.object({
  itemLabel: z.string().trim().min(1, "Say what this covers").max(80),
  qtyDelta: z
    .number()
    .int()
    .min(-1000)
    .max(1000)
    .refine((n) => n !== 0, "Change cannot be zero"),
  reason: z.string().trim().min(3, "Say why — the team sees it").max(300)
});
