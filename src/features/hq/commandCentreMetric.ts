import type { HqMetricValue } from "../../lib/hq/types.ts";
import { formatMetricAvailableValue } from "./commandCentreFormat.ts";

export type MetricPresentation = {
  status: HqMetricValue["status"];
  text: string;
  numeric: number | null;
  record: Record<string, number> | null;
};

export function presentMetric(metric: HqMetricValue): MetricPresentation {
  if (metric.status === "unavailable") {
    return { status: "unavailable", text: "Unavailable", numeric: null, record: null };
  }
  if (metric.status === "insufficient_data") {
    return {
      status: "insufficient_data",
      text: "Not enough data yet",
      numeric: null,
      record: null,
    };
  }
  const numeric = typeof metric.value === "number" ? metric.value : null;
  const record =
    typeof metric.value === "object" && metric.value !== null ? metric.value : null;
  return {
    status: "available",
    text: formatMetricAvailableValue(metric),
    numeric,
    record,
  };
}

export function metricWindowValue(
  windowed: Record<string, HqMetricValue> | undefined,
  key: string,
): HqMetricValue | undefined {
  return windowed?.[key];
}

export function formatWhenShort(value: string | null | undefined): string {
  if (!value) return "—";
  return value.replace("T", " ").replace(/\.\d+Z$/, "Z");
}

export function founderGreeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function formatAttentionValue(signal: { value: number; unit: string }): string {
  if (signal.unit === "seconds") {
    const days = Math.floor(signal.value / 86400);
    if (days >= 1) return `${days} day${days === 1 ? "" : "s"}`;
    const hours = Math.floor(signal.value / 3600);
    if (hours >= 1) return `${hours} hour${hours === 1 ? "" : "s"}`;
    return `${Math.floor(signal.value / 60)} minutes`;
  }
  return String(signal.value);
}
