import { Link } from "react-router-dom";
import type { HqCommandCentreHealth, HqMetricValue } from "../../../lib/hq/types.ts";
import { presentMetric } from "../commandCentreMetric.ts";
import { memberActiveWindowPath, memberCreatedWindowPath } from "../analytics/analyticsTypes.ts";
import { FounderIcon, type FounderIconName } from "./founderIcons.tsx";
import { FounderMetricInfo, FounderMetricValue } from "./FounderMetricInfo.tsx";

const ONLINE_NOW_UNAVAILABLE: HqMetricValue = {
  metric_id: "presence.online_now",
  version: 1,
  definition: "Members with a current canonical presence signal.",
  status: "unavailable",
  unit: "count",
  limitations: ["D8N does not yet expose a canonical presence window."],
};

const DELETIONS_UNAVAILABLE: HqMetricValue = {
  metric_id: "memberships.deleted",
  version: 1,
  definition: "Memberships deleted during the selected period.",
  status: "unavailable",
  unit: "count",
  limitations: ["D8N does not yet expose a canonical cross-brand deletion event."],
};

const HERO_SPECS = [
  {
    key: "members",
    label: "Total members",
    icon: "users" as FounderIconName,
    tone: "blue" as const,
    pick: (health: HqCommandCentreHealth) => health.audience.memberships_total,
    context: () => "All memberships",
    windowKey: null as string | null,
    to: () => "/hq/members",
  },
  {
    key: "new",
    label: "New today",
    icon: "user-plus" as FounderIconName,
    tone: "green" as const,
    pick: (health: HqCommandCentreHealth) => health.audience.memberships_new.today,
    context: (health: HqCommandCentreHealth) => health.windows.today?.label ?? "Today",
    windowKey: "today",
    to: (health: HqCommandCentreHealth) =>
      health.windows.today ? memberCreatedWindowPath(health.windows.today) : null,
  },
  {
    key: "active",
    label: "Active today",
    icon: "activity" as FounderIconName,
    tone: "blue" as const,
    pick: (health: HqCommandCentreHealth) => health.activity.active_users.today,
    context: (health: HqCommandCentreHealth) => health.windows.today?.label ?? "Today",
    windowKey: "today",
    to: (health: HqCommandCentreHealth) =>
      health.windows.today ? memberActiveWindowPath(health.windows.today) : null,
  },
  {
    key: "online",
    label: "Online now",
    icon: "activity" as FounderIconName,
    tone: "green" as const,
    pick: () => ONLINE_NOW_UNAVAILABLE,
    context: () => "Presence signal required",
    windowKey: null as string | null,
    to: () => null,
  },
  {
    key: "likes",
    label: "Likes today",
    icon: "heart" as FounderIconName,
    tone: "rose" as const,
    pick: (health: HqCommandCentreHealth) => health.marketplace.likes_created.today,
    context: (health: HqCommandCentreHealth) => health.windows.today?.label ?? "Today",
    windowKey: "today",
    to: () => null,
  },
  {
    key: "matches",
    label: "Matches today",
    icon: "heart" as FounderIconName,
    tone: "rose" as const,
    pick: (health: HqCommandCentreHealth) => health.marketplace.matches_created.today,
    context: (health: HqCommandCentreHealth) => health.windows.today?.label ?? "Today",
    windowKey: "today",
    to: () => null,
  },
  {
    key: "conversations",
    label: "Conversations",
    icon: "message-circle" as FounderIconName,
    tone: "blue" as const,
    pick: (health: HqCommandCentreHealth) => health.marketplace.conversations_created.today,
    context: (health: HqCommandCentreHealth) => health.windows.today?.label ?? "Today",
    windowKey: "today",
    to: () => null,
  },
  {
    key: "deletions",
    label: "Deletions",
    icon: "circle-alert" as FounderIconName,
    tone: "rose" as const,
    pick: () => DELETIONS_UNAVAILABLE,
    context: () => "Instrumentation required",
    windowKey: null as string | null,
    to: () => null,
  },
  {
    key: "reports",
    label: "Open reports",
    icon: "shield" as FounderIconName,
    tone: "amber" as const,
    pick: (health: HqCommandCentreHealth) => health.trust_safety.open_reports,
    context: () => "Trust queue",
    windowKey: null,
    to: () => "/hq/trust-safety?tab=queue&status=open",
  },
  {
    key: "photos",
    label: "Pending photos",
    icon: "image" as FounderIconName,
    tone: "amber" as const,
    pick: (health: HqCommandCentreHealth) => health.trust_safety.pending_photo_reviews,
    context: () => "Moderation",
    windowKey: null,
    to: () => "/hq/moderation/photos",
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
        const to = spec.to(health);

        const body = (
          <>
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
          </>
        );

        if (to) {
          return (
            <Link
              key={spec.key}
              to={to}
              className={`founder-hero__item founder-hero__item--${spec.tone} founder-hero__item--clickable`}
              aria-label={`${spec.label}: ${presentation.text} — view details`}
            >
              {body}
            </Link>
          );
        }

        return (
          <article key={spec.key} className={`founder-hero__item founder-hero__item--${spec.tone}`}>
            {body}
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
