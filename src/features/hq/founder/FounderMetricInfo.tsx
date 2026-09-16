import { useId, useState } from "react";
import type { HqMetricValue } from "../../../lib/hq/types.ts";
import { FounderIcon } from "./founderIcons.tsx";

export function FounderMetricInfo({
  metric,
  label,
  windowLabel,
}: {
  metric: HqMetricValue;
  label: string;
  windowLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const popoverId = useId();

  return (
    <span className="founder-metric-info">
      <button
        type="button"
        className="founder-metric-info__trigger"
        aria-expanded={open}
        aria-controls={popoverId}
        aria-label={`Definition for ${label}`}
        onClick={() => setOpen((value) => !value)}
      >
        <FounderIcon name="info" size={14} />
      </button>
      {open ? (
        <span id={popoverId} role="tooltip" className="founder-metric-info__popover">
          <span className="founder-metric-info__title">{label}</span>
          <span className="founder-metric-info__definition">{metric.definition}</span>
          {windowLabel ? (
            <span className="founder-metric-info__meta">
              <span>Window</span>
              <strong>{windowLabel}</strong>
            </span>
          ) : null}
          {metric.limitations.length > 0 ? (
            <ul className="founder-metric-info__limitations">
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

export function FounderMetricValue({
  presentation,
  className,
  large,
}: {
  presentation: { status: string; text: string };
  className?: string;
  large?: boolean;
}) {
  const classes = [
    "founder-metric-value",
    large ? "founder-metric-value--large" : "",
    presentation.status === "unavailable" ? "founder-metric-value--unavailable" : "",
    presentation.status === "insufficient_data" ? "founder-metric-value--insufficient" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} data-status={presentation.status}>
      {presentation.text}
    </span>
  );
}
