import type { HqMetricValue, HqMetricWindow } from "../../../lib/hq/types.ts";

const COMPLETE_DAY_MS = 20 * 60 * 60 * 1000;

export function windowDurationMs(window: HqMetricWindow | undefined): number | null {
  if (!window) return null;
  const start = Date.parse(window.start_at);
  const end = Date.parse(window.end_at);
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
  return end - start;
}

/** A "today" window that ends before a full calendar day is still in progress. */
export function isIncompleteCalendarWindow(window: HqMetricWindow | undefined): boolean {
  const duration = windowDurationMs(window);
  return duration === null || duration < COMPLETE_DAY_MS;
}

export function numericMetric(metric: HqMetricValue | undefined): number | null {
  if (metric?.status !== "available" || typeof metric.value !== "number") return null;
  return metric.value;
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? null : 100;
  return Math.round(((current - previous) / previous) * 100);
}

export type HeroDayTrend = {
  kind: "percent" | "previous_count";
  change: number | null;
  previousValue: number;
  incomplete: boolean;
  title: string;
  ariaLabel: string;
  label: string;
};

/**
 * Today vs the previous Johannesburg calendar day.
 * A percentage against a completed yesterday is only honest when today is
 * also a completed day. Otherwise show yesterday's count — do not invent a pace.
 */
export function heroDayTrend(
  current: HqMetricValue,
  previous: HqMetricValue | undefined,
  todayWindow: HqMetricWindow | undefined,
): HeroDayTrend | null {
  const currentValue = numericMetric(current);
  const previousValue = numericMetric(previous);
  if (currentValue === null || previousValue === null) return null;

  const incomplete = isIncompleteCalendarWindow(todayWindow);
  if (incomplete) {
    const previousText = previousValue.toLocaleString("en-ZA");
    return {
      kind: "previous_count",
      change: null,
      previousValue,
      incomplete: true,
      title: `Today ${currentValue.toLocaleString("en-ZA")} vs yesterday ${previousText}. Today is still in progress in Africa/Johannesburg, so HQ does not show a percentage against a full previous day.`,
      ariaLabel: `Yesterday ${previousText}. Today is still in progress.`,
      label: `${previousText} yesterday`,
    };
  }

  const change = percentChange(currentValue, previousValue);
  if (change === null) return null;
  const direction = change >= 0 ? "Up" : "Down";
  return {
    kind: "percent",
    change,
    previousValue,
    incomplete: false,
    title: `${direction} ${Math.abs(change)}% vs yesterday ${previousValue.toLocaleString("en-ZA")} (today ${currentValue.toLocaleString("en-ZA")}).`,
    ariaLabel: `${direction} ${Math.abs(change)} percent versus the previous day`,
    label: `${change >= 0 ? "↑" : "↓"} ${Math.abs(change)}%`,
  };
}
