import { describe, expect, it } from "vitest";
import {
  BRAND_LAUNCHED_ON,
  brandLaunchAges,
  daysLiveOn,
  formatLaunchAge,
  launchAgeForBrand,
  launchAgeOn,
} from "./launchClock.ts";

const NOW_24_SEP = Date.parse("2026-09-24T12:00:00+02:00");

describe("brand launch clocks", () => {
  it("keeps Date9ja on the legacy admin launch day", () => {
    expect(daysLiveOn(BRAND_LAUNCHED_ON.date9ja, NOW_24_SEP)).toBe(65);
    expect(formatLaunchAge(launchAgeOn(BRAND_LAUNCHED_ON.date9ja, NOW_24_SEP))).toBe(
      "2 months 3 days (65 days)",
    );
  });

  it("treats DateZA as one calendar month old on 24 Sep 2026", () => {
    expect(BRAND_LAUNCHED_ON.dateza).toBe("2026-08-24");
    expect(launchAgeOn(BRAND_LAUNCHED_ON.dateza, NOW_24_SEP)).toEqual({
      totalDays: 31,
      months: 1,
      extraDays: 0,
    });
    expect(formatLaunchAge(launchAgeOn(BRAND_LAUNCHED_ON.dateza, NOW_24_SEP))).toBe("1 month (31 days)");
  });

  it("treats HookUs as one week old on 24 Sep 2026", () => {
    expect(BRAND_LAUNCHED_ON.hookus).toBe("2026-09-17");
    expect(daysLiveOn(BRAND_LAUNCHED_ON.hookus, NOW_24_SEP)).toBe(7);
    expect(formatLaunchAge(launchAgeOn(BRAND_LAUNCHED_ON.hookus, NOW_24_SEP))).toBe("1 week (7 days)");
  });

  it("returns all three brands", () => {
    expect(brandLaunchAges(NOW_24_SEP).map((row) => row.id)).toEqual(["date9ja", "dateza", "hookus"]);
  });

  it("scopes the clock to the signed-in brand", () => {
    expect(launchAgeForBrand("date9ja", NOW_24_SEP)?.id).toBe("date9ja");
    expect(launchAgeForBrand("dateza", NOW_24_SEP)?.id).toBe("dateza");
    expect(launchAgeForBrand("hookus", NOW_24_SEP)?.id).toBe("hookus");
    expect(launchAgeForBrand("otherbrand", NOW_24_SEP)).toBeNull();
  });
});
