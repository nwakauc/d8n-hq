import { useEffect, useState } from "react";
import { fetchHqOperatorSessions, hqErrorMessage, revokeHqOperatorSession } from "../../../lib/hq/api.ts";
import type { HqOperatorSession } from "../../../lib/hq/types.ts";
import {
  DataTable,
  EmptyState,
  MetricCard,
  PageToolbar,
  StateBanner,
  StatusBadge,
} from "../components/HqPrimitives.tsx";

export default function OperatorSecurityPage() {
  const [sessions, setSessions] = useState<HqOperatorSession[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void fetchHqOperatorSessions()
      .then((next) => {
        if (cancelled) return;
        setSessions(next);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setError(hqErrorMessage(caught));
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  return (
    <div className="hq-content hq-content--stack hq-page-security">
      <PageToolbar>
        <button type="button" className="hq-btn hq-btn--ghost" onClick={() => setReloadToken((value) => value + 1)}>
          Refresh
        </button>
      </PageToolbar>
      {error ? <StateBanner tone="error" title="Could not load sessions" body={error} /> : null}
      <MetricCard
        title="Active HQ sessions"
        action={<StatusBadge tone="accent">This operator</StatusBadge>}
      >
        {sessions === null && !error ? (
          <p className="hq-card__subtitle">Loading sessions…</p>
        ) : sessions && sessions.length === 0 ? (
          <EmptyState
            badge="NO DATA"
            title="No sessions returned"
            body="The sessions endpoint did not return any active HQ sessions."
          />
        ) : sessions ? (
          <DataTable
            columns={[
              { key: "device", header: "Device" },
              { key: "ip", header: "IP" },
              { key: "lastUsed", header: "Last used" },
              { key: "expires", header: "Expires" },
              { key: "action", header: "Action" },
            ]}
            rows={sessions.map((session) => ({
              device: `${session.device_name ?? session.user_agent ?? "Unknown"}${session.current ? " · current" : ""}`,
              ip: session.ip_address ?? "—",
              lastUsed: session.last_used_at,
              expires: session.expires_at,
              action: session.current ? (
                "—"
              ) : (
                <button
                  type="button"
                  className="hq-btn hq-btn--ghost hq-btn--sm"
                  onClick={() => {
                    void revokeHqOperatorSession(session.id).then(() => setReloadToken((value) => value + 1));
                  }}
                >
                  Revoke
                </button>
              ),
            }))}
            empty="No sessions."
          />
        ) : null}
      </MetricCard>
    </div>
  );
}
