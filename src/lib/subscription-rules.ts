import { addDays, compareDates } from "@/lib/ist";

export interface EntitlementState {
  startDate: string;
  endDate: string;
  mealsTotal: number;
  operatingDays: string[];
  holidays: Set<string>;
  skips: Set<string>;
  /** Pause ranges; end null = still open. */
  pauses: Array<{ start: string; end: string | null }>;
}

export type StoredSubStatus = "PENDING_PAYMENT" | "ACTIVE" | "CANCELLED";
export type EffectiveSubStatus =
  "PENDING_PAYMENT" | "ACTIVE" | "PAUSED" | "EXPIRED" | "COMPLETED" | "CANCELLED";

function inRanges(date: string, pauses: Array<{ start: string; end: string | null }>): boolean {
  return pauses.some(
    (p) => compareDates(date, p.start) >= 0 && (p.end == null || compareDates(date, p.end) <= 0)
  );
}

/** All dates in [from, to] that would serve a meal under current records. */
export function servicedDates(state: EntitlementState, from: string, to: string): string[] {
  const out: string[] = [];
  let cursor = compareDates(from, state.startDate) < 0 ? state.startDate : from;
  const end = compareDates(to, state.endDate) > 0 ? state.endDate : to;
  const jsDay = (d: string) => new Date(`${d}T00:00:00Z`).getUTCDay();
  const code = (d: string) => ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][jsDay(d)];
  while (compareDates(cursor, end) <= 0) {
    if (
      state.operatingDays.includes(code(cursor)) &&
      !state.holidays.has(cursor) &&
      !state.skips.has(cursor) &&
      !inRanges(cursor, state.pauses)
    ) {
      out.push(cursor);
    }
    cursor = addDays(cursor, 1);
  }
  return out;
}

/** Meals already committed: serviced dates before today, plus today once past cutoff. */
export function usedCount(
  state: EntitlementState,
  today: string,
  todayPastCutoff: boolean
): number {
  const past = servicedDates(state, state.startDate, addDays(today, -1)).length;
  if (!todayPastCutoff) return past;
  const includesToday = servicedDates(state, today, today).length;
  return past + includesToday;
}

export function remainingMeals(
  state: EntitlementState,
  today: string,
  todayPastCutoff: boolean
): number {
  return Math.max(0, state.mealsTotal - usedCount(state, today, todayPastCutoff));
}

/** Future serviced dates capped by remaining balance (kitchen + customer share this). */
export function upcomingMeals(
  state: EntitlementState,
  today: string,
  todayPastCutoff: boolean,
  limitDays = 30
): string[] {
  const remaining = remainingMeals(state, today, todayPastCutoff);
  if (remaining <= 0) return [];
  const from = todayPastCutoff ? addDays(today, 1) : today;
  return servicedDates(state, from, addDays(today, limitDays)).slice(0, remaining);
}

export function isPausedOn(state: EntitlementState, date: string): boolean {
  return inRanges(date, state.pauses);
}

export function effectiveStatus(
  stored: StoredSubStatus,
  state: EntitlementState,
  today: string,
  todayPastCutoff: boolean
): EffectiveSubStatus {
  if (stored === "CANCELLED") return "CANCELLED";
  if (stored === "PENDING_PAYMENT") return "PENDING_PAYMENT";
  if (compareDates(today, state.endDate) > 0) return "EXPIRED";
  if (remainingMeals(state, today, todayPastCutoff) <= 0) return "COMPLETED";
  if (isPausedOn(state, today)) return "PAUSED";
  return "ACTIVE";
}

/** Pause takes effect tomorrow so today's already-planned meal stands. */
export function pauseStartFor(today: string): string {
  return addDays(today, 1);
}

/**
 * Validity extension for a resumed pause: serviced-eligible days inside the
 * paused range (what the customer actually lost — holidays and off-days excluded).
 */
export function pauseExtensionDays(
  state: Omit<EntitlementState, "pauses">,
  pauseStart: string,
  resumeDate: string,
  skips: Set<string>
): number {
  const probe: EntitlementState = { ...state, pauses: [], skips };
  const from = compareDates(pauseStart, state.startDate) < 0 ? state.startDate : pauseStart;
  const to = compareDates(resumeDate, state.endDate) > 0 ? state.endDate : resumeDate;
  if (compareDates(from, to) > 0) return 0;
  return servicedDates(probe, from, to).length;
}

export type SkipVerdict =
  | { ok: true }
  | { ok: false; code: "PAST_DATE" | "CUTOFF_PASSED" | "NOT_SERVICEABLE" | "ALREADY_SKIPPED" };

export function canSkip(args: {
  date: string;
  today: string;
  beforeCutoff: boolean;
  serviced: boolean;
  alreadySkipped: boolean;
}): SkipVerdict {
  if (compareDates(args.date, args.today) < 0) return { ok: false, code: "PAST_DATE" };
  if (args.alreadySkipped) return { ok: false, code: "ALREADY_SKIPPED" };
  if (!args.serviced) return { ok: false, code: "NOT_SERVICEABLE" };
  if (args.date === args.today && !args.beforeCutoff) return { ok: false, code: "CUTOFF_PASSED" };
  return { ok: true };
}

export function renewalStart(currentEnd: string, today: string): string {
  return compareDates(currentEnd, today) >= 0 ? addDays(currentEnd, 1) : today;
}
