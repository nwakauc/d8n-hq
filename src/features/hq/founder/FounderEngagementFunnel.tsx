import type { HqProductFunnel } from "../../../lib/hq/types.ts";
import { FounderIcon, type FounderIconName } from "./founderIcons.tsx";

function stageLabel(id: string): string {
  return id.replace(/_/g, " ").replace(/\b\w/g, (character: string) => character.toUpperCase());
}

function percentage(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(0)}%`;
}

function stageIcon(id: string): FounderIconName {
  if (id === "registered") return "user-plus";
  if (id === "onboarding_completed") return "clipboard-check";
  if (id === "profile_published") return "badge-check";
  if (id.includes("like")) return "heart";
  if (id.includes("match")) return "heart-handshake";
  if (id.includes("conversation")) return "message-circle";
  return "activity";
}

export function FounderEngagementFunnel({
  funnel,
  error,
}: {
  funnel: HqProductFunnel | null;
  error: string | null;
}) {
  return (
    <section className="founder-panel founder-funnel" aria-labelledby="engagement-funnel-title">
      <div className="founder-panel__heading">
        <div>
          <h2 id="engagement-funnel-title" className="founder-panel__title">Engagement funnel</h2>
          <p className="founder-panel__subtitle">
            Registration → onboarding → publication → discovery → interaction → conversation → return.
          </p>
        </div>
        {funnel ? <span className="founder-today__scope">{funnel.brand} · {funnel.window}</span> : null}
      </div>
      {error ? (
        <p className="founder-panel__error">{error}</p>
      ) : !funnel ? (
        <p className="founder-panel__subtitle">Loading evidence-backed funnel stages…</p>
      ) : (
        <div className="founder-funnel__stages">
          {funnel.stages.map((stage) => (
            <div className="founder-funnel__stage" key={stage.id} data-status={stage.status}>
              <div className="founder-funnel__name">
                <strong><FounderIcon name={stageIcon(stage.id)} size={15} />{stageLabel(stage.id)}</strong>
                <span>{stage.definition}</span>
              </div>
              <div className="founder-funnel__bar" aria-hidden="true">
                <span style={{ width: `${Math.max(0, Math.min(100, (stage.conversion_from_registration ?? 0) * 100))}%` }} />
              </div>
              <strong className="founder-funnel__value">
                {stage.status === "available" ? (stage.value ?? 0).toLocaleString("en-ZA") : "Unavailable"}
              </strong>
              <span className="founder-funnel__conversion">{percentage(stage.conversion_from_registration)} of registrations</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
