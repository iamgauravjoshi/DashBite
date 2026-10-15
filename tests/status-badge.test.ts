import { describe, expect, it } from "vitest";
import { toneFor } from "../src/components/data/StatusBadge";

describe("status tone mapping", () => {
  it("maps success-like states to default", () => {
    for (const status of ["active", "approved", "confirmed", "completed", "published"]) {
      expect(toneFor(status)).toBe("default");
    }
  });

  it("maps pending-like states to secondary", () => {
    for (const status of ["pending", "submitted", "paused"]) {
      expect(toneFor(status)).toBe("secondary");
    }
  });

  it("maps dangerous states to destructive", () => {
    for (const status of ["suspended", "rejected", "failed", "cancelled"]) {
      expect(toneFor(status)).toBe("destructive");
    }
  });

  it("is case- and separator-insensitive with an outline fallback", () => {
    expect(toneFor("Under Review")).toBe("outline");
    expect(toneFor("SUSPENDED")).toBe("destructive");
    expect(toneFor("under_review")).toBe("outline");
    expect(toneFor("something-new")).toBe("outline");
  });
});
