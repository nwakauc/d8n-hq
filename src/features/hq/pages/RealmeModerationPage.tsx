import { useCallback, useEffect, useState } from "react";
import { fetchRealmeQueue, hqErrorMessage, moderateRealmeVerification } from "../../../lib/hq/api.ts";
import { canModerateRealmeVerifications } from "../../../lib/hq/enforcementAccess.ts";
import type { HqRealmeDecision, HqRealmeQueueEntry } from "../../../lib/hq/types.ts";
import { MetricCard, StateBanner, StatusBadge } from "../components/HqPrimitives.tsx";
import { useHqOperator } from "../useHqOperator.ts";

function formatWhen(value: string | null): string {
  if (!value) return "—";
  return value.replace("T", " ").replace(/\.\d+Z$/, "Z");
}

const CHECK_TYPE_LABEL: Record<HqRealmeQueueEntry["check_type"], string> = {
  selfie: "Selfie",
  video: "Liveness video",
  government_id: "Government ID",
};

function EvidenceCard({
  entry,
  onDecide,
  pending,
}: {
  entry: HqRealmeQueueEntry;
  onDecide: (id: number, decision: HqRealmeDecision) => void;
  pending: boolean;
}) {
  const isVideo = entry.check_type === "video";
  return (
    <div className="hq-card" style={{ display: "grid", gap: 10 }}>
      <div style={{ aspectRatio: "1", borderRadius: 8, overflow: "hidden", background: "rgba(0,0,0,0.06)" }}>
        {entry.evidence ? (
          isVideo ? (
            <video
              src={entry.evidence.url}
              controls
              playsInline
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <img
              src={entry.evidence.url}
              alt="Submitted evidence"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )
        ) : (
          <div style={{ display: "grid", placeItems: "center", height: "100%" }}>
            <span className="hq-card__subtitle">No evidence attached</span>
          </div>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <StatusBadge tone="accent">{CHECK_TYPE_LABEL[entry.check_type]}</StatusBadge>
        <span className="hq-card__subtitle">{formatWhen(entry.submitted_at)}</span>
      </div>
      <span className="hq-card__subtitle">User {entry.user_id}</span>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          className="hq-btn hq-btn--danger"
          disabled={pending}
          onClick={() => onDecide(entry.id, "rejected")}
        >
          Reject
        </button>
        <button
          type="button"
          className="hq-btn"
          disabled={pending}
          onClick={() => onDecide(entry.id, "resubmission_requested")}
        >
          Request resubmission
        </button>
        <button
          type="button"
          className="hq-btn hq-btn--primary"
          disabled={pending}
          onClick={() => onDecide(entry.id, "approved")}
        >
          Approve
        </button>
      </div>
    </div>
  );
}

export default function RealmeModerationPage() {
  const { operator } = useHqOperator();
  const canModerate = canModerateRealmeVerifications(operator);
  const [load, setLoad] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState<string>();
  const [entries, setEntries] = useState<HqRealmeQueueEntry[]>([]);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!canModerate) return;
    let cancelled = false;
    void fetchRealmeQueue()
      .then((queue) => {
        if (cancelled) return;
        setEntries(queue.assertions);
        setLoad("ready");
      })
      .catch((caught) => {
        if (cancelled) return;
        setMessage(hqErrorMessage(caught));
        setLoad("error");
      });
    return () => {
      cancelled = true;
    };
  }, [canModerate]);

  const decide = useCallback((id: number, decision: HqRealmeDecision) => {
    setPendingId(id);
    setActionError(null);
    void moderateRealmeVerification(id, decision)
      .then(() => {
        setEntries((prev) => prev.filter((entry) => entry.id !== id));
      })
      .catch((caught) => {
        setActionError(hqErrorMessage(caught));
      })
      .finally(() => {
        setPendingId(null);
      });
  }, []);

  if (!operator) return null;

  if (!canModerate) {
    return (
      <div className="hq-content">
        <StateBanner
          tone="forbidden"
          title="RealMe moderation not enabled"
          body="Your operator role does not include admin.realme_verifications.moderate. Backend authorization is authoritative — ask an admin if you need this access."
        />
      </div>
    );
  }

  return (
    <div className="hq-content hq-content--stack hq-page-realme-moderation">
      <MetricCard
        title="RealMe verification queue"
        action={<StatusBadge tone="accent">{entries.length} pending</StatusBadge>}
      >
        <p className="hq-card__subtitle" style={{ marginBottom: 12 }}>
          Selfie, liveness video, and government-ID submissions awaiting manual review, oldest first.
          Approving awards the member&apos;s trust score automatically.
        </p>

        {actionError ? <StateBanner tone="error" title="Action failed" body={actionError} /> : null}

        {load === "loading" ? (
          <p className="hq-card__subtitle">Loading queue…</p>
        ) : load === "error" ? (
          <StateBanner tone="error" title="Could not load queue" body={message ?? "Try again."} />
        ) : entries.length === 0 ? (
          <p className="hq-card__subtitle">Nothing pending review right now.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
            {entries.map((entry) => (
              <EvidenceCard key={entry.id} entry={entry} onDecide={decide} pending={pendingId === entry.id} />
            ))}
          </div>
        )}
      </MetricCard>
    </div>
  );
}
