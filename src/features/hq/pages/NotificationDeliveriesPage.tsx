import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchHqNotificationDeliveries, hqErrorMessage } from "../../../lib/hq/api.ts";
import type { HqNotificationDeliveriesResponse } from "../../../lib/hq/types.ts";
import { formatRelativeTime } from "../founder/formatRelativeTime.ts";

const WINDOWS = [
  ["1h", "Last hour"],
  ["24h", "Last 24 hours"],
  ["7d", "Last 7 days"],
  ["30d", "Last 30 days"],
] as const;

export default function NotificationDeliveriesPage() {
  const [window, setWindow] = useState("24h");
  const [data, setData] = useState<HqNotificationDeliveriesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchHqNotificationDeliveries(window)
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch((reason) => {
        if (!cancelled) setError(hqErrorMessage(reason));
      });
    return () => {
      cancelled = true;
    };
  }, [window]);

  return (
    <div className="hq-content notification-deliveries-page">
      <div className="notification-deliveries-page__intro">
        <Link to="/hq">← Command Centre</Link>
        <h1>Notification delivery logs</h1>
        <p>Provider acceptance and failure evidence for the active brand. Delivery receipts remain separate until provider webhooks are captured.</p>
        <label>
          Time range
          <select value={window} onChange={(event) => { setError(null); setWindow(event.target.value); }}>
            {WINDOWS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>

      {error ? <div className="hq-card hq-card--error">{error}</div> : null}
      {!error && !data ? <div className="hq-card">Loading delivery telemetry…</div> : null}
      {data ? (
        <div className="hq-card notification-deliveries-table-wrap">
          {data.deliveries.length === 0 ? <p>No notification delivery records were recorded in this window.</p> : (
            <table className="notification-deliveries-table">
              <thead><tr><th>Time</th><th>Channel</th><th>Provider</th><th>Type</th><th>Status</th><th>Attempts</th><th>Latency</th><th>Failure</th></tr></thead>
              <tbody>
                {data.deliveries.map((delivery) => (
                  <tr key={delivery.id}>
                    <td title={delivery.created_at}>{formatRelativeTime(delivery.created_at)}</td>
                    <td>{delivery.channel}</td>
                    <td>{delivery.provider}</td>
                    <td>{delivery.notification_type ?? "—"}</td>
                    <td><span className={`notification-delivery-status notification-delivery-status--${delivery.status}`}>{delivery.status}</span></td>
                    <td>{delivery.attempt_count}</td>
                    <td>{delivery.latency_ms === null ? "—" : `${delivery.latency_ms}ms`}</td>
                    <td>{delivery.failure_reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}
    </div>
  );
}
