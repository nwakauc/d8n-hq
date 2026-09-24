import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchHqDatabaseBackups, hqErrorMessage, triggerHqDatabaseBackup } from "../../../lib/hq/api.ts";
import type { HqDatabaseBackup, HqDatabaseBackupsResponse } from "../../../lib/hq/types.ts";
import { operatorHasCapability } from "../../../lib/hq/capabilities.ts";
import { useHqOperator } from "../useHqOperator.ts";
import { FounderIcon, FounderIconBadge } from "../founder/founderIcons.tsx";
import "../founder/founder.css";

function formatTime(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function statusText(status: HqDatabaseBackupsResponse["status"]): string {
  return {
    available: "On schedule",
    stale: "Stale",
    partial: "Partial coverage",
    not_configured: "Not configured",
    error: "Unavailable",
  }[status];
}

function backupRows(data: HqDatabaseBackupsResponse): Array<Record<string, string>> {
  return data.recent.map((backup: HqDatabaseBackup) => ({
    database: backup.database === "primary" ? "Primary" : "Queue",
    schedule: backup.brand,
    uploaded: formatTime(backup.uploaded_at),
    size: backup.size_bytes ? `${Math.round(backup.size_bytes / 1024 / 1024)} MB` : "—",
    checksum: backup.checksum ? `${backup.checksum.slice(0, 12)}…` : "—",
  }));
}

export default function DatabaseBackupsPage() {
  const { operator } = useHqOperator();
  const canManage = operatorHasCapability(operator, "hq.backups.manage");
  const [data, setData] = useState<HqDatabaseBackupsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await fetchHqDatabaseBackups());
    } catch (nextError) {
      setError(hqErrorMessage(nextError));
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function runBackup() {
    if (!window.confirm("Run primary and queue database backups now?")) return;
    setRunning(true);
    setError(null);
    try {
      setData(await triggerHqDatabaseBackup());
    } catch (nextError) {
      setError(hqErrorMessage(nextError));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="hq-content hq-content--stack founder-overview database-backups-page">
      <div className="hq-page-toolbar">
        {canManage ? (
          <button type="button" className="hq-btn hq-btn--primary" onClick={() => void runBackup()} disabled={running}>
            {running ? "Running…" : "Run backup now"}
          </button>
        ) : null}
        <button type="button" className="hq-btn hq-btn--ghost" onClick={() => void load()}>
          Refresh
        </button>
      </div>

      {error ? <div className="founder-banner"><strong>Backup request failed.</strong> {error}</div> : null}

      {data ? (
        <>
          <section className="founder-dashboard__row database-backups-page__summary">
            <div className="founder-panel founder-reference-panel">
              <header className="founder-panel__heading"><div><h2 className="founder-panel__title">Recovery status</h2><p className="founder-panel__subtitle">Nightly/strategic schedule state from the backup bucket.</p></div><FounderIconBadge name="database" tone={data.status === "available" ? "green" : "amber"} /></header>
              <div className={`database-backups-page__status database-backups-page__status--${data.status}`}><FounderIcon name={data.status === "available" ? "badge-check" : "info"} size={17} /><strong>{statusText(data.status)}</strong></div>
              <p className="founder-reference-empty founder-reference-empty--note">{data.message ?? "Both primary and queue databases have recent recovery points."}</p>
            </div>
            <div className="founder-panel founder-reference-panel">
              <header className="founder-panel__heading"><div><h2 className="founder-panel__title">Latest recovery points</h2><p className="founder-panel__subtitle">Shared across Date9ja, DateZA and HookUs.</p></div><FounderIconBadge name="calendar-days" tone="blue" /></header>
              <dl className="database-backups-page__latest"><div><dt>Primary database</dt><dd>{formatTime(data.latest.primary?.uploaded_at ?? null)}</dd></div><div><dt>Queue database</dt><dd>{formatTime(data.latest.queue?.uploaded_at ?? null)}</dd></div></dl>
              <p className="founder-reference-empty founder-reference-empty--note">Last successful pair: {formatTime(data.last_successful_at)}</p>
            </div>
          </section>

          <section className="founder-panel founder-reference-panel database-backups-page__history">
            <header className="founder-panel__heading"><div><h2 className="founder-panel__title">Recent backups</h2><p className="founder-panel__subtitle">Retention: {data.retention_count ?? "—"} copies per database and schedule.</p></div></header>
            {data.recent.length ? <div className="database-backups-table"><div className="database-backups-table__row database-backups-table__head"><span>Database</span><span>Schedule</span><span>Uploaded</span><span>Size</span><span>SHA-256</span></div>{backupRows(data).map((row, index) => <div className="database-backups-table__row" key={`${row.database}-${row.schedule}-${row.uploaded}-${index}`}><span>{row.database}</span><span>{row.schedule}</span><span>{row.uploaded}</span><span>{row.size}</span><code>{row.checksum}</code></div>)}</div> : <p className="founder-reference-empty founder-reference-empty--large">No backup objects have been recorded yet.</p>}
          </section>

          <section className="founder-panel founder-reference-panel database-backups-page__restore"><h2 className="founder-panel__title">Restore safety</h2><p>HQ does not restore over a live database. Use <code>script/operations/postgres_restore_drill</code> to restore into a newly-created disposable database, verify it, and promote only through the normal operational change process.</p><Link className="founder-link-arrow" to="/hq">Back to Command Centre</Link></section>
        </>
      ) : <section className="founder-panel"><p>{error ?? "Loading backup status…"}</p></section>}
    </div>
  );
}
