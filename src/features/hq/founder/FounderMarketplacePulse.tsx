import type { HqCommandCentreHealth } from "../../../lib/hq/types.ts";
import { presentMetric } from "../commandCentreMetric.ts";
import { FounderIcon, type FounderIconName } from "./founderIcons.tsx";
import { FounderMetricInfo, FounderMetricValue } from "./FounderMetricInfo.tsx";

/** Likes/matches/conversations already headline the hero KPI strip — this
 * panel adds the time-to-first-X medians instead of repeating those counts. */
const ENGAGEMENT = [
  {
    key: "time-to-like",
    label: "Time to first like",
    icon: "heart" as FounderIconName,
    pick: (h: HqCommandCentreHealth) => h.marketplace.time_to_first_like_median,
  },
  {
    key: "time-to-match",
    label: "Time to first match",
    icon: "heart" as FounderIconName,
    pick: (h: HqCommandCentreHealth) => h.marketplace.time_to_first_match_median,
  },
  {
    key: "time-to-conversation",
    label: "Time to first conversation",
    icon: "message-circle" as FounderIconName,
    pick: (h: HqCommandCentreHealth) => h.marketplace.time_to_first_conversation_median,
  },
] as const;

const FRICTION = [
  {
    key: "zero",
    label: "Zero discovery",
    pick: (h: HqCommandCentreHealth) => h.marketplace.zero_discovery_allocations.yesterday,
  },
  {
    key: "no-likes",
    label: "Published without likes",
    pick: (h: HqCommandCentreHealth) => h.marketplace.published_without_likes,
  },
  {
    key: "no-matches",
    label: "Published without matches",
    pick: (h: HqCommandCentreHealth) => h.marketplace.published_without_matches,
  },
] as const;

export function FounderMarketplacePulse({ health }: { health: HqCommandCentreHealth }) {
  return (
    <section className="founder-panel founder-panel--marketplace" aria-labelledby="founder-marketplace-title">
      <header className="founder-panel__header founder-panel__header--compact">
        <h2 id="founder-marketplace-title" className="founder-panel__title">
          Marketplace pulse
        </h2>
      </header>

      <div className="founder-marketplace-engagement">
        {ENGAGEMENT.map((item) => {
          const metric = item.pick(health);
          const presentation = presentMetric(metric);
          return (
            <article key={item.key} className="founder-marketplace-stat">
              <span className="founder-marketplace-stat__label">
                <FounderIcon name={item.icon} size={16} className="founder-marketplace-stat__icon" />
                {item.label}
                {item.key === "time-to-like" ? (
                  <FounderMetricInfo metric={metric} label="Marketplace engagement" />
                ) : null}
              </span>
              <FounderMetricValue presentation={presentation} large />
            </article>
          );
        })}
      </div>

      <hr className="founder-marketplace-divider" />

      <div className="founder-marketplace-friction">
        <h3 className="founder-marketplace-friction__title">Friction</h3>
        <ul className="founder-marketplace-friction__list">
          {FRICTION.map((item) => {
            const metric = item.pick(health);
            const presentation = presentMetric(metric);
            return (
              <li key={item.key} className="founder-marketplace-friction__row">
                <span>{item.label}</span>
                <FounderMetricValue presentation={presentation} />
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
