import { Link } from "react-router-dom";
import { useHqBrand } from "../useHqBrand.ts";
import { AnalyticsToolbar } from "../analytics/AnalyticsToolbar.tsx";
import type { HqAnalyticsRange } from "../analytics/analyticsTypes.ts";
import type { OperationalWindow } from "../commandCentreWindows.ts";
import { founderGreeting } from "../commandCentreMetric.ts";
import type { CommandCentreData, CommandCentreLoadState } from "../hooks/useCommandCentreData.ts";
import { formatRelativeTime } from "./formatRelativeTime.ts";
import { FounderAttentionBriefing } from "./FounderAttentionBriefing.tsx";
import { FounderBrandComparison } from "./FounderBrandComparison.tsx";
import { FounderCompanyPulse } from "./FounderCompanyPulse.tsx";
import { FounderHeroMetrics, FounderHeroMetricsSkeleton } from "./FounderHeroMetrics.tsx";
import { FounderMarketplacePulse } from "./FounderMarketplacePulse.tsx";
import { FounderProfileHealth } from "./FounderProfileHealth.tsx";
import { FounderLaunchClock } from "./FounderLaunchClock.tsx";
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
  rollingWindow,
}: {
  load: CommandCentreLoadState;
  data: CommandCentreData;
  partialErrors: string[];
  canAnalytics: boolean;
  canManageBackups: boolean;
  onRefresh: () => void;
  timeRange: HqAnalyticsRange;
  onTimeRangeChange: (range: HqAnalyticsRange) => void;
  rollingWindow: OperationalWindow | null;
}) {
  const { brandName } = useHqBrand();
  const health = data.health;
  const displayBrand = brandName ?? "DateZA";
  const updatedLabel = health ? formatRelativeTime(health.generated_at) : null;
  const systemHealthy = Boolean(health) && partialErrors.length === 0;

  return (
    <div className="hq-content founder-overview" data-loading={load === "loading" ? "true" : "false"}>
      <header className="founder-intro">
        <div className="founder-intro__copy">
          <h1 className="founder-intro__title">{founderGreeting()}, Founder</h1>
          <p className="founder-intro__meta">
            <span>{displayBrand}</span>
            {updatedLabel ? (
              <>
                <span aria-hidden="true">·</span>
                <span>Updated {updatedLabel}</span>
              </>
            ) : null}
          </p>
          <FounderLaunchClock />
          <FounderSystemStatus version={data.version} healthy={systemHealthy} />
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
          <FounderHeroMetrics health={health} />

          <section className="founder-section" aria-labelledby="founder-sec-pulse">
            <h2 id="founder-sec-pulse" className="founder-section__title">Pulse</h2>
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
          </section>

          <section className="founder-section" aria-labelledby="founder-sec-people">
            <h2 id="founder-sec-people" className="founder-section__title">People</h2>
            <div className="founder-dashboard__row founder-dashboard__row--people">
              <div className="founder-col-6">
                <DailyRegistrationsPanel data={data.registrations} loading={false} />
              </div>
              <div className="founder-col-3">
                <FounderActiveUsers analytics={data.analytics} />
              </div>
              <div className="founder-col-3">
                <FounderLiveActivity alerts={data.alerts} error={data.alertsError} />
              </div>
            </div>
            <div className="founder-dashboard__row">
              <div className="founder-col-12">
                <DeletionsPanel />
              </div>
            </div>
          </section>

          <section className="founder-section" aria-labelledby="founder-sec-product">
            <h2 id="founder-sec-product" className="founder-section__title">Product</h2>
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
            <div className="founder-dashboard__row">
              <div className="founder-col-6">
                <FounderMarketplacePools />
              </div>
              <div className="founder-col-6">
                <FounderRetention />
              </div>
            </div>
          </section>

          <section className="founder-section" aria-labelledby="founder-sec-platform">
            <h2 id="founder-sec-platform" className="founder-section__title">Platform</h2>
            <div className="founder-dashboard__row">
              <div className="founder-col-3">
                <FounderDevicesAndPlatforms
                  data={data.devices}
                  error={data.devicesError}
                  rollingWindow={rollingWindow}
                />
              </div>
              <div className="founder-col-3">
                <FounderNotificationHealth
                  data={data.notificationHealth}
                  devices={data.devices}
                  error={data.notificationHealthError}
                  rollingWindow={rollingWindow}
                />
              </div>
              <div className="founder-col-3">
                <FounderSystemHealth version={data.version} data={data.systemHealth} error={data.systemHealthError} />
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
          </section>

          <section className="founder-section" aria-labelledby="founder-sec-safety">
            <h2 id="founder-sec-safety" className="founder-section__title">Trust &amp; brands</h2>
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
          </section>
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
