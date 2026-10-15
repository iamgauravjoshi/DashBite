import { z } from "zod";

const hhmm = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm (24-hour)");

const pricePaise = z
  .number()
  .int("Price must be whole paise")
  .min(100, "Minimum price is ₹1")
  .max(1_000_000, "Maximum price is ₹10,000");

const capacity = z
  .number()
  .int("Capacity must be a whole number")
  .min(1, "Capacity is at least 1 meal")
  .max(10_000, "Capacity tops out at 10,000 meals");

const photoUrl = z
  .string()
  .trim()
  .max(500)
  .url("Photo must be an http(s) URL")
  .refine((u) => u.startsWith("http://") || u.startsWith("https://"), "Photo must be http(s)")
  .optional()
  .or(z.literal(""));

export const slotSchema = z.object({
  key: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_]{2,20}$/, "Key: 2–20 chars, letters/numbers/underscore")
    .optional(),
  name: z.string().trim().min(2, "Name your slot").max(40),
  cutoffTime: hhmm,
  sortOrder: z.number().int().min(0).max(100).optional().default(0),
  active: z.boolean().optional().default(true)
});

export const itemSchema = z.object({
  name: z.string().trim().min(2, "Name your item").max(100),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  pricePaise,
  vegType: z.enum(["VEG", "NON_VEG"]).default("VEG"),
  photoUrl,
  active: z.boolean().optional().default(true)
});

export const weeklyMenuSchema = z.object({
  slotId: z.string().min(1),
  dayOfWeek: z.number().int().min(0).max(6),
  capacity,
  active: z.boolean().optional().default(true)
});

export const weeklyItemSchema = z.object({
  itemId: z.string().min(1),
  pricePaise: pricePaise.optional(),
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

export const dateMenuSchema = z.object({
  slotId: z.string().min(1),
  date: dateStr,
  closed: z.boolean().optional().default(false),
  capacity: capacity.optional(),
  items: z
    .array(
      z.object({
        itemId: z.string().min(1),
        pricePaise,
        active: z.boolean().optional().default(true)
      })
    )
    .max(50)
    .optional()
    .default([])
});

export const holidaySchema = z.object({
  date: dateStr,
  reason: z.string().trim().max(200).optional().or(z.literal(""))
});
