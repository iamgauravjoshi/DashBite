import { z } from "zod";

const dateStr = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine((v) => {
    const [y, m, d] = v.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }, "Not a real calendar date");

const cartLine = z.object({
  itemId: z.string().min(1),
  qty: z.number().int().min(1).max(20)
});

export const orderCartSchema = z.object({
  messId: z.string().min(1),
  slotId: z.string().min(1),
  serviceDate: dateStr,
  items: z.array(cartLine).min(1).max(20),
  fulfillment: z.enum(["PICKUP", "DELIVERY"]),
  addressId: z.string().min(1).optional()
});

export const orderCancelSchema = z.object({
  reason: z.string().trim().max(300).optional().or(z.literal(""))
});

export const messOperationsSchema = z.object({
  deliveryFeePaise: z.number().int().min(0).max(50_000).optional(),
  pickupAllowed: z.boolean().optional(),
  deliveryAllowed: z.boolean().optional(),
  deliveryNote: z.string().trim().max(300).optional().or(z.literal(""))
});
