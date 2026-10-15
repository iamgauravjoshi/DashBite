import { z } from "zod";
import { SIGNUP_ROLES, UserRoleSchema, UserStatusSchema } from "@/lib/roles";

export const signUpSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(254),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  role: z.enum(SIGNUP_ROLES),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number")
    .optional()
    .or(z.literal(""))
});

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(254),
  password: z.string().min(1, "Enter your password").max(128),
  callbackURL: z.string().max(500).optional()
});

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(100),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number")
    .optional()
    .or(z.literal(""))
});

export const addressSchema = z.object({
  label: z.string().trim().min(1, "Label your address (Home, Work…)").max(40),
  line1: z.string().trim().min(3, "Enter house/flat and street").max(200),
  line2: z.string().trim().max(200).optional().or(z.literal("")),
  locality: z.string().trim().min(2, "Enter locality").max(100),
  city: z.string().trim().min(2, "Enter city").max(100),
  state: z.string().trim().min(2).max(100).default("Maharashtra"),
  pincode: z
    .string()
    .trim()
    .regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit pincode"),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number")
    .optional()
    .or(z.literal("")),
  isDefault: z.boolean().optional().default(false)
});

export const requestResetSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(254)
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters").max(128),
  token: z.string().min(1, "Reset token is missing")
});

export const roleSchema = UserRoleSchema;
export const statusSchema = UserStatusSchema;
