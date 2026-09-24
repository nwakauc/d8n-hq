import { describe, expect, it } from "vitest";
import { calendarDateInHqTimeZone, startOfHqCalendarDayMs } from "./hqTimeZone.ts";

describe("HQ Johannesburg day boundary", () => {
  it("treats 22:30 UTC as the next Johannesburg calendar day", () => {
    const lateUtc = Date.parse("2026-09-20T22:30:00.000Z");
    expect(calendarDateInHqTimeZone(lateUtc)).toBe("2026-09-21");
    expect(startOfHqCalendarDayMs(lateUtc)).toBe(Date.parse("2026-09-21T00:00:00+02:00"));
  });

  it("keeps 21:30 UTC on the same Johannesburg calendar day", () => {
    const sameDay = Date.parse("2026-09-20T21:30:00.000Z");
    expect(calendarDateInHqTimeZone(sameDay)).toBe("2026-09-20");
    expect(startOfHqCalendarDayMs(sameDay)).toBe(Date.parse("2026-09-20T00:00:00+02:00"));
  });
});
