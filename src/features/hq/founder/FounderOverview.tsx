import { Link } from "react-router-dom";
import { useHqBrand } from "../useHqBrand.ts";
import { AnalyticsToolbar } from "../analytics/AnalyticsToolbar.tsx";
import type { HqAnalyticsRange } from "../analytics/analyticsTypes.ts";
import { founderGreeting } from "../commandCentreMetric.ts";
import type { CommandCentreData, CommandCentreLoadState } from "../hooks/useCommandCentreData.ts";
import { formatRelativeTime } from "./formatRelativeTime.ts";
import { FounderAttentionBriefing } from "./FounderAttentionBriefing.tsx";
import { FounderBrandComparison } from "./FounderBrandComparison.tsx";
import { FounderCompanyPulse } from "./FounderCompanyPulse.tsx";
import { FounderHeroMetrics, FounderHeroMetricsSkeleton } from "./FounderHeroMetrics.tsx";
import { FounderMarketplacePulse } from "./FounderMarketplacePulse.tsx";
import { FounderProfileHealth } from "./FounderProfileHealth.tsx";
import { FounderSystemStatus } from "./FounderSystemStatus.tsx";
import { FounderTrustSafety } from "./FounderTrustSafety.tsx";
import { DailyRegistrationsPanel } from "../analytics/DailyRegistrationsPanel.tsx";
import { DeletionsPanel } from "../analytics/DeletionsPanel.tsx";
import { FounderEngagementFunnel } from "./FounderEngagementFunnel.tsx";
import { FounderActiveUsers, FounderDemographics } from "./FounderPeoplePulse.tsx";
import { FounderMarketplaceTrends } from "./FounderMarketplaceTrends.tsx";
import {
  FounderDevicesAndPlatforms,
  FounderLiveActivity,
  FounderMarketplacePools,
  FounderNotificationHealth,
  FounderRecentErrors,
  FounderRecentReports,
  FounderRetention,
  FounderSystemHealth,
} from "./FounderReferencePanels.tsx";
import "./founder.css";
import { DatabaseBackupCard } from "../components/DatabaseBackupCard.tsx";

export function FounderOverview({
  load,
  data,
  partialErrors,
  canAnalytics,
  canManageBackups,
  onRefresh,
  timeRange,
  onTimeRangeChange,
}: {
  load: CommandCentreLoadState;
  data: CommandCentreData;
  partialErrors: string[];
  canAnalytics: boolean;
  canManageBackups: boolean;
  onRefresh: () => void;
  timeRange: HqAnalyticsRange;
  onTimeRangeChange: (range: HqAnalyticsRange) => void;
}) {
  const { brandName } = useHqBrand();
  const health = data.health;
  const displayBrand = brandName ?? "DateZA";
  const updatedLabel = health ? formatRelativeTime(health.generated_at) : null;
  const systemHealthy = Boolean(health) && partialErrors.length === 0;

  return (
    <div className="founder-overview" data-loading={load === "loading" ? "true" : "false"}>
      <header className="founder-intro founder-dashboard__row">
        <div className="founder-intro__copy founder-col-12">
          <h1 className="founder-intro__title">{founderGreeting()}, Founder</h1>
          <p className="founder-intro__meta">
            <span>{displayBrand}</span>
            {updatedLabel ? (
              <>
                <span aria-hidden="true">·</span>
                <span>Updated {updatedLabel}</span>
              </>
            ) : null}
            <span aria-hidden="true">·</span>
            <FounderSystemStatus version={data.version} healthy={systemHealthy} />
          </p>
        </div>
        <div className="founder-intro__actions">
          <AnalyticsToolbar range={timeRange} onRangeChange={onTimeRangeChange} />
          <button type="button" className="founder-refresh" onClick={onRefresh}>
            Refresh
          </button>
        </div>
      </header>

      {partialErrors.length > 0 ? (
        <div className="founder-banner founder-col-12" role="status">
          <strong>Some panels could not load.</strong> {partialErrors.join(" ")}
        </div>
      ) : null}

      {!canAnalytics ? (
        <section className="founder-panel founder-panel--forbidden founder-col-12">
          <h2>Analytics access required</h2>
          <p>
            The Founder dashboard needs <code>hq.analytics.read</code>. You can still use{" "}
            <Link to="/hq/members">Members</Link> and{" "}
            <Link to="/hq/trust-safety">Trust &amp; Safety</Link> when your role includes them.
          </p>
        </section>
      ) : load === "loading" ? (
        <>
          <FounderHeroMetricsSkeleton />
          <div className="founder-dashboard founder-dashboard--loading">
            <div className="founder-dashboard__row">
              <div className="founder-col-8 founder-skeleton founder-skeleton--panel" />
              <div className="founder-col-4 founder-skeleton founder-skeleton--panel" />
            </div>
            <div className="founder-dashboard__row">
              <div className="founder-col-5 founder-skeleton founder-skeleton--panel" />
              <div className="founder-col-7 founder-skeleton founder-skeleton--panel" />
            </div>
          </div>
        </>
      ) : health ? (
        <div className="founder-dashboard">
          <div className="founder-dashboard__row">
            <div className="founder-col-12">
              <FounderHeroMetrics health={health} />
            </div>
          </div>

          <div className="founder-dashboard__row">
            <div className="founder-col-4">
              <DailyRegistrationsPanel data={data.registrations} loading={false} />
            </div>
            <div className="founder-col-3">
              <FounderActiveUsers analytics={data.analytics} />
            </div>
            <div className="founder-col-2">
              <DeletionsPanel />
            </div>
            <div className="founder-col-3">
              <FounderLiveActivity alerts={data.alerts} error={data.alertsError} />
            </div>
          </div>

          <div className="founder-dashboard__row">
            <div className="founder-col-5">
              <FounderEngagementFunnel funnel={data.funnel} error={data.funnelError} />
            </div>
            <div className="founder-col-3">
              <FounderMarketplacePulse health={health} />
            </div>
            <div className="founder-col-4">
              <FounderProfileHealth health={health} />
            </div>
          </div>

          <div className="founder-dashboard__row">
            <div className="founder-col-7">
              <FounderMarketplaceTrends trends={data.productTrends} error={data.productTrendsError} />
            </div>
            <div className="founder-col-5">
              <FounderDemographics analytics={data.analytics} />
            </div>
          </div>

          {/* Security Alerts already renders in full via Live Activity above (and
              /hq/alerts) — this row stays two panels instead of repeating that list. */}
          <div className="founder-dashboard__row">
            <div className="founder-col-6">
              <FounderMarketplacePools />
            </div>
            <div className="founder-col-6">
              <FounderRetention />
            </div>
          </div>

          <div className="founder-dashboard__row">
            <div className="founder-col-3">
              <FounderDevicesAndPlatforms />
            </div>
            <div className="founder-col-3">
              <FounderNotificationHealth />
            </div>
            <div className="founder-col-3">
              <FounderSystemHealth version={data.version} />
            </div>
            <div className="founder-col-3">
              <DatabaseBackupCard data={data.backups} error={data.backupsError} canManage={canManageBackups} />
            </div>
          </div>

          <div className="founder-dashboard__row">
            <div className="founder-col-6">
              <FounderRecentErrors />
            </div>
            <div className="founder-col-6">
              <FounderRecentReports />
            </div>
          </div>

          <div className="founder-dashboard__row">
            <div className="founder-col-8">
              <FounderCompanyPulse health={health} />
            </div>
            <div className="founder-col-4">
              <FounderAttentionBriefing
                signals={health.attention_signals}
                loading={false}
                canAnalytics={canAnalytics}
              />
            </div>
          </div>

          <div className="founder-dashboard__row">
            <div className="founder-col-12">
              <FounderTrustSafety health={health} />
            </div>
          </div>

          {data.brands ? (
            <div className="founder-dashboard__row">
              <div className="founder-col-12">
                <FounderBrandComparison comparison={data.brands} />
              </div>
            </div>
          ) : data.brandsError ? (
            <div className="founder-dashboard__row">
              <div className="founder-col-12">
                <section className="founder-panel">
                  <h2 className="founder-panel__title">Brand comparison</h2>
                  <p className="founder-panel__error">{data.brandsError}</p>
                </section>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <section className="founder-panel founder-panel--error founder-col-12">
          <h2>Health snapshot unavailable</h2>
          <p>{data.healthError ?? "Could not load the command centre health snapshot."}</p>
          <button type="button" className="founder-refresh" onClick={onRefresh}>
            Try again
          </button>
        </section>
      )}
    </div>
  );
}
