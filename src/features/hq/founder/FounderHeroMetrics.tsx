import type { HqCommandCentreHealth } from "../../../lib/hq/types.ts";
import { presentMetric } from "../commandCentreMetric.ts";
import { FounderIcon, type FounderIconName } from "./founderIcons.tsx";
import { FounderMetricInfo, FounderMetricValue } from "./FounderMetricInfo.tsx";

const HERO_SPECS = [
  {
    key: "members",
    label: "Total members",
    icon: "users" as FounderIconName,
    tone: "blue" as const,
    pick: (health: HqCommandCentreHealth) => health.audience.memberships_total,
    context: () => "All memberships",
    windowKey: null as string | null,
  },
  {
    key: "new",
    label: "New today",
    icon: "user-plus" as FounderIconName,
    tone: "green" as const,
    pick: (health: HqCommandCentreHealth) => health.audience.memberships_new.today,
    context: (health: HqCommandCentreHealth) => health.windows.today?.label ?? "Today",
    windowKey: "today",
  },
  {
    key: "active",
    label: "Active today",
    icon: "activity" as FounderIconName,
    tone: "blue" as const,
    pick: (health: HqCommandCentreHealth) => health.activity.active_users.today,
    context: (health: HqCommandCentreHealth) => health.windows.today?.label ?? "Today",
    windowKey: "today",
  },
  {
    key: "matches",
    label: "Matches today",
    icon: "heart" as FounderIconName,
    tone: "rose" as const,
    pick: (health: HqCommandCentreHealth) => health.marketplace.matches_created.today,
    context: (health: HqCommandCentreHealth) => health.windows.today?.label ?? "Today",
    windowKey: "today",
  },
  {
    key: "reports",
    label: "Open reports",
    icon: "shield" as FounderIconName,
    tone: "amber" as const,
    pick: (health: HqCommandCentreHealth) => health.trust_safety.open_reports,
    context: () => "Trust queue",
    windowKey: null,
  },
] as const;

export function FounderHeroMetrics({ health }: { health: HqCommandCentreHealth }) {
  return (
    <section className="founder-hero" aria-label="Headline metrics">
      {HERO_SPECS.map((spec) => {
        const metric = spec.pick(health);
        const presentation = presentMetric(metric);
        const windowLabel = spec.windowKey
          ? health.windows[spec.windowKey]?.label
          : undefined;

        return (
          <article key={spec.key} className={`founder-hero__item founder-hero__item--${spec.tone}`}>
            <div className="founder-hero__top">
              <span className={`founder-hero__icon founder-hero__icon--${spec.tone}`} aria-hidden="true">
                <FounderIcon name={spec.icon} size={17} />
              </span>
              <header className="founder-hero__head">
                <span className="founder-hero__label">{spec.label}</span>
                <FounderMetricInfo metric={metric} label={spec.label} windowLabel={windowLabel} />
              </header>
            </div>
            <FounderMetricValue presentation={presentation} large />
            <span className="founder-hero__context">{spec.context(health)}</span>
          </article>
        );
      })}
    </section>
  );
}

export function FounderHeroMetricsSkeleton() {
  return (
    <section className="founder-hero founder-hero--skeleton" aria-hidden="true">
      {HERO_SPECS.map((spec) => (
        <div key={spec.key} className="founder-hero__item founder-skeleton" />
      ))}
    </section>
  );
}
