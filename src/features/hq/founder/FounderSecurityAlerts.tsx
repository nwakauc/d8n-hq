import { Link } from "react-router-dom";
import type { HqSecurityAlertList, HqSecuritySeverity } from "../../../lib/hq/types.ts";
import { formatRelativeTime } from "./formatRelativeTime.ts";
import { FounderIcon } from "./founderIcons.tsx";
import { humanizeSecurityEvent } from "./securityEventLabels.ts";

function severityIcon(severity: HqSecuritySeverity): "alert-triangle" | "shield" {
  return severity === "warning" ? "alert-triangle" : "shield";
}

export function FounderSecurityAlerts({
  alerts,
  error,
}: {
  alerts: HqSecurityAlertList | null;
  error: string | null;
}) {
  if (error) {
    return (
      <section className="founder-panel founder-panel--compact" aria-labelledby="founder-alerts-title">
        <h2 id="founder-alerts-title" className="founder-panel__title">
          Security alerts
        </h2>
        <p className="founder-panel__error">{error}</p>
      </section>
    );
  }

  const rows = alerts?.alerts ?? [];

  return (
    <section className="founder-panel founder-panel--compact" aria-labelledby="founder-alerts-title">
      <header className="founder-panel__header founder-panel__header--compact">
        <h2 id="founder-alerts-title" className="founder-panel__title">
          Security alerts
        </h2>
        <Link className="founder-link-arrow" to="/hq/alerts">
          View all
        </Link>
      </header>
      {rows.length === 0 ? (
        <p className="founder-panel__subtitle">No recent security alerts on this brand.</p>
      ) : (
        <ul className="founder-alerts-list">
          {rows.slice(0, 5).map((row) => (
            <li key={`${row.event_type}-${row.created_at}`} className="founder-alerts-list__item">
              <span
                className={`founder-alerts-list__icon founder-alerts-list__icon--${row.severity}`}
                aria-hidden="true"
              >
                <FounderIcon name={severityIcon(row.severity)} size={16} />
              </span>
              <span className="founder-alerts-list__label" title={row.event_type}>
                {humanizeSecurityEvent(row.event_type)}
              </span>
              <time className="founder-alerts-list__when" dateTime={row.created_at}>
                {formatRelativeTime(row.created_at)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
