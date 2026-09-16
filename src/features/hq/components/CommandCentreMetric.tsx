import { useId, useState, type ReactNode } from "react";
import type { HqMetricValue } from "../../../lib/hq/types.ts";
import { formatMetricAvailableValue } from "../commandCentreFormat.ts";

export function MetricDefinitionButton({ metric }: { metric: HqMetricValue }) {
  const [open, setOpen] = useState(false);
  const popoverId = useId();

  return (
    <span className="hq-metric-info">
      <button
        type="button"
        className="hq-metric-info__trigger"
        aria-expanded={open}
        aria-controls={popoverId}
        aria-label={`Definition for ${metric.metric_id}`}
        onClick={() => setOpen((value) => !value)}
      >
        i
      </button>
      {open ? (
        <span id={popoverId} role="tooltip" className="hq-metric-info__popover">
          <span className="hq-metric-info__definition">{metric.definition}</span>
          {metric.limitations.length > 0 ? (
            <ul className="hq-metric-info__limitations">
              {metric.limitations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}

export function MetricValueDisplay({
  metric,
  className,
}: {
  metric: HqMetricValue;
  className?: string;
}) {
  let content: ReactNode;
  let stateClass = "hq-metric-value";

  if (metric.status === "unavailable") {
    content = "Unavailable";
    stateClass += " hq-metric-value--unavailable";
  } else if (metric.status === "insufficient_data") {
    content = "Not enough data";
    stateClass += " hq-metric-value--insufficient";
  } else {
    content = formatMetricAvailableValue(metric);
    stateClass += " hq-metric-value--available";
  }

  return (
    <p className={[stateClass, className].filter(Boolean).join(" ")} data-status={metric.status}>
      {content}
    </p>
  );
}

export function CommandCentreStat({
  label,
  metric,
  windowLabel,
}: {
  label: string;
  metric: HqMetricValue;
  windowLabel?: string;
}) {
  return (
    <div className="hq-command-stat">
      <p className="hq-command-stat__label">
        {label}
        {windowLabel ? ` · ${windowLabel}` : null}
        <MetricDefinitionButton metric={metric} />
      </p>
      <MetricValueDisplay metric={metric} className="hq-command-stat__value" />
    </div>
  );
}
