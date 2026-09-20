export type HqAnalyticsRange =
  | "today"
  | "yesterday"
  | "last_7d"
  | "last_30d"
  | "last_90d";

export const HQ_ANALYTICS_RANGES: ReadonlyArray<{
  value: HqAnalyticsRange;
  label: string;
}> = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7d", label: "7 days" },
  { value: "last_30d", label: "30 days" },
  { value: "last_90d", label: "90 days" },
];

export function memberCohortPath(date: string): string {
  const query = new URLSearchParams({ created_from: date, created_to: date });
  return `/hq/members?${query.toString()}`;
}

/** Members created within a health-snapshot window (e.g. `health.windows.today`). */
export function memberCreatedWindowPath(window: { start_at: string; end_at: string }): string {
  const query = new URLSearchParams({ created_from: window.start_at, created_to: window.end_at });
  return `/hq/members?${query.toString()}`;
}

/** Members last active within a health-snapshot window. */
export function memberActiveWindowPath(window: { start_at: string; end_at: string }): string {
  const query = new URLSearchParams({ last_active_from: window.start_at, last_active_to: window.end_at });
  return `/hq/members?${query.toString()}`;
}
