import { useState } from "react";
import { Link } from "react-router-dom";
import { triggerHqDatabaseBackup, hqErrorMessage } from "../../../lib/hq/api.ts";
import type { HqDatabaseBackup, HqDatabaseBackupsResponse } from "../../../lib/hq/types.ts";
import { FounderIcon, FounderIconBadge } from "../founder/founderIcons.tsx";

function formatBackupTime(value: string | null): string {
  if (!value) return "No successful backup recorded";
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function backupStatus(data: HqDatabaseBackupsResponse | null): { label: string; tone: string } {
  if (!data) return { label: "Loading", tone: "muted" };
  if (data.status === "available") return { label: "On schedule", tone: "good" };
  if (data.status === "not_configured") return { label: "Not configured", tone: "warn" };
  if (data.status === "stale") return { label: "Stale", tone: "warn" };
  if (data.status === "partial") return { label: "Partial", tone: "warn" };
  return { label: "Unavailable", tone: "bad" };
}

function latestLabel(backup: HqDatabaseBackup | null): string {
  return backup ? `${formatBackupTime(backup.uploaded_at)} · ${backup.brand}` : "—";
}

export function DatabaseBackupCard({
  data,
  error,
  canManage,
}: {
  data: HqDatabaseBackupsResponse | null;
  error: string | null;
  canManage: boolean;
}) {
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [queuedMessage, setQueuedMessage] = useState<string | null>(null);
  const current = data;
  const status = backupStatus(current);

  async function runBackup() {
    if (!window.confirm("Run a primary and queue database backup now?")) return;
    setRunning(true);
    setRunError(null);
    setQueuedMessage(null);
    try {
      const queued = await triggerHqDatabaseBackup();
      setQueuedMessage(queued.message);
    } catch (nextError) {
      setRunError(hqErrorMessage(nextError));
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="founder-panel founder-reference-panel founder-backup-card" aria-label="Database backups">
      <header className="founder-panel__heading">
        <div>
          <h2 className="founder-panel__title">Database backups</h2>
          <p className="founder-panel__subtitle">Primary + queue recovery points.</p>
        </div>
        <FounderIconBadge name="database" tone={status.tone === "good" ? "green" : "amber"} />
      </header>
      {error || runError ? <p className="founder-panel__error">{runError ?? error}</p> : null}
      <div className={`founder-backup-card__status founder-backup-card__status--${status.tone}`}>
        <FounderIcon name={status.tone === "good" ? "badge-check" : "info"} size={15} />
        <strong>{status.label}</strong>
      </div>
      <dl className="founder-backup-card__rows">
        <div><dt>Primary</dt><dd>{latestLabel(current?.latest.primary ?? null)}</dd></div>
        <div><dt>Queue</dt><dd>{latestLabel(current?.latest.queue ?? null)}</dd></div>
      </dl>
      {queuedMessage ? <p className="founder-reference-empty founder-reference-empty--note">{queuedMessage}</p> : null}
      {!queuedMessage && current?.message ? (
        <p className="founder-reference-empty founder-reference-empty--note">{current.message}</p>
      ) : null}
      <div className="founder-backup-card__actions">
        {canManage ? (
          <button type="button" className="founder-refresh" onClick={() => void runBackup()} disabled={running}>
            {running ? "Running…" : "Run backup now"}
          </button>
        ) : null}
        <Link className="founder-link-arrow" to="/hq/database">Open backup history</Link>
      </div>
    </section>
  );
}
