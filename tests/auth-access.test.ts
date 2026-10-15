import { describe, expect, it } from "vitest";
import {
  ROLE_HOME,
  canEnterSegment,
  isSignupRole,
  profilePath,
  safeNextPath
} from "../src/lib/roles";
import { addressSchema, profileSchema, signUpSchema } from "../src/lib/auth-validation";

describe("segment access (BR-10)", () => {
  it("lets customers into /app only", () => {
    expect(canEnterSegment("CUSTOMER", "/app")).toBe(true);
    expect(canEnterSegment("CUSTOMER", "/app/orders")).toBe(true);
    expect(canEnterSegment("CUSTOMER", "/owner")).toBe(false);
    expect(canEnterSegment("CUSTOMER", "/admin")).toBe(false);
    expect(canEnterSegment("CUSTOMER", "/delivery")).toBe(false);
  });

  it("lets owners everywhere under /owner but nowhere else", () => {
    expect(canEnterSegment("MESS_OWNER", "/owner/menus")).toBe(true);
    expect(canEnterSegment("MESS_OWNER", "/app")).toBe(false);
    expect(canEnterSegment("MESS_OWNER", "/admin")).toBe(false);
  });

  it("restricts staff to assigned sections", () => {
    expect(canEnterSegment("MESS_STAFF", "/owner/orders")).toBe(true);
    expect(canEnterSegment("MESS_STAFF", "/owner/kitchen")).toBe(true);
    expect(canEnterSegment("MESS_STAFF", "/owner/deliveries")).toBe(true);
    expect(canEnterSegment("MESS_STAFF", "/owner/menus")).toBe(false);
    expect(canEnterSegment("MESS_STAFF", "/owner/revenue")).toBe(false);
    expect(canEnterSegment("MESS_STAFF", "/owner")).toBe(false);
    expect(canEnterSegment("MESS_STAFF", "/app")).toBe(false);
  });

  it("isolates delivery and admin", () => {
    expect(canEnterSegment("DELIVERY_AGENT", "/delivery")).toBe(true);
    expect(canEnterSegment("DELIVERY_AGENT", "/owner/deliveries")).toBe(false);
    expect(canEnterSegment("PLATFORM_ADMIN", "/admin/finance")).toBe(true);
    expect(canEnterSegment("PLATFORM_ADMIN", "/app")).toBe(false);
  });
});

describe("redirect safety", () => {
  it("allows same-origin paths and blocks the rest", () => {
    expect(safeNextPath("/app/orders", "/app")).toBe("/app/orders");
    expect(safeNextPath("/owner?x=1", "/app")).toBe("/owner?x=1");
    expect(safeNextPath(null, "/app")).toBe("/app");
    expect(safeNextPath("", "/app")).toBe("/app");
    expect(safeNextPath("//evil.com/x", "/app")).toBe("/app");
    expect(safeNextPath("https://evil.com", "/app")).toBe("/app");
    expect(safeNextPath("javascript:alert(1)", "/app")).toBe("/app");
  });
});

describe("role model", () => {
  it("allowlist self-registration roles only", () => {
    expect(isSignupRole("CUSTOMER")).toBe(true);
    expect(isSignupRole("MESS_OWNER")).toBe(true);
    expect(isSignupRole("DELIVERY_AGENT")).toBe(true);
    expect(isSignupRole("MESS_STAFF")).toBe(false);
    expect(isSignupRole("PLATFORM_ADMIN")).toBe(false);
    expect(isSignupRole("ADMIN")).toBe(false);
  });

  it("maps every role home and profile", () => {
    expect(ROLE_HOME.CUSTOMER).toBe("/app");
    expect(ROLE_HOME.MESS_OWNER).toBe("/owner");
    expect(ROLE_HOME.DELIVERY_AGENT).toBe("/delivery");
    expect(ROLE_HOME.PLATFORM_ADMIN).toBe("/admin");
    expect(profilePath("CUSTOMER")).toBe("/app/profile");
    expect(profilePath("MESS_STAFF")).toBe("/owner/profile");
    expect(profilePath("DELIVERY_AGENT")).toBe("/delivery/profile");
    expect(profilePath("PLATFORM_ADMIN")).toBe("/admin/profile");
  });
});

describe("auth validation", () => {
  const validSignup = {
    name: "Test User",
    email: "User@Example.com",
    password: "password-123",
    role: "CUSTOMER",
    phone: "9876543210"
  };

  it("accepts valid signup and normalizes email", () => {
    const parsed = signUpSchema.safeParse(validSignup);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.email).toBe("user@example.com");
  });

  it("rejects privileged roles, bad email, short passwords, bad phones", () => {
    expect(signUpSchema.safeParse({ ...validSignup, role: "MESS_STAFF" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...validSignup, role: "PLATFORM_ADMIN" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...validSignup, email: "not-an-email" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...validSignup, password: "short" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...validSignup, phone: "123" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...validSignup, phone: "" }).success).toBe(true);
  });

  it("validates addresses strictly", () => {
    const valid = {
      label: "Home",
      line1: "1, MG Road",
      locality: "Camp",
      city: "Pune",
      pincode: "411001"
    };
    expect(addressSchema.safeParse(valid).success).toBe(true);
    expect(addressSchema.safeParse({ ...valid, pincode: "4110" }).success).toBe(false);
    expect(addressSchema.safeParse({ ...valid, pincode: "041001" }).success).toBe(false);
    expect(addressSchema.safeParse({ ...valid, label: "" }).success).toBe(false);
  });

  it("validates profile edits", () => {
    expect(profileSchema.safeParse({ name: "A", phone: "" }).success).toBe(false);
    expect(profileSchema.safeParse({ name: "Anita", phone: "" }).success).toBe(true);
  });
});
