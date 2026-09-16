import type { HqCommandCentreHealth } from "../../../lib/hq/types.ts";
import { presentMetric } from "../commandCentreMetric.ts";
import { FounderIcon, type FounderIconName } from "./founderIcons.tsx";
import { FounderMetricInfo, FounderMetricValue } from "./FounderMetricInfo.tsx";

const ENGAGEMENT = [
  {
    key: "likes",
    label: "Likes",
    icon: "heart" as FounderIconName,
    pick: (h: HqCommandCentreHealth) => h.marketplace.likes_created.today,
  },
  {
    key: "matches",
    label: "Matches",
    icon: "heart" as FounderIconName,
    pick: (h: HqCommandCentreHealth) => h.marketplace.matches_created.today,
  },
  {
    key: "conversations",
    label: "Conversations",
    icon: "message-circle" as FounderIconName,
    pick: (h: HqCommandCentreHealth) => h.marketplace.conversations_created.today,
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
                {item.key === "likes" ? (
                  <FounderMetricInfo
                    metric={metric}
                    label="Marketplace engagement"
                    windowLabel={health.windows.today?.label}
                  />
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
