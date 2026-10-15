import { z } from "zod";

export const planSchema = z.object({
  slotId: z.string().min(1),
  name: z.string().trim().min(3, "Name your plan").max(80),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  mealsTotal: z.number().int().min(5, "At least 5 meals").max(365),
  validityDays: z.number().int().min(7, "At least 7 days").max(365),
  pricePaise: z
    .number()
    .int()
    .min(100, "Minimum price is ₹1")
    .max(1_000_000, "Maximum price is ₹10,000"),
  active: z.boolean().optional().default(true)
});

const dateStr = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine((v) => {
    const [y, m, d] = v.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }, "Not a real calendar date");

export const skipSchema = z.object({
  dates: z.array(dateStr).min(1).max(14),
  reason: z.string().trim().max(200).optional().or(z.literal(""))
});

export const adjustSchema = z.object({
  kind: z.enum(["EXTEND_VALIDITY", "ADD_MEALS"]),
  days: z.number().int().min(1).max(90).optional(),
  meals: z.number().int().min(1).max(100).optional(),
  reason: z.string().trim().min(3, "Say why — the customer sees it").max(300)
});
