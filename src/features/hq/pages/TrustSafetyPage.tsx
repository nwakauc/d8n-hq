import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError } from "../../../lib/api/errors.ts";
import {
  fetchAdminReports,
  fetchRepeatOffenders,
  fetchTrustSafetyEnforcements,
  fetchTrustSafetyOverview,
  hqErrorMessage,
} from "../../../lib/hq/api.ts";
import type {
  HqAdminReport,
  HqAdminEnforcement,
  HqRepeatOffenderList,
  HqReportStatus,
  HqTrustSafetyOverview,
} from "../../../lib/hq/types.ts";
import { HqHistoryPanel } from "../components/HqHistoryPanel.tsx";
import {
  DataTable,
  EmptyState,
  MetricCard,
  StateBanner,
  StatGroup,
  StatusBadge,
  UnavailableState,
} from "../components/HqPrimitives.tsx";

const TABS = ["overview", "queue", "offenders", "enforcements"] as const;
type Tab = (typeof TABS)[number];

const QUEUE_STATUSES: Array<{ value: "" | HqReportStatus; label: string }> = [
  { value: "", label: "All" },
  { value: "open", label: "Open" },
  { value: "reviewing", label: "Reviewing" },
  { value: "actioned", label: "Actioned" },
  { value: "dismissed", label: "Dismissed" },
];

const ENFORCEMENT_STATES = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "reverted", label: "Reverted" },
] as const;

function parseTab(raw: string | null): Tab {
  if (raw && (TABS as readonly string[]).includes(raw)) {
    return raw as Tab;
  }
  return "overview";
}

function formatWhen(value: string | null | undefined): string {
  if (!value) return "—";
  return value.replace("T", " ").replace(/\.\d+Z$/, "Z");
}

function formatAgeSeconds(seconds: number | null): string {
  if (seconds === null) return "—";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function humanizeKey(key: string): string {
  return key.replace(/_/g, " ");
}

function countMapRows(map: Record<string, number>): Array<Record<string, ReactNode>> {
  return Object.entries(map).map(([key, value]) => ({
    key: humanizeKey(key),
    count: value,
  }));
}

type OverviewResult =
  | { status: "ready"; data: HqTrustSafetyOverview }
  | { status: "forbidden"; message: string }
  | { status: "error"; message: string };

type OffendersResult =
  | { status: "ready"; data: HqRepeatOffenderList }
  | { status: "forbidden"; message: string }
  | { status: "error"; message: string };

type EnforcementResult =
  | { status: "ready"; rows: HqAdminEnforcement[]; next_cursor: string | null }
  | { status: "forbidden"; message: string; rows: HqAdminEnforcement[]; next_cursor: string | null }
  | { status: "error"; message: string; rows: HqAdminEnforcement[]; next_cursor: string | null }
  | { status: "validation"; message: string; rows: HqAdminEnforcement[]; next_cursor: string | null };

function OverviewPanel({
  load,
  onRetry,
}: {
  load: { status: "loading" } | OverviewResult;
  onRetry: () => void;
}) {
  if (load.status === "loading") {
    return <p className="hq-loading">Loading Trust &amp; Safety overview…</p>;
  }
  if (load.status === "forbidden") {
    return <StateBanner tone="forbidden" title="Forbidden" body={load.message} />;
  }
  if (load.status === "error") {
    return (
      <div>
        <StateBanner tone="error" title="Could not load overview" body={load.message} />
        <button type="button" className="hq-btn hq-btn--ghost" style={{ marginTop: 10 }} onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  }

  const { data } = load;
  const reports = data.reports;
  const slaNotConfigured = reports.sla_status === "not_configured";

  return (
    <div className="hq-ts-stack">
      <div className="hq-ts-metrics">
        <MetricCard title="Reports">
          <StatGroup
            items={[
              { label: "Total", value: reports.total },
              { label: "Awaiting decision", value: reports.awaiting_decision },
              { label: "Oldest open", value: formatWhen(reports.oldest_open_report_at) },
              { label: "Oldest open age", value: formatAgeSeconds(reports.oldest_open_report_age_seconds) },
            ]}
          />
        </MetricCard>
        <MetricCard
          title="SLA"
          action={
            slaNotConfigured ? <StatusBadge tone="warning">SLA NOT CONFIGURED</StatusBadge> : undefined
          }
        >
          {slaNotConfigured || reports.overdue === null ? (
            <UnavailableState
              badge="NOT CONFIGURED"
              title="No Trust & Safety SLA"
              body="Overdue counts stay unavailable until an approved SLA threshold exists. HQ will not invent overdue numbers."
            />
          ) : (
            <StatGroup items={[{ label: "Overdue", value: reports.overdue }]} />
          )}
        </MetricCard>
        <MetricCard title="Enforcements">
          <StatGroup
            items={[
              { label: "Total", value: data.enforcements.total },
              { label: "Active", value: data.enforcements.active },
            ]}
          />
        </MetricCard>
      </div>

      <div className="hq-grid-3">
        <MetricCard title="By status">
          <DataTable
            columns={[
              { key: "key", header: "Status" },
              { key: "count", header: "Count" },
            ]}
            rows={countMapRows(reports.by_status)}
            empty="No status counts."
          />
        </MetricCard>
        <MetricCard title="By reason">
          <DataTable
            columns={[
              { key: "key", header: "Reason" },
              { key: "count", header: "Count" },
            ]}
            rows={countMapRows(reports.by_reason)}
            empty="No reason counts."
          />
        </MetricCard>
        <MetricCard title="By target type">
          <DataTable
            columns={[
              { key: "key", header: "Target" },
              { key: "count", header: "Count" },
            ]}
            rows={countMapRows(reports.by_target_type)}
            empty="No target counts."
          />
        </MetricCard>
      </div>

      <p className="hq-card__subtitle">
        Brand {data.brand} · Generated {formatWhen(data.generated_at)}
      </p>
    </div>
  );
}

function QueuePanel({ statusFilter }: { statusFilter: "" | HqReportStatus }) {
  const loadPage = useCallback(
    async (cursor: string | null) => {
      const page = await fetchAdminReports({
        status: statusFilter || null,
        cursor,
        limit: 25,
      });
      return { rows: page.reports, next_cursor: page.next_cursor };
    },
    [statusFilter],
  );

  const mapRow = useCallback((row: HqAdminReport) => {
    const reported = row.reported;
    return {
      id: (
        <Link className="hq-inline-link" to={`/hq/trust-safety/reports/${row.id}`}>
          #{row.id}
        </Link>
      ),
      status: <StatusBadge tone={row.status === "open" || row.status === "reviewing" ? "warning" : "neutral"}>{row.status}</StatusBadge>,
      reason: humanizeKey(row.reason),
      target: humanizeKey(row.target_type),
      reported: reported ? reported.display_name ?? reported.id : "—",
      created: formatWhen(row.created_at),
    };
  }, []);

  return (
    <HqHistoryPanel
      key={statusFilter || "all"}
      loadPage={loadPage}
      columns={[
        { key: "id", header: "Report" },
        { key: "status", header: "Status" },
        { key: "reason", header: "Reason" },
        { key: "target", header: "Target" },
        { key: "reported", header: "Reported" },
        { key: "created", header: "Created" },
      ]}
      mapRow={mapRow}
      emptyLabel="No reports in this queue filter."
      endLabel="End of queue for this filter."
    />
  );
}

function OffendersPanel({
  load,
  onRetry,
}: {
  load: { status: "loading" } | OffendersResult;
  onRetry: () => void;
}) {
  if (load.status === "loading") {
    return <p className="hq-loading">Loading repeat offenders…</p>;
  }
  if (load.status === "forbidden") {
    return <StateBanner tone="forbidden" title="Forbidden" body={load.message} />;
  }
  if (load.status === "error") {
    return (
      <div>
        <StateBanner tone="error" title="Could not load repeat offenders" body={load.message} />
        <button type="button" className="hq-btn hq-btn--ghost" style={{ marginTop: 10 }} onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  }

  const { data } = load;
  return (
    <div className="hq-ts-stack">
      <div className="hq-state-banner" role="status">
        <h2>Triage signal only</h2>
        <p>
          Profiles with at least {data.minimum_reports} received reports. This list never suspends or
          resolves a report by itself — investigate before acting.
        </p>
      </div>
      {data.truncated ? (
        <p className="hq-ts-truncated" role="status">
          Results are truncated — more qualifying profiles exist beyond this page.
        </p>
      ) : null}
      {data.repeat_offenders.length === 0 ? (
        <EmptyState
          badge="NO DATA"
          title="No repeat offenders"
          body="No profile on this brand has received two or more reports yet."
        />
      ) : (
        <DataTable
          columns={[
            { key: "name", header: "Profile" },
            { key: "reports", header: "Reports" },
            { key: "awaiting", header: "Awaiting" },
            { key: "latest", header: "Latest report" },
            { key: "member", header: "Member 360" },
          ]}
          rows={data.repeat_offenders.map((row) => ({
            name: row.display_name ?? row.profile_id,
            reports: row.report_count,
            awaiting: row.awaiting_decision_count,
            latest: formatWhen(row.latest_report_at),
            member: row.member_360_lookup ? (
              <Link className="hq-inline-link" to={`/hq/members/${encodeURIComponent(row.member_360_lookup)}`}>
                Open
              </Link>
            ) : (
              <span className="hq-text-muted">Unavailable</span>
            ),
          }))}
        />
      )}
    </div>
  );
}

function EnforcementsPanel({
  stateFilter,
}: {
  stateFilter: "all" | "active" | "reverted";
}) {
  const [load, setLoad] = useState<{ key: string; result: EnforcementResult | null }>({
    key: "",
    result: null,
  });
  const [pendingMore, setPendingMore] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const requestKey = `${stateFilter}:${retryNonce}`;

  useEffect(() => {
    let cancelled = false;
    const key = requestKey;
    void fetchTrustSafetyEnforcements({
      state: stateFilter === "all" ? null : stateFilter,
      cursor: null,
      limit: 25,
    })
      .then((page) => {
        if (cancelled) return;
        setLoad({
          key,
          result: { status: "ready", rows: page.enforcements, next_cursor: page.next_cursor },
        });
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        const message = hqErrorMessage(caught);
        if (caught instanceof ApiError && caught.status === 403) {
          setLoad({
            key,
            result: { status: "forbidden", message, rows: [], next_cursor: null },
          });
          return;
        }
        if (caught instanceof ApiError && caught.status === 422) {
          setLoad({
            key,
            result: { status: "validation", message, rows: [], next_cursor: null },
          });
          return;
        }
        setLoad({
          key,
          result: { status: "error", message, rows: [], next_cursor: null },
        });
      });
    return () => {
      cancelled = true;
    };
  }, [requestKey, stateFilter]);

  const resolved: { status: "loading" } | EnforcementResult =
    load.key === requestKey && load.result !== null
      ? load.result
      : { status: "loading" };

  const loadMore = useCallback(async () => {
    const current = load.key === requestKey ? load.result : null;
    if (!current || current.status !== "ready" || !current.next_cursor || pendingMore) {
      return;
    }
    setPendingMore(true);
    try {
      const page = await fetchTrustSafetyEnforcements({
        state: stateFilter === "all" ? null : stateFilter,
        cursor: current.next_cursor,
        limit: 25,
      });
      setLoad({
        key: requestKey,
        result: {
          status: "ready",
          rows: [...current.rows, ...page.enforcements],
          next_cursor: page.next_cursor,
        },
      });
    } catch (caught) {
      const message = hqErrorMessage(caught);
      // invalid_cursor: show validation error; do not silently reset cursor/filter
      if (caught instanceof ApiError && caught.status === 422) {
        setLoad({
          key: requestKey,
          result: {
            status: "validation",
            message,
            rows: current.rows,
            next_cursor: current.next_cursor,
          },
        });
      } else {
        setLoad({
          key: requestKey,
          result: {
            status: "error",
            message,
            rows: current.rows,
            next_cursor: current.next_cursor,
          },
        });
      }
    } finally {
      setPendingMore(false);
    }
  }, [load, pendingMore, requestKey, stateFilter]);

  if (resolved.status === "loading") {
    return <p className="hq-loading">Loading enforcement history…</p>;
  }

  if (resolved.status === "forbidden") {
    return <StateBanner tone="forbidden" title="Forbidden" body={resolved.message} />;
  }

  if ((resolved.status === "error" || resolved.status === "validation") && resolved.rows.length === 0) {
    return (
      <div>
        <StateBanner
          tone="error"
          title={resolved.status === "validation" ? "Invalid request" : "Could not load enforcements"}
          body={resolved.message}
        />
        <button
          type="button"
          className="hq-btn hq-btn--ghost"
          style={{ marginTop: 10 }}
          onClick={() => setRetryNonce((n) => n + 1)}
        >
          Start from first page
        </button>
      </div>
    );
  }

  return (
    <div>
      <DataTable
        columns={[
          { key: "id", header: "ID" },
          { key: "kind", header: "Kind" },
          { key: "state", header: "State" },
          { key: "profile", header: "Profile" },
          { key: "reason", header: "Reason" },
          { key: "report", header: "Report" },
          { key: "created", header: "Created" },
          { key: "member", header: "Member 360" },
        ]}
        rows={resolved.rows.map((row) => ({
          id: row.id,
          kind: row.kind,
          state: (
            <StatusBadge tone={row.state === "active" ? "danger" : "neutral"}>{row.state}</StatusBadge>
          ),
          profile: row.profile_id ?? "—",
          reason: row.reason ?? "—",
          report: row.report_id ? (
            <Link className="hq-inline-link" to={`/hq/trust-safety/reports/${row.report_id}`}>
              #{row.report_id}
            </Link>
          ) : (
            "—"
          ),
          created: formatWhen(row.created_at),
          member: row.profile_id ? (
            <Link className="hq-inline-link" to={`/hq/members/${encodeURIComponent(row.profile_id)}`}>
              Open
            </Link>
          ) : (
            "—"
          ),
        }))}
        empty="No enforcements for this filter."
      />
      {resolved.status === "ready" && resolved.next_cursor ? (
        <button
          type="button"
          className="hq-btn hq-btn--ghost"
          style={{ marginTop: 10 }}
          disabled={pendingMore}
          onClick={() => void loadMore()}
        >
          {pendingMore ? "Loading…" : "Load more"}
        </button>
      ) : null}
      {(resolved.status === "error" || resolved.status === "validation") && resolved.rows.length > 0 ? (
        <StateBanner
          tone="error"
          title={resolved.status === "validation" ? "Invalid cursor" : "Could not load more"}
          body={resolved.message}
        />
      ) : null}
    </div>
  );
}

export default function TrustSafetyPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = parseTab(searchParams.get("tab"));
  const statusFilter = (searchParams.get("status") ?? "") as "" | HqReportStatus;
  const stateFilterRaw = searchParams.get("state") ?? "all";
  const stateFilter =
    stateFilterRaw === "active" || stateFilterRaw === "reverted" ? stateFilterRaw : "all";

  const [overviewNonce, setOverviewNonce] = useState(0);
  const [overview, setOverview] = useState<{ key: number; result: OverviewResult | null }>({
    key: 0,
    result: null,
  });
  const [offendersNonce, setOffendersNonce] = useState(0);
  const [offenders, setOffenders] = useState<{ key: number; result: OffendersResult | null }>({
    key: -1,
    result: null,
  });

  useEffect(() => {
    let cancelled = false;
    const key = overviewNonce;
    void fetchTrustSafetyOverview()
      .then((data) => {
        if (!cancelled) setOverview({ key, result: { status: "ready", data } });
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        const message = hqErrorMessage(caught);
        if (caught instanceof ApiError && caught.status === 403) {
          setOverview({ key, result: { status: "forbidden", message } });
          return;
        }
        setOverview({ key, result: { status: "error", message } });
      });
    return () => {
      cancelled = true;
    };
  }, [overviewNonce]);

  useEffect(() => {
    if (tab !== "offenders") return;
    let cancelled = false;
    const key = offendersNonce;
    void fetchRepeatOffenders(25)
      .then((data) => {
        if (!cancelled) setOffenders({ key, result: { status: "ready", data } });
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        const message = hqErrorMessage(caught);
        if (caught instanceof ApiError && caught.status === 403) {
          setOffenders({ key, result: { status: "forbidden", message } });
          return;
        }
        setOffenders({ key, result: { status: "error", message } });
      });
    return () => {
      cancelled = true;
    };
  }, [tab, offendersNonce]);

  const overviewLoad: { status: "loading" } | OverviewResult =
    overview.key !== overviewNonce || overview.result === null
      ? { status: "loading" }
      : overview.result;

  const offendersLoad: { status: "loading" } | OffendersResult =
    offenders.key !== offendersNonce || offenders.result === null
      ? { status: "loading" }
      : offenders.result;

  function setTab(next: Tab) {
    const params = new URLSearchParams(searchParams);
    if (next === "overview") {
      params.delete("tab");
    } else {
      params.set("tab", next);
    }
    setSearchParams(params, { replace: true });
  }

  function setStatus(next: "" | HqReportStatus) {
    const params = new URLSearchParams(searchParams);
    params.set("tab", "queue");
    if (!next) {
      params.delete("status");
    } else {
      params.set("status", next);
    }
    setSearchParams(params, { replace: true });
  }

  function setEnforcementState(next: "all" | "active" | "reverted") {
    const params = new URLSearchParams(searchParams);
    params.set("tab", "enforcements");
    if (next === "all") {
      params.delete("state");
    } else {
      params.set("state", next);
    }
    setSearchParams(params, { replace: true });
  }

  return (
    <div className="hq-content hq-page-trust-safety">
      <div className="hq-tabs" role="tablist" aria-label="Trust and Safety sections">
        {(
          [
            ["overview", "Overview"],
            ["queue", "Queue"],
            ["offenders", "Repeat offenders"],
            ["enforcements", "Enforcements"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`hq-tab${tab === id ? " hq-tab--active" : ""}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <OverviewPanel load={overviewLoad} onRetry={() => setOverviewNonce((n) => n + 1)} />
      ) : null}

      {tab === "queue" ? (
        <div className="hq-ts-stack">
          <div className="hq-filter-bar" role="group" aria-label="Report status filter">
            {QUEUE_STATUSES.map((option) => (
              <button
                key={option.label}
                type="button"
                className={`hq-chip${statusFilter === option.value ? " hq-chip--active" : ""}`}
                aria-pressed={statusFilter === option.value}
                onClick={() => setStatus(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <QueuePanel statusFilter={statusFilter === "open" || statusFilter === "reviewing" || statusFilter === "actioned" || statusFilter === "dismissed" ? statusFilter : ""} />
        </div>
      ) : null}

      {tab === "offenders" ? (
        <OffendersPanel load={offendersLoad} onRetry={() => setOffendersNonce((n) => n + 1)} />
      ) : null}

      {tab === "enforcements" ? (
        <div className="hq-ts-stack">
          <div className="hq-filter-bar" role="group" aria-label="Enforcement state filter">
            {ENFORCEMENT_STATES.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`hq-chip${stateFilter === option.value ? " hq-chip--active" : ""}`}
                aria-pressed={stateFilter === option.value}
                onClick={() => setEnforcementState(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <EnforcementsPanel key={stateFilter} stateFilter={stateFilter} />
        </div>
      ) : null}
    </div>
  );
}
