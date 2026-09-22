import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchRealmeQueue, hqErrorMessage, moderateRealmeVerification } from "../../../lib/hq/api.ts";
import { canModerateRealmeVerifications } from "../../../lib/hq/enforcementAccess.ts";
import type { HqRealmeDecision, HqRealmeQueueEntry } from "../../../lib/hq/types.ts";
import { MetricCard, StateBanner, StatusBadge } from "../components/HqPrimitives.tsx";
import { requestHqAttentionRefresh } from "../HqAttentionContext.tsx";
import { useHqOperator } from "../useHqOperator.ts";

const CHECK_TYPE_LABEL: Record<HqRealmeQueueEntry["check_type"], string> = {
  selfie: "Selfie",
  video: "Liveness video",
  government_id: "Government ID",
};

function formatWhen(value: string | null | undefined): string {
  if (!value) return "—";
  return value.replace("T", " ").replace(/\.\d+Z$/, "Z");
}

function label(value: string | null | undefined): string {
  return value ? value.replace(/_/g, " ").replace(/\b\w/g, (match: string) => match.toUpperCase()) : "—";
}

export default function RealmeModerationPage() {
  const { operator } = useHqOperator();
  const canModerate = canModerateRealmeVerifications(operator);
  const [load, setLoad] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState<string>();
  const [entries, setEntries] = useState<HqRealmeQueueEntry[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ url: string; alt: string; caption?: string }[] | null>(null);

  const loadQueue = useCallback(() => {
    setLoad("loading");
    void fetchRealmeQueue()
      .then((queue) => {
        setEntries(queue.assertions);
        setSelectedId((current) => current && queue.assertions.some((entry) => entry.id === current) ? current : queue.assertions[0]?.id ?? null);
        setLoad("ready");
      })
      .catch((caught) => {
        setMessage(hqErrorMessage(caught));
        setLoad("error");
      });
  }, []);

  useEffect(() => {
    if (canModerate) void Promise.resolve().then(() => loadQueue());
  }, [canModerate, loadQueue]);

  const selected = useMemo(() => entries.find((entry) => entry.id === selectedId) ?? entries[0] ?? null, [entries, selectedId]);
  const context = selected?.review_context ?? null;
  const memberName = context?.member.display_name ?? ([context?.member.first_name, context?.member.last_name].filter(Boolean).join(" ") || "Member");
  const approvedPhotoForCompare = context?.profile_photos.find((photo) => photo.url) ?? null;

  const decide = useCallback((entry: HqRealmeQueueEntry, decision: HqRealmeDecision) => {
    let note: string | undefined;
    if (decision === "rejected") {
      const reason = window.prompt("Reason required for rejection:", "The evidence does not clearly match the member profile.");
      if (reason === null || !reason.trim()) return;
      note = reason.trim();
    } else if (decision === "resubmission_requested") {
      const reason = window.prompt("Why is a new submission needed?", "Please submit clearer, current evidence.");
      if (reason === null || !reason.trim()) return;
      note = reason.trim();
    }
    setPendingId(entry.id);
    setActionError(null);
    void moderateRealmeVerification(entry.id, decision, note)
      .then(() => {
        setEntries((prev) => {
          const next = prev.filter((item) => item.id !== entry.id);
          setSelectedId(next[0]?.id ?? null);
          return next;
        });
        requestHqAttentionRefresh();
      })
      .catch((caught) => setActionError(hqErrorMessage(caught)))
      .finally(() => setPendingId(null));
  }, []);

  if (!operator) return null;
  if (!canModerate) {
    return <div className="hq-content"><StateBanner tone="forbidden" title="RealMe moderation not enabled" body="Your operator role does not include admin.realme_verifications.moderate. Backend authorization is authoritative." /></div>;
  }

  return (
    <div className="hq-content hq-content--stack hq-page-realme-moderation">
      <MetricCard title="RealMe review workspace" action={<StatusBadge tone="accent">{entries.length} pending</StatusBadge>}>
        <p className="hq-card__subtitle">Oldest pending submissions first. Compare the submitted evidence with the member&apos;s approved profile photos before making a decision.</p>
        {actionError ? <StateBanner tone="error" title="Action failed" body={actionError} /> : null}
        {load === "loading" ? <p className="hq-card__subtitle">Loading queue…</p> : null}
        {load === "error" ? <StateBanner tone="error" title="Could not load queue" body={message ?? "Try again."} /> : null}
        {load === "ready" && entries.length === 0 ? <div className="hq-realme-empty"><strong>All caught up</strong><span>There are no RealMe submissions waiting for review.</span></div> : null}
        {selected ? (
          <div className="hq-realme-workspace">
            <aside className="hq-realme-queue" aria-label="Pending RealMe submissions">
              <div className="hq-realme-queue__heading">Pending queue</div>
              {entries.map((entry) => {
                const member = entry.review_context?.member;
                const active = entry.id === selected.id;
                return <button type="button" key={entry.id} className={`hq-realme-queue__item${active ? " is-active" : ""}`} onClick={() => setSelectedId(entry.id)}>
                  <span className="hq-realme-queue__avatar">{(member?.display_name ?? member?.first_name ?? "M").slice(0, 1).toUpperCase()}</span>
                  <span><strong>{member?.display_name ?? member?.first_name ?? `Member ${entry.user_id}`}</strong><small>{CHECK_TYPE_LABEL[entry.check_type]} · {formatWhen(entry.submitted_at)}</small></span>
                </button>;
              })}
            </aside>
            <div className="hq-realme-review">
              <div className="hq-realme-review__columns">
                <section className="hq-realme-panel">
                  <div className="hq-realme-panel__title"><span>Member profile</span><StatusBadge tone="neutral">{context?.member.brand ?? "Current brand"}</StatusBadge></div>
                  {context ? <>
                    <div className="hq-realme-member-head"><div className="hq-realme-member-avatar">{(context.member.display_name ?? context.member.first_name ?? "M").slice(0, 1).toUpperCase()}</div><div><h3>{context.member.display_name ?? ([context.member.first_name, context.member.last_name].filter(Boolean).join(" ") || "Member")}</h3><p>{[context.member.age ? `${context.member.age} years` : null, context.member.gender, context.member.location].filter(Boolean).join(" · ") || "Profile context unavailable"}</p></div></div>
                    <dl className="hq-realme-facts">
                      <div><dt>Member ID</dt><dd>{context.member.public_id ?? context.member.user_id}</dd></div>
                      <div><dt>Account</dt><dd>{label(context.member.account_status)} · {label(context.member.membership_status)}</dd></div>
                      <div><dt>Joined</dt><dd>{formatWhen(context.member.joined_at)}</dd></div>
                      <div><dt>Last active</dt><dd>{formatWhen(context.member.last_active_at)}</dd></div>
                      <div><dt>Profile</dt><dd>{context.member.profile_completeness == null ? "—" : `${context.member.profile_completeness}% complete`} · {label(context.member.profile_status)}</dd></div>
                      <div><dt>Email verified</dt><dd>{context.member.email_verified == null ? "—" : context.member.email_verified ? "Yes" : "No"}</dd></div>
                      <div><dt>Trust Score</dt><dd>{context.member.trust_score ?? "—"}</dd></div>
                    </dl>
                    <div className="hq-realme-section-title">Approved profile photos</div>
                    <div className="hq-realme-photo-grid">{context.profile_photos.length ? context.profile_photos.map((photo) => photo.url ? <button type="button" key={photo.id} onClick={() => setLightbox([{ url: photo.url!, alt: "Approved profile photo", caption: memberName }])}><img src={photo.url} alt="Approved profile" /></button> : null) : <span className="hq-card__subtitle">No approved profile photos available.</span>}</div>
                    <p className="hq-realme-hint">Click any photo to enlarge.</p>
                    {context.member_360_lookup ? <Link className="hq-inline-link" to={`/hq/members/${encodeURIComponent(context.member_360_lookup)}`}>Open Member 360 →</Link> : null}
                  </> : <p className="hq-card__subtitle">Member context is unavailable for this submission. The signed evidence remains available for review.</p>}
                </section>
                <section className="hq-realme-panel hq-realme-panel--evidence">
                  <div className="hq-realme-panel__title"><span>{CHECK_TYPE_LABEL[selected.check_type]}</span><StatusBadge tone="warning">Pending review</StatusBadge></div>
                  <div className="hq-realme-evidence">{(context?.evidence ?? selected.evidence) ? (selected.check_type === "video" ? <video src={(context?.evidence ?? selected.evidence)!.url} controls playsInline /> : <button type="button" onClick={() => setLightbox([{ url: (context?.evidence ?? selected.evidence)!.url, alt: "Submitted RealMe evidence", caption: "Submitted evidence" }])}><img src={(context?.evidence ?? selected.evidence)!.url} alt="Submitted RealMe evidence" /></button>) : <span>No evidence attached</span>}</div>
                  {selected.check_type !== "video" && (context?.evidence ?? selected.evidence) ? <p className="hq-realme-hint">Click evidence to enlarge.</p> : null}
                  {selected.check_type !== "video" && (context?.evidence ?? selected.evidence) && approvedPhotoForCompare ? (
                    <button
                      type="button"
                      className="hq-btn"
                      style={{ marginBottom: 14 }}
                      onClick={() => setLightbox([
                        { url: (context?.evidence ?? selected.evidence)!.url, alt: "Submitted RealMe evidence", caption: "Submitted evidence" },
                        { url: approvedPhotoForCompare!.url!, alt: "Approved profile photo", caption: `Approved photo — ${memberName}` },
                      ])}
                    >
                      Compare side by side
                    </button>
                  ) : null}
                  <dl className="hq-realme-facts"><div><dt>Submitted</dt><dd>{formatWhen(selected.submitted_at)}</dd></div><div><dt>Method</dt><dd>{CHECK_TYPE_LABEL[selected.check_type]}</dd></div><div><dt>Previous attempts</dt><dd>{Math.max((context?.history.length ?? 1) - 1, 0)}</dd></div></dl>
                  <div className="hq-realme-actions"><button type="button" className="hq-btn hq-btn--danger" disabled={pendingId === selected.id} onClick={() => decide(selected, "rejected")}>Reject</button><button type="button" className="hq-btn" disabled={pendingId === selected.id} onClick={() => decide(selected, "resubmission_requested")}>Needs further review</button><button type="button" className="hq-btn hq-btn--primary" disabled={pendingId === selected.id} onClick={() => decide(selected, "approved")}>Approve</button></div>
                </section>
              </div>
              {context?.history.length ? <section className="hq-realme-history"><div className="hq-realme-section-title">Verification history</div>{context.history.map((item) => <div className="hq-realme-history__row" key={item.id}><strong>{formatWhen(item.submitted_at)}</strong><span>{CHECK_TYPE_LABEL[item.check_type]}</span><StatusBadge tone={item.status === "approved" ? "success" : item.status === "pending" ? "warning" : "neutral"}>{label(item.status)}</StatusBadge>{item.review_note ? <small>{item.review_note}</small> : null}</div>)}</section> : null}
            </div>
          </div>
        ) : null}
      </MetricCard>
      {lightbox ? (
        <div className="hq-lightbox" role="dialog" aria-label="Enlarged evidence" onClick={() => setLightbox(null)}>
          <div className="hq-lightbox__row" onClick={(event) => event.stopPropagation()}>
            {lightbox.map((item, index) => (
              <figure key={index} className="hq-lightbox__figure">
                <img src={item.url} alt={item.alt} />
                {item.caption ? <figcaption>{item.caption}</figcaption> : null}
              </figure>
            ))}
          </div>
          <button type="button" className="hq-lightbox__close" aria-label="Close" onClick={() => setLightbox(null)}>×</button>
        </div>
      ) : null}
    </div>
  );
}
