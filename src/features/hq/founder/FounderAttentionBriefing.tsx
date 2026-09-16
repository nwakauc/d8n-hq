import { Link } from "react-router-dom";
import type { HqAttentionSignal } from "../../../lib/hq/types.ts";
import { attentionSignalDrillDown } from "../commandCentreAttention.ts";
import { formatAttentionValue } from "../commandCentreMetric.ts";
import {
  presentFounderAttentionSignals,
  type FounderAttentionItem,
} from "./founderAttentionPresentation.ts";
import { FounderIcon, type FounderIconName } from "./founderIcons.tsx";

const FOUNDER_ACTION_LABELS: Record<string, string> = {
  old_unresolved_report: "Investigate",
  pending_photo_reviews: "Review photos",
  active_enforcements: "View enforcements",
  zero_discovery_allocations: "View members",
};

const SIGNAL_ICONS: Record<string, FounderIconName> = {
  pending_photo_reviews: "image",
  old_unresolved_report: "alert-triangle",
  zero_discovery_allocations: "search",
  active_enforcements: "shield",
};

function founderActionLabel(signal: HqAttentionSignal): string | null {
  const drillDown = attentionSignalDrillDown(signal);
  if (!drillDown) return null;
  return FOUNDER_ACTION_LABELS[signal.signal] ?? drillDown.label;
}

function signalIcon(signal: HqAttentionSignal): FounderIconName {
  if (signal.severity === "warning") return "alert-triangle";
  return SIGNAL_ICONS[signal.signal] ?? "alert-triangle";
}

function actionableCount(items: FounderAttentionItem[]): number {
  return items.filter((item) => item.kind === "actionable").length;
}

export function FounderAttentionBriefing({
  signals,
  loading,
  canAnalytics,
}: {
  signals: HqAttentionSignal[];
  loading: boolean;
  canAnalytics: boolean;
}) {
  const items = presentFounderAttentionSignals(signals);
  const count = actionableCount(items);

  return (
    <aside className="founder-attention" aria-label="Needs your attention">
      <header className="founder-attention__header">
        <h2>Needs your attention</h2>
        {count > 0 ? (
          <span className="founder-attention__count">
            {count} item{count === 1 ? "" : "s"}
          </span>
        ) : null}
      </header>

      {!canAnalytics ? (
        <p className="founder-attention__empty">
          Health snapshot requires analytics access. Use Members and Trust &amp; Safety for
          operational work.
        </p>
      ) : loading ? (
        <div className="founder-attention__skeleton founder-skeleton" aria-hidden="true" />
      ) : items.length === 0 ? (
        <p className="founder-attention__empty">Nothing flagged for action right now.</p>
      ) : (
        <ol className="founder-attention__list">
          {items.map((item, index) => {
            if (item.kind === "marketplace_timing_unavailable") {
              return (
                <li
                  key="marketplace-timing-unavailable"
                  className="founder-attention__item founder-attention__item--deprioritized"
                >
                  <span className="founder-attention__icon founder-attention__icon--muted" aria-hidden="true">
                    <FounderIcon name="activity" size={16} />
                  </span>
                  <div className="founder-attention__body">
                    <h3>Marketplace timing insights aren&apos;t available yet</h3>
                    <p>
                      Time to first like, match and conversation will appear once enough
                      historical product data is available.
                    </p>
                  </div>
                </li>
              );
            }

            const signal = item.signal;
            const drillDown = attentionSignalDrillDown(signal);
            const action = founderActionLabel(signal);

            return (
              <li
                key={`${signal.signal}-${index}`}
                className={`founder-attention__item founder-attention__item--${signal.severity}`}
              >
                <span className="founder-attention__icon" aria-hidden="true">
                  <FounderIcon name={signalIcon(signal)} size={16} />
                </span>
                <div className="founder-attention__body">
                  <h3>{signal.title}</h3>
                  <p>
                    {signal.reason}
                    {signal.unit === "seconds" ? ` (${formatAttentionValue(signal)})` : null}
                  </p>
                  {drillDown && action ? (
                    <Link className="founder-link-arrow" to={drillDown.to}>
                      {action} →
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
}
