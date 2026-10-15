import { describe, expect, it } from "vitest";
import {
  canSkip,
  effectiveStatus,
  isPausedOn,
  pauseExtensionDays,
  pauseStartFor,
  remainingMeals,
  renewalStart,
  servicedDates,
  upcomingMeals,
  usedCount,
  type EntitlementState
} from "../src/lib/subscription-rules";

function state(overrides: Partial<EntitlementState> = {}): EntitlementState {
  return {
    startDate: "2026-10-01",
    endDate: "2026-10-30",
    mealsTotal: 30,
    operatingDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
    holidays: new Set(),
    skips: new Set(),
    pauses: [],
    ...overrides
  };
}

describe("serviced dates", () => {
  it("covers operating days in window", () => {
    const days = servicedDates(state(), "2026-10-01", "2026-10-07");
    // Oct 1 2026 is a Thursday; Sunday Oct 4 excluded.
    expect(days).toEqual([
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-05",
      "2026-10-06",
      "2026-10-07"
    ]);
  });

  it("excludes holidays, skips, and pauses", () => {
    const days = servicedDates(
      state({
        holidays: new Set(["2026-10-02"]),
        skips: new Set(["2026-10-03"]),
        pauses: [{ start: "2026-10-05", end: "2026-10-06" }]
      }),
      "2026-10-01",
      "2026-10-07"
    );
    expect(days).toEqual(["2026-10-01", "2026-10-07"]);
  });

  it("clamps to the validity window", () => {
    expect(servicedDates(state(), "2026-09-01", "2026-12-31").length).toBe(26);
    expect(servicedDates(state(), "2026-09-01", "2026-09-30")).toEqual([]);
  });
});

describe("usage and balance", () => {
  it("counts past serviced days, plus today only past cutoff", () => {
    expect(usedCount(state(), "2026-10-05", false)).toBe(3);
    expect(usedCount(state(), "2026-10-05", true)).toBe(4);
    expect(remainingMeals(state(), "2026-10-05", false)).toBe(27);
  });

  it("skips never consume balance", () => {
    const s = state({ skips: new Set(["2026-10-02", "2026-10-03"]) });
    expect(usedCount(s, "2026-10-05", false)).toBe(1);
    expect(remainingMeals(s, "2026-10-05", false)).toBe(29);
  });
});

describe("upcoming meals", () => {
  it("lists future serviced dates capped by balance", () => {
    expect(upcomingMeals(state(), "2026-10-05", false, 30).slice(0, 3)).toEqual([
      "2026-10-05",
      "2026-10-06",
      "2026-10-07"
    ]);
    // Past cutoff: today no longer listed.
    expect(upcomingMeals(state(), "2026-10-05", true, 30)[0]).toBe("2026-10-06");
    // Exhausted balance: nothing upcoming.
    expect(upcomingMeals(state({ mealsTotal: 3 }), "2026-10-05", false, 30)).toEqual([]);
  });
});

describe("effective status", () => {
  it("derives paused, expired, completed without stored transitions", () => {
    expect(effectiveStatus("ACTIVE", state(), "2026-10-05", false)).toBe("ACTIVE");
    expect(
      effectiveStatus(
        "ACTIVE",
        state({ pauses: [{ start: "2026-10-01", end: null }] }),
        "2026-10-05",
        false
      )
    ).toBe("PAUSED");
    expect(effectiveStatus("ACTIVE", state(), "2026-10-31", false)).toBe("EXPIRED");
    expect(effectiveStatus("ACTIVE", state({ mealsTotal: 3 }), "2026-10-05", false)).toBe(
      "COMPLETED"
    );
    expect(effectiveStatus("CANCELLED", state(), "2026-10-05", false)).toBe("CANCELLED");
    expect(effectiveStatus("PENDING_PAYMENT", state(), "2026-10-05", false)).toBe(
      "PENDING_PAYMENT"
    );
  });

  it("detects pause membership", () => {
    const pauses = [{ start: "2026-10-05", end: "2026-10-07" }];
    expect(isPausedOn(state({ pauses }), "2026-10-06")).toBe(true);
    expect(isPausedOn(state({ pauses }), "2026-10-08")).toBe(false);
    expect(isPausedOn(state({ pauses: [{ start: "2026-10-05", end: null }] }), "2026-10-30")).toBe(
      true
    );
  });
});

describe("pause math", () => {
  it("starts pauses tomorrow and extends only lost service days", () => {
    expect(pauseStartFor("2026-10-05")).toBe("2026-10-06");
    const base = state();
    // Pause Mon Oct 5 is a Monday; resume Fri Oct 9: Mon–Fri minus nothing = 5 days.
    expect(pauseExtensionDays(base, "2026-10-05", "2026-10-09", new Set())).toBe(5);
    // Spanning a Sunday + holiday: only service days count.
    expect(
      pauseExtensionDays(
        { ...base, holidays: new Set(["2026-10-07"]) },
        "2026-10-03",
        "2026-10-11",
        new Set()
      )
    ).toBe(6);
    // Skipped days inside the pause are not extended (nothing lost).
    expect(pauseExtensionDays(base, "2026-10-05", "2026-10-09", new Set(["2026-10-06"]))).toBe(4);
  });
});

describe("skip verdicts", () => {
  it("enforces past/cutoff/serviceability/duplicate rules", () => {
    const good = {
      date: "2026-10-06",
      today: "2026-10-05",
      beforeCutoff: true,
      serviced: true,
      alreadySkipped: false
    };
    expect(canSkip(good)).toEqual({ ok: true });
    expect(canSkip({ ...good, date: "2026-10-04" })).toEqual({ ok: false, code: "PAST_DATE" });
    expect(canSkip({ ...good, alreadySkipped: true })).toEqual({
      ok: false,
      code: "ALREADY_SKIPPED"
    });
    expect(canSkip({ ...good, serviced: false })).toEqual({ ok: false, code: "NOT_SERVICEABLE" });
    expect(canSkip({ ...good, date: "2026-10-05", beforeCutoff: false })).toEqual({
      ok: false,
      code: "CUTOFF_PASSED"
    });
    expect(canSkip({ ...good, date: "2026-10-05", beforeCutoff: true })).toEqual({ ok: true });
  });
});

describe("renewal", () => {
  it("chains after live plans, starts today after expiry", () => {
    expect(renewalStart("2026-10-30", "2026-10-05")).toBe("2026-10-31");
    expect(renewalStart("2026-10-01", "2026-10-05")).toBe("2026-10-05");
  });
});
