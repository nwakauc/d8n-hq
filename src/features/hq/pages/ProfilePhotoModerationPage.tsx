import { useCallback, useEffect, useState } from "react";
import { fetchProfilePhotoQueue, hqErrorMessage, moderateProfilePhoto } from "../../../lib/hq/api.ts";
import { canModerateProfilePhotos } from "../../../lib/hq/enforcementAccess.ts";
import type { HqProfilePhotoQueueEntry } from "../../../lib/hq/types.ts";
import { MetricCard, StateBanner, StatusBadge } from "../components/HqPrimitives.tsx";
import { useHqOperator } from "../useHqOperator.ts";

function formatWhen(value: string): string {
  return value.replace("T", " ").replace(/\.\d+Z$/, "Z");
}

function PhotoCard({
  entry,
  onDecide,
  pending,
}: {
  entry: HqProfilePhotoQueueEntry;
  onDecide: (id: string, status: "approved" | "rejected") => void;
  pending: boolean;
}) {
  return (
    <div className="hq-card" style={{ display: "grid", gap: 10 }}>
      <div style={{ aspectRatio: "1", borderRadius: 8, overflow: "hidden", background: "rgba(0,0,0,0.06)" }}>
        {entry.image ? (
          <img
            src={entry.image.url}
            alt="Submitted profile"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ display: "grid", placeItems: "center", height: "100%" }}>
            <span className="hq-card__subtitle">No derivative yet</span>
          </div>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="hq-card__subtitle">Profile {entry.profile_id.slice(0, 8)}</span>
        <span className="hq-card__subtitle">{formatWhen(entry.created_at)}</span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
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

export default function ProfilePhotoModerationPage() {
  const { operator } = useHqOperator();
  const canModerate = canModerateProfilePhotos(operator);
  const [load, setLoad] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState<string>();
  const [entries, setEntries] = useState<HqProfilePhotoQueueEntry[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!canModerate) return;
    let cancelled = false;
    void fetchProfilePhotoQueue()
      .then((queue) => {
        if (cancelled) return;
        setEntries(queue.photos);
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

  const decide = useCallback((id: string, status: "approved" | "rejected") => {
    setPendingId(id);
    setActionError(null);
    void moderateProfilePhoto(id, status)
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
          title="Photo moderation not enabled"
          body="Your operator role does not include admin.profile_photos.moderate. Backend authorization is authoritative — ask an admin if you need this access."
        />
      </div>
    );
  }

  return (
    <div className="hq-content hq-content--stack hq-page-photo-moderation">
      <MetricCard
        title="Photo moderation queue"
        action={<StatusBadge tone="accent">{entries.length} pending</StatusBadge>}
      >
        <p className="hq-card__subtitle" style={{ marginBottom: 12 }}>
          Every kept, undecided photo for this brand, oldest first. Approve or reject — decisions apply
          immediately and are audited.
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
              <PhotoCard key={entry.id} entry={entry} onDecide={decide} pending={pendingId === entry.id} />
            ))}
          </div>
        )}
      </MetricCard>
    </div>
  );
}
