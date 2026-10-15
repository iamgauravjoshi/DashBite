/** Cutoff semantics (BR-02/BR-16): an order placed at/after the cutoff misses that service day. */
export function isBeforeCutoff(nowHhmm: string, cutoffHhmm: string): boolean {
  return nowHhmm < cutoffHhmm;
}

export function formatINR(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: paise % 100 === 0 ? 0 : 2
  }).format(paise / 100);
}

export const DAY_LABELS: Record<number, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday"
};

export const DAY_CODES = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

export function jsDayToCode(jsDay: number): (typeof DAY_CODES)[number] {
  return DAY_CODES[(jsDay + 6) % 7];
}
