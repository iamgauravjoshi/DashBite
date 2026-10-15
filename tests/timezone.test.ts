import { describe, expect, it } from "vitest";
import { DEFAULT_TIMEZONE, getAppTimezone, isValidIanaTimezone } from "../src/lib/time";

describe("timezone foundation (BR-16)", () => {
  it("defaults to Asia/Kolkata when APP_TIMEZONE is unset", () => {
    const prev = process.env.APP_TIMEZONE;
    delete process.env.APP_TIMEZONE;
    expect(getAppTimezone()).toBe(DEFAULT_TIMEZONE);
    if (prev !== undefined) process.env.APP_TIMEZONE = prev;
  });

  it("accepts Asia/Kolkata as a valid IANA timezone", () => {
    expect(isValidIanaTimezone("Asia/Kolkata")).toBe(true);
  });

  it("rejects an invalid timezone", () => {
    expect(isValidIanaTimezone("Not/AZone")).toBe(false);
  });
});
