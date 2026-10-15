import { describe, expect, it } from "vitest";
import {
  canTransition,
  isDiscoverable,
  isOwnerTransition,
  requiresReason,
  slugify
} from "../src/lib/mess-rules";
import {
  discoverQuerySchema,
  messDecisionSchema,
  messFormSchema
} from "../src/lib/mess-validation";

describe("verification transitions (BR-15)", () => {
  it("allows the owner loop draft/submitted/rejected", () => {
    expect(canTransition("DRAFT", "SUBMITTED")).toBe(true);
    expect(canTransition("SUBMITTED", "DRAFT")).toBe(true);
    expect(canTransition("REJECTED", "DRAFT")).toBe(true);
    expect(canTransition("REJECTED", "SUBMITTED")).toBe(true);
    expect(isOwnerTransition("DRAFT", "SUBMITTED")).toBe(true);
    expect(isOwnerTransition("SUBMITTED", "UNDER_REVIEW")).toBe(false);
  });

  it("allows the admin review path and suspension", () => {
    expect(canTransition("SUBMITTED", "UNDER_REVIEW")).toBe(true);
    expect(canTransition("UNDER_REVIEW", "APPROVED")).toBe(true);
    expect(canTransition("UNDER_REVIEW", "REJECTED")).toBe(true);
    expect(canTransition("APPROVED", "SUSPENDED")).toBe(true);
    expect(canTransition("SUSPENDED", "APPROVED")).toBe(true);
  });

  it("forbids skipping review and editing live listings via status", () => {
    expect(canTransition("DRAFT", "APPROVED")).toBe(false);
    expect(canTransition("SUBMITTED", "APPROVED")).toBe(false);
    expect(canTransition("APPROVED", "DRAFT")).toBe(false);
    expect(canTransition("APPROVED", "REJECTED")).toBe(false);
    expect(canTransition("SUSPENDED", "DRAFT")).toBe(false);
  });

  it("requires reasons for rejection and suspension only", () => {
    expect(requiresReason("REJECTED")).toBe(true);
    expect(requiresReason("SUSPENDED")).toBe(true);
    expect(requiresReason("APPROVED")).toBe(false);
    expect(requiresReason("UNDER_REVIEW")).toBe(false);
  });
});

describe("discovery eligibility (BR-01)", () => {
  const base = { id: "m1", published: true, verificationStatus: "APPROVED", city: "Pune" } as const;
  it("shows approved + published only", () => {
    expect(isDiscoverable({ ...base })).toBe(true);
    expect(isDiscoverable({ ...base, published: false })).toBe(false);
    const statuses = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "REJECTED", "SUSPENDED"] as const;
    for (const s of statuses) {
      expect(isDiscoverable({ ...base, verificationStatus: s })).toBe(false);
    }
  });
});

describe("slugs", () => {
  it("slugifies names deterministically", () => {
    expect(slugify("Annapurna Mess & Tiffin")).toBe("annapurna-mess-tiffin");
    expect(slugify("  A  ")).toBe("a");
    expect(slugify("!!!")).toBe("mess");
  });
});

describe("mess validation", () => {
  const valid = {
    name: "Annapurna Mess",
    phone: "9876543210",
    line1: "1, MG Road",
    locality: "Camp",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411001",
    vegType: "BOTH",
    pickupAllowed: true,
    deliveryAllowed: true,
    serviceAreas: ["Camp", "MG Road"],
    operatingDays: ["MON", "TUE"],
    opensAt: "07:00",
    closesAt: "21:00"
  };

  it("accepts a complete mess and defaults the rest", () => {
    const parsed = messFormSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("rejects bad contact, hours, and empty service areas", () => {
    expect(messFormSchema.safeParse({ ...valid, phone: "123" }).success).toBe(false);
    expect(messFormSchema.safeParse({ ...valid, pincode: "041001" }).success).toBe(false);
    expect(messFormSchema.safeParse({ ...valid, opensAt: "7am" }).success).toBe(false);
    expect(messFormSchema.safeParse({ ...valid, serviceAreas: [] }).success).toBe(false);
    expect(messFormSchema.safeParse({ ...valid, operatingDays: [] }).success).toBe(false);
    expect(messFormSchema.safeParse({ ...valid, name: "AB" }).success).toBe(false);
  });

  it("constrains admin decisions and discovery filters", () => {
    expect(messDecisionSchema.safeParse({ to: "DRAFT" }).success).toBe(false);
    expect(messDecisionSchema.safeParse({ to: "APPROVED", reason: "Good kitchen" }).success).toBe(
      true
    );
    expect(discoverQuerySchema.safeParse({ veg: "VEGAN" }).success).toBe(false);
    expect(discoverQuerySchema.safeParse({ fulfillment: "drone" }).success).toBe(false);
  });
});
