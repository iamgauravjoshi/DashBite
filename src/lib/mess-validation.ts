import { z } from "zod";

const phone = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number");
const pincode = z
  .string()
  .trim()
  .regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit pincode");
const hhmm = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm (24-hour)");

const DAY = z.enum(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]);

export const messFormSchema = z.object({
  name: z.string().trim().min(3, "Name needs at least 3 characters").max(100),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  phone,
  line1: z.string().trim().min(3, "Enter shop/house and street").max(200),
  locality: z.string().trim().min(2, "Enter locality").max(100),
  city: z.string().trim().min(2).max(100).default("Pune"),
  state: z.string().trim().min(2).max(100).default("Maharashtra"),
  pincode,
  vegType: z.enum(["VEG", "NON_VEG", "BOTH"]).default("BOTH"),
  pickupAllowed: z.boolean().default(true),
  deliveryAllowed: z.boolean().default(true),
  deliveryNote: z.string().trim().max(300).optional().or(z.literal("")),
  serviceAreas: z
    .array(z.string().trim().min(2).max(100))
    .min(1, "Add at least one served locality")
    .max(20, "At most 20 served localities"),
  operatingDays: z.array(DAY).min(1, "Select at least one operating day").max(7),
  opensAt: hhmm,
  closesAt: hhmm
});

export const messDecisionSchema = z.object({
  to: z.enum(["UNDER_REVIEW", "APPROVED", "REJECTED", "SUSPENDED"]),
  reason: z.string().trim().max(500).optional().or(z.literal(""))
});

export const messPublishSchema = z.object({
  published: z.boolean()
});

export const messSubmitSchema = z.object({
  submit: z.literal(true)
});

export const staffAddSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254)
});

export const discoverQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  locality: z.string().trim().max(100).optional(),
  veg: z.enum(["VEG", "NON_VEG", "BOTH"]).optional(),
  fulfillment: z.enum(["pickup", "delivery"]).optional()
});

export type MessPayload = z.output<typeof messFormSchema>;
