import type { HqCommandCentreHealth } from "../../../lib/hq/types.ts";
import { presentMetric } from "../commandCentreMetric.ts";
import { FounderPulseGroupedBarChart } from "./charts/FounderCharts.tsx";
import { FounderMetricInfo } from "./FounderMetricInfo.tsx";

const PULSE_WINDOWS = [
  { key: "today", label: "Today" },
  { key: "last_7d", label: "7 days" },
  { key: "last_30d", label: "30 days" },
] as const;

const PULSE_METRICS = [
  {
    key: "active",
    title: "Active users",
    color: "#2563eb",
    dataKey: "active" as const,
    pick: (health: HqCommandCentreHealth, windowKey: string) =>
      health.activity.active_users[windowKey],
  },
  {
    key: "new",
    title: "New members",
    color: "#16a34a",
    dataKey: "newMembers" as const,
    pick: (health: HqCommandCentreHealth, windowKey: string) =>
      health.audience.memberships_new[windowKey],
  },
  {
    key: "matches",
    title: "Matches",
    color: "#e11d48",
    dataKey: "matches" as const,
    pick: (health: HqCommandCentreHealth, windowKey: string) =>
      health.marketplace.matches_created[windowKey],
  },
] as const;

export function FounderCompanyPulse({ health }: { health: HqCommandCentreHealth }) {
  const chartRows = PULSE_WINDOWS.map((window) => {
    const active = presentMetric(PULSE_METRICS[0].pick(health, window.key));
    const newMembers = presentMetric(PULSE_METRICS[1].pick(health, window.key));
    const matches = presentMetric(PULSE_METRICS[2].pick(health, window.key));

    return {
      window: health.windows[window.key]?.label ?? window.label,
      active: active.numeric ?? 0,
      newMembers: newMembers.numeric ?? 0,
      matches: matches.numeric ?? 0,
    };
  });

  return (
    <section className="founder-panel founder-panel--pulse" aria-labelledby="founder-pulse-title">
      <header className="founder-panel__header founder-panel__header--compact">
        <div>
          <h2 id="founder-pulse-title" className="founder-panel__title">
            Company pulse
          </h2>
          <p className="founder-panel__subtitle">
            Aggregate windows — not a historical time series.
          </p>
        </div>
        <FounderMetricInfo
          metric={PULSE_METRICS[0].pick(health, "today")}
          label="Company pulse"
          windowLabel={health.windows.today?.label}
        />
      </header>

      <div className="founder-pulse-layout">
        <FounderPulseGroupedBarChart
          rows={chartRows}
          ariaLabel="Active users, new members, and matches grouped by snapshot window"
        />
        <ul className="founder-pulse-legend">
          {PULSE_METRICS.map((metric) => (
            <li key={metric.key} className="founder-pulse-legend__group">
              <span className="founder-pulse-legend__title">
                <span
                  className="founder-pulse-legend__dot"
                  style={{ background: metric.color }}
                  aria-hidden="true"
                />
                {metric.title}
              </span>
              <dl className="founder-pulse-legend__values">
                {PULSE_WINDOWS.map((window) => {
                  const metricValue = metric.pick(health, window.key);
                  const presentation = presentMetric(metricValue);
                  return (
                    <div key={window.key}>
                      <dt>{health.windows[window.key]?.label ?? window.label}</dt>
                      <dd>{presentation.text}</dd>
                    </div>
                  );
                })}
              </dl>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
