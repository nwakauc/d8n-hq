import { useEffect, useState } from "react";
import { fetchHqNotificationDeliveries, hqErrorMessage } from "../../../lib/hq/api.ts";
import type { HqNotificationDeliveriesResponse } from "../../../lib/hq/types.ts";
import {
  DataTable,
  EmptyState,
  MetricCard,
  PageToolbar,
  StateBanner,
  StatusBadge,
} from "../components/HqPrimitives.tsx";
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
        if (!cancelled) {
          setError(null);
          setData(next);
        }
      })
      .catch((reason) => {
        if (!cancelled) setError(hqErrorMessage(reason));
      });
    return () => {
      cancelled = true;
    };
  }, [window]);

  return (
    <div className="hq-content hq-content--stack notification-deliveries-page">
      <PageToolbar>
        <label className="hq-page-toolbar__field">
          Rolling window
          <select
            value={window}
            onChange={(event) => {
              setError(null);
              setWindow(event.target.value);
            }}
          >
            {WINDOWS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </PageToolbar>

      {error ? <StateBanner tone="error" title="Could not load deliveries" body={error} /> : null}

      <MetricCard
        title="Notification delivery logs"
        action={<StatusBadge tone="accent">Brand scope</StatusBadge>}
      >
        <p className="hq-card__subtitle" style={{ marginBottom: 12 }}>
          Provider acceptance and failure evidence for the signed-in brand. Delivery receipts remain
          separate until provider webhooks are captured.
        </p>
        {!error && !data ? <p className="hq-card__subtitle">Loading delivery telemetry…</p> : null}
        {data && data.deliveries.length === 0 ? (
          <EmptyState
            badge="NO DATA"
            title="No deliveries in this window"
            body="No notification delivery records were recorded in this rolling window."
          />
        ) : null}
        {data && data.deliveries.length > 0 ? (
          <DataTable
            columns={[
              { key: "time", header: "Time" },
              { key: "channel", header: "Channel" },
              { key: "provider", header: "Provider" },
              { key: "type", header: "Type" },
              { key: "status", header: "Status" },
              { key: "attempts", header: "Attempts" },
              { key: "latency", header: "Latency" },
              { key: "failure", header: "Failure" },
            ]}
            rows={data.deliveries.map((delivery) => ({
              time: (
                <span title={delivery.created_at}>{formatRelativeTime(delivery.created_at)}</span>
              ),
              channel: delivery.channel,
              provider: delivery.provider,
              type: delivery.notification_type ?? "—",
              status: (
                <span className={`notification-delivery-status notification-delivery-status--${delivery.status}`}>
                  {delivery.status}
                </span>
              ),
              attempts: delivery.attempt_count,
              latency: delivery.latency_ms === null ? "—" : `${delivery.latency_ms}ms`,
              failure: delivery.failure_reason ?? "—",
            }))}
          />
        ) : null}
      </MetricCard>
    </div>
  );
}
