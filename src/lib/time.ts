export const DEFAULT_TIMEZONE = "Asia/Kolkata";

export function getAppTimezone(): string {
  return process.env.APP_TIMEZONE?.trim() || DEFAULT_TIMEZONE;
}

export function isValidIanaTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat("en-IN", { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
}
