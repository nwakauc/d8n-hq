import type { HqCommandCentreBrandsResponse, HqCommandCentreHealth } from "../../../lib/hq/types.ts";
import { presentMetric } from "../commandCentreMetric.ts";

type ComparisonMetric = {
  id: string;
  label: string;
  pick: (health: HqCommandCentreHealth) => ReturnType<typeof presentMetric>;
};

const METRICS: ComparisonMetric[] = [
  {
    id: "members",
    label: "Members",
    pick: (health) => presentMetric(health.audience.memberships_total),
  },
  {
    id: "new",
    label: "New today",
    pick: (health) => presentMetric(health.audience.memberships_new.today),
  },
  {
    id: "active",
    label: "Active today",
    pick: (health) => presentMetric(health.activity.active_users.today),
  },
  {
    id: "activation",
    label: "Activation",
    pick: (health) => presentMetric(health.profile_health.activation_ratio),
  },
  {
    id: "zero",
    label: "Zero-discovery (yesterday)",
    pick: (health) =>
      presentMetric(health.marketplace.zero_discovery_allocations.yesterday),
  },
  {
    id: "attention",
    label: "Attention signals",
    pick: (health) => ({
      status: "available" as const,
      text: String(health.attention_signals.length),
      numeric: health.attention_signals.length,
      record: null,
    }),
  },
];

/** The one genuinely cross-brand panel on the page (backed by an
 * admin_user-scoped service, not the current brand session) — every brand
 * you can see, side by side. A table is the actual comparison view here;
 * it used to also duplicate itself as a metric-picker bar chart and a
 * per-brand detail panel, which just repeated these same rows two more
 * ways without adding information. */
export function FounderBrandComparison({
  comparison,
}: {
  comparison: HqCommandCentreBrandsResponse;
}) {
  const brands = comparison.brands;

  if (brands.length < 2) {
    return null;
  }

  return (
    <section className="founder-panel" aria-labelledby="founder-brands-title">
      <header className="founder-panel__header">
        <div>
          <h2 id="founder-brands-title" className="founder-panel__title">
            Brand comparison
          </h2>
          <p className="founder-panel__subtitle">
            Only brands your role can read · {comparison.time_zone}
          </p>
        </div>
      </header>

      <div className="founder-brand-table-wrap">
        <table className="founder-brand-table">
          <thead>
            <tr>
              <th scope="col">Brand</th>
              {METRICS.map((metric) => (
                <th key={metric.id} scope="col">
                  {metric.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {brands.map((entry) => (
              <tr key={entry.brand}>
                <th scope="row">{entry.brand}</th>
                {METRICS.map((metric) => {
                  const presentation = metric.pick(entry.brand_health);
                  return <td key={metric.id}>{presentation.text}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
