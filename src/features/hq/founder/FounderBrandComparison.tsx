import { useMemo, useState } from "react";
import type { HqCommandCentreBrandsResponse, HqCommandCentreHealth } from "../../../lib/hq/types.ts";
import { presentMetric } from "../commandCentreMetric.ts";
import { FounderHorizontalBars } from "./charts/FounderCharts.tsx";
import { FounderMetricValue } from "./FounderMetricInfo.tsx";

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

export function FounderBrandComparison({
  comparison,
}: {
  comparison: HqCommandCentreBrandsResponse;
}) {
  const brands = comparison.brands;
  const [metricId, setMetricId] = useState(METRICS[0]?.id ?? "members");
  const [selectedBrand, setSelectedBrand] = useState(brands[0]?.brand ?? "");

  const activeMetric = METRICS.find((metric) => metric.id === metricId) ?? METRICS[0];

  const barRows = useMemo(() => {
    if (!activeMetric) return [];
    const values = brands.map((entry) => {
      const presentation = activeMetric.pick(entry.brand_health);
      return presentation.numeric;
    });
    const max = Math.max(1, ...values.map((value) => value ?? 0));
    return brands.map((entry, index) => ({
      key: entry.brand,
      label: entry.brand,
      value: values[index] ?? null,
      max,
      tone:
        entry.brand === selectedBrand ? "var(--founder-accent-charcoal)" : "var(--founder-accent-blue)",
    }));
  }, [activeMetric, brands, selectedBrand]);

  if (brands.length < 2) {
    return null;
  }

  const selected = brands.find((entry) => entry.brand === selectedBrand) ?? brands[0];

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

      <div className="founder-brand-tabs" role="tablist" aria-label="Brands">
        {brands.map((entry) => (
          <button
            key={entry.brand}
            type="button"
            role="tab"
            aria-selected={entry.brand === selectedBrand}
            className="founder-brand-tabs__tab"
            onClick={() => setSelectedBrand(entry.brand)}
          >
            {entry.brand}
          </button>
        ))}
      </div>

      <div className="founder-brand-layout">
        <div className="founder-brand-visual">
          <label className="founder-brand-metric-select">
            <span>Compare</span>
            <select
              value={metricId}
              onChange={(event) => setMetricId(event.target.value)}
              aria-label="Comparison metric"
            >
              {METRICS.map((metric) => (
                <option key={metric.id} value={metric.id}>
                  {metric.label}
                </option>
              ))}
            </select>
          </label>
          <FounderHorizontalBars
            rows={barRows}
            ariaLabel={`${activeMetric?.label ?? "Metric"} comparison across brands`}
          />
        </div>

        {selected ? (
          <div className="founder-brand-detail" role="tabpanel">
            <h3>{selected.brand}</h3>
            <p className="founder-brand-detail__role">{selected.role}</p>
            <dl className="founder-brand-detail__metrics">
              {METRICS.map((metric) => {
                const presentation = metric.pick(selected.brand_health);
                return (
                  <div key={metric.id}>
                    <dt>{metric.label}</dt>
                    <dd>
                      <FounderMetricValue presentation={presentation} />
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        ) : null}
      </div>

      <details className="founder-brand-table-details">
        <summary>Detailed table</summary>
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
      </details>
    </section>
  );
}
