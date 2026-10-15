import { describe, expect, it } from "vitest";
import { isBeforeCutoff, formatINR, jsDayToCode } from "../src/lib/menu-rules";
import { addDays, compareDates, isValidDateString, toDateString } from "../src/lib/ist";

describe("cutoff boundaries (BR-02/BR-16)", () => {
  it("treats the cutoff minute itself as closed", () => {
    expect(isBeforeCutoff("09:29", "09:30")).toBe(true);
    expect(isBeforeCutoff("09:30", "09:30")).toBe(false);
    expect(isBeforeCutoff("09:31", "09:30")).toBe(false);
    expect(isBeforeCutoff("00:00", "23:59")).toBe(true);
  });
});

describe("IST date helpers", () => {
  it("formats UTC instants into IST calendar dates", () => {
    // 2026-10-19 18:30 UTC == 2026-10-20 00:00 IST (Monday)
    expect(toDateString(new Date("2026-10-19T18:30:00Z"), "Asia/Kolkata")).toBe("2026-10-20");
    expect(toDateString(new Date("2026-10-19T18:29:00Z"), "Asia/Kolkata")).toBe("2026-10-19");
  });

  it("adds days across month boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-10-20", 7)).toBe("2026-10-27");
  });

  it("validates calendar dates strictly", () => {
    expect(isValidDateString("2026-10-20")).toBe(true);
    expect(isValidDateString("2026-02-30")).toBe(false);
    expect(isValidDateString("20-10-2026")).toBe(false);
    expect(compareDates("2026-10-19", "2026-10-20")).toBe(-1);
    expect(compareDates("2026-10-20", "2026-10-20")).toBe(0);
  });
});

describe("menu display helpers", () => {
  it("formats paise as INR", () => {
    expect(formatINR(9000)).toContain("90");
    expect(formatINR(9550)).toContain("95.50");
  });

  it("maps JS weekdays to mess day codes", () => {
    expect(jsDayToCode(0)).toBe("SUN");
    expect(jsDayToCode(1)).toBe("MON");
    expect(jsDayToCode(6)).toBe("SAT");
  });
});
