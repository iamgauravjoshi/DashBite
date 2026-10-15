import { z } from "zod";

export const UserRoleSchema = z.enum([
  "CUSTOMER",
  "MESS_OWNER",
  "MESS_STAFF",
  "DELIVERY_AGENT",
  "PLATFORM_ADMIN"
]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserStatusSchema = z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "UNVERIFIED"]);
export type UserStatus = z.infer<typeof UserStatusSchema>;

/** Roles a person may self-select at public sign-up. Staff are invited by owners (Phase 3); admins are seeded. */
export const SIGNUP_ROLES = [
  "CUSTOMER",
  "MESS_OWNER",
  "DELIVERY_AGENT"
] as const satisfies readonly UserRole[];
export type SignupRole = (typeof SIGNUP_ROLES)[number];

export function isSignupRole(role: string): role is SignupRole {
  return (SIGNUP_ROLES as readonly string[]).includes(role);
}

export const ROLE_HOME: Record<UserRole, string> = {
  CUSTOMER: "/app",
  MESS_OWNER: "/owner",
  MESS_STAFF: "/owner/orders",
  DELIVERY_AGENT: "/delivery",
  PLATFORM_ADMIN: "/admin"
};

/** Layout segments each role may enter. Server-enforced; UI nav is not enforcement (BR-10). */
export const ROLE_SEGMENTS: Record<UserRole, string[]> = {
  CUSTOMER: ["/app"],
  MESS_OWNER: ["/owner"],
  MESS_STAFF: ["/owner/orders", "/owner/kitchen", "/owner/deliveries"],
  DELIVERY_AGENT: ["/delivery"],
  PLATFORM_ADMIN: ["/admin"]
};

export function canEnterSegment(role: UserRole, pathname: string): boolean {
  return ROLE_SEGMENTS[role].some(
    (segment) => pathname === segment || pathname.startsWith(`${segment}/`)
  );
}

/** Base shell path owning the role's profile page. */
export function profilePath(role: UserRole): string {
  switch (role) {
    case "CUSTOMER":
      return "/app/profile";
    case "MESS_OWNER":
    case "MESS_STAFF":
      return "/owner/profile";
    case "DELIVERY_AGENT":
      return "/delivery/profile";
    case "PLATFORM_ADMIN":
      return "/admin/profile";
  }
}

/** Allow only same-origin relative redirects after auth (blocks open redirects). */
export function safeNextPath(next: string | null | undefined, fallback: string): string {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  try {
    const url = new URL(next, "http://localhost");
    if (url.origin !== "http://localhost") return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
