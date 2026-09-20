import type { HqAnalyticsRange } from "./analyticsTypes.ts";
import { HQ_ANALYTICS_RANGES } from "./analyticsTypes.ts";

/**
 * Period only — brand is chosen once, in the header brand switcher, which
 * pins your session (and therefore almost every metric here) to one brand.
 * There is no second "All Brands" scope for this control to offer: only
 * Daily Registrations and Brand Comparison are genuinely cross-brand, and
 * they always show every brand the operator can see, with nothing to pick.
 */
export function AnalyticsToolbar({
  range,
  onRangeChange,
}: {
  range: HqAnalyticsRange;
  onRangeChange: (range: HqAnalyticsRange) => void;
}) {
  return (
    <label className="hq-analytics-toolbar hq-analytics-toolbar--period" aria-label="Command Centre period">
      <span>Date range</span>
      <select value={range} onChange={(event) => onRangeChange(event.target.value as HqAnalyticsRange)}>
        {HQ_ANALYTICS_RANGES.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
