import type { HqCommandCentreHealth } from "../../../lib/hq/types.ts";
import { presentMetric } from "../commandCentreMetric.ts";
import { FounderDonutChart } from "./charts/FounderCharts.tsx";
import { FounderMetricInfo, FounderMetricValue } from "./FounderMetricInfo.tsx";

const STATUS_COLORS: Record<string, string> = {
  active: "#16a34a",
  draft: "#94a3b8",
  suspended: "#d97706",
  deleted: "#dc2626",
};

const STATUS_ORDER = ["active", "draft", "suspended", "deleted"];

function formatStatusLabel(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
}

export function FounderProfileHealth({ health }: { health: HqCommandCentreHealth }) {
  const byStatus = health.profile_health.by_status;
  const statusPresentation = presentMetric(byStatus);
  const activation = presentMetric(health.profile_health.activation_ratio);
  const published = presentMetric(health.profile_health.visible_published);

  const segments =
    statusPresentation.record &&
    STATUS_ORDER.filter((key) => key in statusPresentation.record!)
      .map((key) => ({
        key,
        label: formatStatusLabel(key),
        value: statusPresentation.record![key],
        color: STATUS_COLORS[key] ?? "#94a3b8",
      }))
      .filter((segment) => segment.value > 0 || segment.key !== "deleted");

  const total =
    segments?.reduce((sum, segment) => sum + segment.value, 0) ??
    statusPresentation.numeric ??
    0;

  return (
    <section
      className="founder-panel founder-panel--profile"
      aria-labelledby="founder-profile-title"
    >
      <header className="founder-profile__header">
        <h2 id="founder-profile-title" className="founder-panel__title">
          Profile health
        </h2>
        <div className="founder-profile__activation">
          <FounderMetricValue presentation={activation} large />
          <span className="founder-profile__activation-label">Activation</span>
          <FounderMetricInfo
            metric={health.profile_health.activation_ratio}
            label="Activation ratio"
          />
        </div>
      </header>

      {segments && segments.length > 0 ? (
        <FounderDonutChart segments={segments} ariaLabel="Profile status distribution" />
      ) : (
        <p className="founder-empty-inline">{statusPresentation.text}</p>
      )}

      <p className="founder-profile__total">
        <strong>{total.toLocaleString("en-ZA")}</strong> total profiles
      </p>

      <div className="founder-profile-published">
        <span className="founder-profile-stat__label">
          Visible published
          <FounderMetricInfo
            metric={health.profile_health.visible_published}
            label="Visible published"
          />
        </span>
        <FounderMetricValue presentation={published} />
      </div>
    </section>
  );
}
