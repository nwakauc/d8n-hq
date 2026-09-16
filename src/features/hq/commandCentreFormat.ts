import type { HqMetricValue } from "../../lib/hq/types.ts";

function formatCount(value: number): string {
  return value.toLocaleString("en-ZA");
}

function formatRatio(value: number, numerator?: number, denominator?: number): string {
  const percent = (value * 100).toFixed(1);
  if (numerator !== undefined && denominator !== undefined) {
    return `${percent}% (${formatCount(numerator)}/${formatCount(denominator)})`;
  }
  return `${percent}%`;
}

function formatSeconds(value: number): string {
  if (value < 60) return `${value}s`;
  if (value < 3600) return `${Math.floor(value / 60)}m`;
  if (value < 86400) return `${Math.floor(value / 3600)}h`;
  return `${Math.floor(value / 86400)}d`;
}

export function formatMetricAvailableValue(metric: HqMetricValue): string {
  if (typeof metric.value === "number") {
    if (metric.unit === "ratio") {
      return formatRatio(metric.value, metric.numerator, metric.denominator);
    }
    if (metric.unit === "seconds") {
      return formatSeconds(metric.value);
    }
    return formatCount(metric.value);
  }
  if (typeof metric.value === "object" && metric.value !== null) {
    return Object.entries(metric.value)
      .map(([key, count]) => `${key}: ${formatCount(count as number)}`)
      .join(" · ");
  }
  return "—";
}
