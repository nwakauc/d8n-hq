import { Link } from "react-router-dom";
import type { HqCommandCentreHealth, HqMetricValue } from "../../../lib/hq/types.ts";
import { presentMetric } from "../commandCentreMetric.ts";
import { memberActiveWindowPath, memberCreatedWindowPath } from "../analytics/analyticsTypes.ts";
import { FounderIcon, type FounderIconName } from "./founderIcons.tsx";
import { FounderMetricInfo, FounderMetricValue } from "./FounderMetricInfo.tsx";
import { heroDayTrend } from "./heroTrend.ts";

const ONLINE_NOW_WINDOW_MS = 30 * 60 * 1000;

/** online_now has no windows[] entry from the backend (it's a fixed 30-minute
 * lookback from generated_at, not one of the standard today/7d/30d windows),
 * so build its member-directory link client-side from generated_at instead. */
function onlineNowWindowPath(health: HqCommandCentreHealth): string | null {
  const generatedAt = new Date(health.generated_at);
  if (Number.isNaN(generatedAt.getTime())) return null;
  return memberActiveWindowPath({
    start_at: new Date(generatedAt.getTime() - ONLINE_NOW_WINDOW_MS).toISOString(),
    end_at: generatedAt.toISOString(),
  });
}

const DELETIONS_UNAVAILABLE: HqMetricValue = {
  metric_id: "memberships.deleted",
  version: 1,
  definition: "Memberships deleted during the selected period.",
  status: "unavailable",
  unit: "count",
  limitations: ["D8N does not yet expose a canonical cross-brand deletion event."],
};

type HeroMetricSpec = {
  key: string;
  label: string;
  icon: FounderIconName;
  tone: "blue" | "green" | "rose" | "amber";
  pick: (health: HqCommandCentreHealth) => HqMetricValue;
  previous?: (health: HqCommandCentreHealth) => HqMetricValue | undefined;
  context: (health: HqCommandCentreHealth) => string;
  windowKey: string | null;
  to: (health: HqCommandCentreHealth) => string | null;
};

function HeroMetricTrend({
  current,
  previous,
  todayWindow,
}: {
  current: HqMetricValue;
  previous?: HqMetricValue;
  todayWindow?: HqCommandCentreHealth["windows"][string];
}) {
  const trend = heroDayTrend(current, previous, todayWindow);
  if (!trend) return null;

  const tone =
    trend.kind === "percent" && trend.change !== null
      ? trend.change >= 0
        ? "up"
        : "down"
      : "neutral";

  return (
    <span
      className={`founder-hero__trend founder-hero__trend--${tone}`}
      title={trend.title}
      aria-label={trend.ariaLabel}
    >
      {trend.label}
    </span>
  );
}

const HERO_SPECS: HeroMetricSpec[] = [
  {
    key: "members",
    label: "Total members",
    icon: "users" as FounderIconName,
    tone: "blue" as const,
    pick: (health: HqCommandCentreHealth) => health.audience.memberships_total,
    context: () => "Kept memberships · snapshot",
    windowKey: null as string | null,
    to: () => "/hq/members",
  },
  {
    key: "new",
    label: "New today",
    icon: "user-plus" as FounderIconName,
    tone: "green" as const,
    pick: (health: HqCommandCentreHealth) => health.audience.memberships_new.today,
    previous: (health: HqCommandCentreHealth) => health.audience.memberships_new.yesterday,
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
    previous: (health: HqCommandCentreHealth) => health.activity.active_users.yesterday,
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
    pick: (health: HqCommandCentreHealth) => health.activity.online_now,
    context: () => "Session used in last 30 min",
    windowKey: null as string | null,
    to: (health: HqCommandCentreHealth) => onlineNowWindowPath(health),
  },
  {
    key: "likes",
    label: "Likes today",
    icon: "heart" as FounderIconName,
    tone: "rose" as const,
    pick: (health: HqCommandCentreHealth) => health.marketplace.likes_created.today,
    previous: (health: HqCommandCentreHealth) => health.marketplace.likes_created.yesterday,
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
    previous: (health: HqCommandCentreHealth) => health.marketplace.matches_created.yesterday,
    context: (health: HqCommandCentreHealth) => health.windows.today?.label ?? "Today",
    windowKey: "today",
    to: () => null,
  },
  {
    key: "conversations",
    label: "Conversations today",
    icon: "message-circle" as FounderIconName,
    tone: "blue" as const,
    pick: (health: HqCommandCentreHealth) => health.marketplace.conversations_created.today,
    previous: (health: HqCommandCentreHealth) => health.marketplace.conversations_created.yesterday,
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
        const previousMetric = spec.previous?.(health);
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
            <div className="founder-hero__metric-line">
              <FounderMetricValue presentation={presentation} large />
            </div>
            <span className="founder-hero__context">
              {spec.context(health)}
              {previousMetric ? (
                <HeroMetricTrend
                  current={metric}
                  previous={previousMetric}
                  todayWindow={health.windows.today}
                />
              ) : null}
            </span>
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
