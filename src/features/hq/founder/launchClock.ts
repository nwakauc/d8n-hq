import { HQ_TIME_ZONE_OFFSET, calendarDateInHqTimeZone, startOfHqCalendarDayMs } from "../../../lib/hq/hqTimeZone.ts";

/**
 * Date9ja: `CompanySetting::DEFAULT_LAUNCHED_AT` (first production deploy
 * 2026-07-21 to 2026-07-23).
 * DateZA / HookUs: founder-stated ages on 2026-09-24 — one calendar month
 * and one week — recorded as Johannesburg launch dates, not backend settings.
 */
export const BRAND_LAUNCHED_ON = {
  date9ja: "2026-07-21",
  dateza: "2026-08-24",
  hookus: "2026-09-17",
} as const;

export const DATE9JA_LAUNCHED_ON = BRAND_LAUNCHED_ON.date9ja;

export const BRAND_LAUNCH_LABEL = {
  date9ja: "Date9ja",
  dateza: "DateZA",
  hookus: "HookUs",
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;

type Ymd = { year: number; month: number; day: number };

function parseYmd(value: string): Ymd {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function ymdMs(parts: Ymd): number {
  return Date.parse(`${parts.year}-${pad(parts.month)}-${pad(parts.day)}T00:00:00${HQ_TIME_ZONE_OFFSET}`);
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function addCalendarMonths(parts: Ymd, months: number): Ymd {
  const index = parts.month - 1 + months;
  const year = parts.year + Math.floor(index / 12);
  const month = ((index % 12) + 12) % 12 + 1;
  return { year, month, day: Math.min(parts.day, daysInMonth(year, month)) };
}

export function daysLiveOn(launchOn: string, nowMs: number): number {
  const launch = Date.parse(`${launchOn}T00:00:00${HQ_TIME_ZONE_OFFSET}`);
  const today = startOfHqCalendarDayMs(nowMs);
  return Math.max(0, Math.round((today - launch) / DAY_MS));
}

export function launchAgeOn(launchOn: string, nowMs: number): {
  totalDays: number;
  months: number;
  extraDays: number;
} {
  const totalDays = daysLiveOn(launchOn, nowMs);
  const launch = parseYmd(launchOn);
  const todayMs = startOfHqCalendarDayMs(nowMs);
  let months = 0;
  while (ymdMs(addCalendarMonths(launch, months + 1)) <= todayMs) {
    months += 1;
  }
  const anniversary = addCalendarMonths(launch, months);
  const extraDays = Math.max(0, Math.round((todayMs - ymdMs(anniversary)) / DAY_MS));
  return { totalDays, months, extraDays };
}

export function formatLaunchAge(age: { totalDays: number; months: number; extraDays: number }): string {
  if (age.months <= 0) {
    if (age.totalDays >= 7) {
      const weeks = Math.floor(age.totalDays / 7);
      const leftover = age.totalDays % 7;
      const weekPart = weeks === 1 ? "1 week" : `${weeks} weeks`;
      if (leftover === 0) return `${weekPart} (${age.totalDays} days)`;
      const dayPart = leftover === 1 ? "1 day" : `${leftover} days`;
      return `${weekPart} ${dayPart} (${age.totalDays} days)`;
    }
    return age.totalDays === 1 ? "1 day" : `${age.totalDays} days`;
  }
  const monthPart = age.months === 1 ? "1 month" : `${age.months} months`;
  if (age.extraDays === 0) return `${monthPart} (${age.totalDays} days)`;
  const dayPart = age.extraDays === 1 ? "1 day" : `${age.extraDays} days`;
  return `${monthPart} ${dayPart} (${age.totalDays} days)`;
}

export type BrandLaunchId = keyof typeof BRAND_LAUNCHED_ON;

export function isBrandLaunchId(value: string | null | undefined): value is BrandLaunchId {
  return value === "date9ja" || value === "dateza" || value === "hookus";
}

export function brandLaunchAges(nowMs: number = Date.now()) {
  const today = calendarDateInHqTimeZone(nowMs);
  return (Object.keys(BRAND_LAUNCHED_ON) as BrandLaunchId[]).map((id) => {
    const launchedOn = BRAND_LAUNCHED_ON[id];
    const age = launchAgeOn(launchedOn, nowMs);
    return {
      id,
      brand: BRAND_LAUNCH_LABEL[id],
      launchedOn,
      today,
      ...age,
      label: formatLaunchAge(age),
    };
  });
}

export function launchAgeForBrand(brandSlug: string | null | undefined, nowMs: number = Date.now()) {
  if (!isBrandLaunchId(brandSlug)) return null;
  return brandLaunchAges(nowMs).find((row) => row.id === brandSlug) ?? null;
}
