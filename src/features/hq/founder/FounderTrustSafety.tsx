import { Link } from "react-router-dom";
import type { HqCommandCentreHealth } from "../../../lib/hq/types.ts";
import { presentMetric } from "../commandCentreMetric.ts";
import { FounderMetricInfo, FounderMetricValue } from "./FounderMetricInfo.tsx";

const PRIMARY_ROWS = [
  { key: "open", label: "Open reports", pick: (h: HqCommandCentreHealth) => h.trust_safety.open_reports },
  {
    key: "awaiting",
    label: "Awaiting decision",
    pick: (h: HqCommandCentreHealth) => h.trust_safety.awaiting_decision,
  },
  {
    key: "photos",
    label: "Pending photos",
    pick: (h: HqCommandCentreHealth) => h.trust_safety.pending_photo_reviews,
  },
  {
    key: "enforcements",
    label: "Enforcements",
    pick: (h: HqCommandCentreHealth) => h.trust_safety.active_enforcements,
  },
] as const;

export function FounderTrustSafety({ health }: { health: HqCommandCentreHealth }) {
  const oldest = presentMetric(health.trust_safety.oldest_open_report_age_seconds);
  const calm =
    PRIMARY_ROWS.every((row) => {
      const presentation = presentMetric(row.pick(health));
      return presentation.status !== "available" || presentation.numeric === 0;
    }) && health.attention_signals.every((signal) => signal.severity !== "warning");

  return (
    <section className="founder-panel founder-panel--trust" aria-labelledby="founder-trust-title">
      <header className="founder-panel__header founder-panel__header--compact">
        <h2 id="founder-trust-title" className="founder-panel__title">
          Trust &amp; Safety
        </h2>
        <Link className="founder-link-arrow" to="/hq/trust-safety">
          View all
        </Link>
      </header>

      <ul className="founder-trust-list">
        {PRIMARY_ROWS.map((row) => {
          const metric = row.pick(health);
          const presentation = presentMetric(metric);
          return (
            <li key={row.key} className="founder-trust-list__row">
              <span className="founder-trust-list__label">
                {row.label}
                <FounderMetricInfo metric={metric} label={row.label} />
              </span>
              <FounderMetricValue presentation={presentation} />
            </li>
          );
        })}
      </ul>

      <div className="founder-trust-oldest">
        <span className="founder-trust-list__label">
          Oldest unresolved
          <FounderMetricInfo
            metric={health.trust_safety.oldest_open_report_age_seconds}
            label="Oldest unresolved report"
          />
        </span>
        <FounderMetricValue presentation={oldest} />
      </div>

      {calm ? <p className="founder-trust-calm">Everything looks calm</p> : null}
    </section>
  );
}
