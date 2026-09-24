/** Rolling windows accepted by `/hq/devices` and `/hq/notification_health`. */
export const OPERATIONAL_WINDOWS = ["24h", "7d", "30d"] as const;
export type OperationalWindow = (typeof OPERATIONAL_WINDOWS)[number];

export const UNSUPPORTED_OPERATIONAL_WINDOW =
  "This calendar range has no rolling-window equivalent (24h / 7d / 30d). HQ will not substitute another window.";

/**
 * Map Command Centre toolbar calendar ranges onto rolling device/notification
 * windows. `yesterday` and `last_90d` have no equivalent on those endpoints —
 * return null so callers do not silently substitute a different window.
 *
 * `today → 24h` is a rolling approximation of the current day, not Johannesburg
 * calendar midnight. Panels must label the `window` returned by the API.
 */
export function operationalWindow(timeRange: string): OperationalWindow | null {
  if (timeRange === "today") return "24h";
  if (timeRange === "last_7d") return "7d";
  if (timeRange === "last_30d") return "30d";
  return null;
}
