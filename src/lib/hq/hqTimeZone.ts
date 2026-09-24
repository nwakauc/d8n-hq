/** Command Centre health, funnel, and trends require this zone. */
export const HQ_TIME_ZONE = "Africa/Johannesburg";

/** SAST is UTC+2 year-round (no daylight saving). */
export const HQ_TIME_ZONE_OFFSET = "+02:00";

export function calendarDateInHqTimeZone(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: HQ_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

/** Midnight of the Johannesburg calendar day that contains `ms`. */
export function startOfHqCalendarDayMs(ms: number): number {
  const ymd = calendarDateInHqTimeZone(ms);
  return Date.parse(`${ymd}T00:00:00${HQ_TIME_ZONE_OFFSET}`);
}
