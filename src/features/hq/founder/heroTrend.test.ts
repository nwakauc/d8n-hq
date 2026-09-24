import { describe, expect, it } from "vitest";
import type { HqMetricValue, HqMetricWindow } from "../../../lib/hq/types.ts";
import { heroDayTrend, isIncompleteCalendarWindow, percentChange } from "./heroTrend.ts";

function available(value: number): HqMetricValue {
  return {
    metric_id: "test",
    version: 1,
    definition: "test",
    status: "available",
    unit: "count",
    limitations: [],
    value,
  };
}

describe("percentChange", () => {
  it("is (today − yesterday) / yesterday", () => {
    expect(percentChange(1, 5)).toBe(-80);
    expect(percentChange(3, 2)).toBe(50);
    expect(percentChange(5, 0)).toBe(100);
    expect(percentChange(0, 0)).toBeNull();
  });
});

describe("isIncompleteCalendarWindow", () => {
  it("treats a 12-hour today window as in progress", () => {
    const today: HqMetricWindow = {
      label: "Today",
      start_at: "2026-09-24T00:00:00+02:00",
      end_at: "2026-09-24T12:00:00+02:00",
    };
    expect(isIncompleteCalendarWindow(today)).toBe(true);
  });

  it("treats a 24-hour window as complete", () => {
    const yesterday: HqMetricWindow = {
      label: "Previous day",
      start_at: "2026-09-23T00:00:00+02:00",
      end_at: "2026-09-24T00:00:00+02:00",
    };
    expect(isIncompleteCalendarWindow(yesterday)).toBe(false);
  });
});

describe("heroDayTrend", () => {
  const incompleteToday: HqMetricWindow = {
    label: "Today",
    start_at: "2026-09-24T00:00:00+02:00",
    end_at: "2026-09-24T13:21:00+02:00",
  };

  it("does not turn a partial today vs a full yesterday into a percentage", () => {
    const trend = heroDayTrend(available(1), available(5), incompleteToday);
    expect(trend?.kind).toBe("previous_count");
    expect(trend?.change).toBeNull();
    expect(trend?.label).toBe("5 yesterday");
    expect(trend?.title).toMatch(/does not show a percentage/i);
  });

  it("shows a percentage only when today is a completed day", () => {
    const completeToday: HqMetricWindow = {
      label: "Today",
      start_at: "2026-09-23T00:00:00+02:00",
      end_at: "2026-09-24T00:00:00+02:00",
    };
    const trend = heroDayTrend(available(1), available(5), completeToday);
    expect(trend?.kind).toBe("percent");
    expect(trend?.change).toBe(-80);
    expect(trend?.label).toBe("↓ 80%");
  });
});
