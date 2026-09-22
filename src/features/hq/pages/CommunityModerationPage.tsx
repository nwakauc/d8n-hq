import { useCallback, useEffect, useState } from "react";
import { fetchCommunityQueue, hqErrorMessage, moderateCommunitySubmission } from "../../../lib/hq/api.ts";
import { canModerateCommunity } from "../../../lib/hq/enforcementAccess.ts";
import type { HqCommunitySubmission, HqCommunityType } from "../../../lib/hq/types.ts";
import { MetricCard, StateBanner, StatusBadge } from "../components/HqPrimitives.tsx";
import { useHqOperator } from "../useHqOperator.ts";

const TABS: { type: HqCommunityType; label: string }[] = [
  { type: "questions", label: "Ask9ja questions" },
  { type: "answers", label: "Ask9ja answers" },
  { type: "events", label: "Events" },
  { type: "stories", label: "Stories" },
  { type: "circles", label: "Circles" },
];

function formatWhen(value: string): string {
  return value.replace("T", " ").replace(/\.\d+Z$/, "Z");
}

function textField(content: Record<string, unknown>, key: string): string | null {
  const value = content[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function submittedById(content: Record<string, unknown>): string | null {
  const submittedBy = content.submitted_by;
  if (typeof submittedBy !== "object" || submittedBy === null) return null;
  const id = (submittedBy as Record<string, unknown>).id;
  return typeof id === "string" ? id : null;
}

function SubmissionCard({
  submission,
  onDecide,
  pending,
}: {
  submission: HqCommunitySubmission;
  onDecide: (id: string, status: "approved" | "rejected") => void;
  pending: boolean;
}) {
  const title = textField(submission.content, "title") ?? textField(submission.content, "name");
  const body = textField(submission.content, "body") ?? textField(submission.content, "description");
  const profileId = submittedById(submission.content);

  return (
    <div className="hq-card" style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {title ? <strong>{title}</strong> : <span className="hq-card__subtitle">Untitled submission</span>}
        <span className="hq-card__subtitle">{formatWhen(submission.submitted_at)}</span>
      </div>
      {body ? <p style={{ whiteSpace: "pre-wrap" }}>{body}</p> : null}
      <span className="hq-card__subtitle">
        Submitted by {profileId ? `profile ${profileId.slice(0, 8)}` : "an unknown profile"}
      </span>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          className="hq-btn hq-btn--danger"
          disabled={pending}
          onClick={() => onDecide(submission.id, "rejected")}
        >
          Reject
        </button>
        <button
          type="button"
          className="hq-btn hq-btn--primary"
          disabled={pending}
          onClick={() => onDecide(submission.id, "approved")}
        >
          Approve
        </button>
      </div>
    </div>
  );
}

export default function CommunityModerationPage() {
  const { operator } = useHqOperator();
  const canModerate = canModerateCommunity(operator);
  const [tab, setTab] = useState<HqCommunityType>("questions");
  const [load, setLoad] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState<string>();
  const [submissions, setSubmissions] = useState<HqCommunitySubmission[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!canModerate) return;
    let cancelled = false;
    setLoad("loading");
    void fetchCommunityQueue(tab)
      .then((queue) => {
        if (cancelled) return;
        setSubmissions(queue);
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
  }, [canModerate, tab]);

  const decide = useCallback(
    (id: string, status: "approved" | "rejected") => {
      setPendingId(id);
      setActionError(null);
      void moderateCommunitySubmission(tab, id, status)
        .then(() => {
          setSubmissions((prev) => prev.filter((entry) => entry.id !== id));
        })
        .catch((caught) => {
          setActionError(hqErrorMessage(caught));
        })
        .finally(() => {
          setPendingId(null);
        });
    },
    [tab],
  );

  if (!operator) return null;

  if (!canModerate) {
    return (
      <div className="hq-content">
        <StateBanner
          tone="forbidden"
          title="Community moderation not enabled"
          body="Your operator role does not include admin.community.moderate. Backend authorization is authoritative — ask an admin if you need this access."
        />
      </div>
    );
  }

  return (
    <div className="hq-content hq-content--stack hq-page-community-moderation">
      <MetricCard
        title="Community moderation queue"
        action={<StatusBadge tone="accent">{submissions.length} pending</StatusBadge>}
      >
        <p className="hq-card__subtitle" style={{ marginBottom: 12 }}>
          Pending date9ja Community submissions, oldest first. Approve or reject — decisions apply
          immediately and are audited. Live Circle posts/comments are moderated from their report, not here.
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {TABS.map((entry) => (
            <button
              key={entry.type}
              type="button"
              className={`hq-btn${tab === entry.type ? " hq-btn--primary" : ""}`}
              onClick={() => setTab(entry.type)}
            >
              {entry.label}
            </button>
          ))}
        </div>

        {actionError ? <StateBanner tone="error" title="Action failed" body={actionError} /> : null}

        {load === "loading" ? (
          <p className="hq-card__subtitle">Loading queue…</p>
        ) : load === "error" ? (
          <StateBanner tone="error" title="Could not load queue" body={message ?? "Try again."} />
        ) : submissions.length === 0 ? (
          <p className="hq-card__subtitle">Nothing pending review right now.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
            {submissions.map((submission) => (
              <SubmissionCard
                key={submission.id}
                submission={submission}
                onDecide={decide}
                pending={pendingId === submission.id}
              />
            ))}
          </div>
        )}
      </MetricCard>
    </div>
  );
}
