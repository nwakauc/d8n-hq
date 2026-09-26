import { Link } from "react-router-dom";
import type {
  HqAttentionSignal,
  HqCommandCentreBrandsResponse,
  HqCommandCentreHealth,
} from "../../../lib/hq/types.ts";
import { attentionSignalDrillDown } from "../commandCentreAttention.ts";
import { formatMetricAvailableValue } from "../commandCentreFormat.ts";
import { formatWhenShort } from "../commandCentreMetric.ts";
import {
  CommandCentreStat,
} from "../components/CommandCentreMetric.tsx";
import {
  DataTable,
  MetricCard,
  ScoreCard,
  StateBanner,
  StatGroup,
  StatusBadge,
  UnavailableState,
} from "../components/HqPrimitives.tsx";
import type { OperationalWindow } from "../commandCentreWindows.ts";
import { UNSUPPORTED_OPERATIONAL_WINDOW } from "../commandCentreWindows.ts";
import type { CommandCentreData, CommandCentreLoadState } from "../hooks/useCommandCentreData.ts";
import { DailyRegistrationsPanel } from "../analytics/DailyRegistrationsPanel.tsx";
import { playConsoleUrlForBrand } from "../founder/playConsole.ts";

const SCORE_LABELS = ["Growth", "Product", "Revenue", "Customer", "Safety", "System"] as const;
const PRIMARY_WINDOWS = ["today", "last_7d", "last_30d"] as const;

function humanizeKey(key: string): string {
  return key.replace(/_/g, " ");
}

function windowLabel(
  windows: HqCommandCentreHealth["windows"],
  key: string,
): string | undefined {
  return windows[key]?.label;
}

function AttentionRail({
  signals,
  loading,
  canAnalytics,
}: {
  signals: HqAttentionSignal[];
  loading: boolean;
  canAnalytics: boolean;
}) {
  return (
    <aside className="hq-attention hq-card" aria-label="What needs my attention">
      <h2 className="hq-attention__title">What needs my attention?</h2>
      {!canAnalytics ? (
        <div className="hq-attention-item">
          <div className="hq-attention-item__label">
            <StatusBadge tone="neutral">Analytics</StatusBadge>
          </div>
          <p className="hq-attention-item__body">
            Command Centre health requires <code>hq.analytics.read</code>. Use{" "}
            <Link className="hq-inline-link" to="/hq/members">
              Members
            </Link>{" "}
            for operational workflows you can access today.
          </p>
        </div>
      ) : loading ? (
        <p className="hq-card__subtitle">Loading attention signals…</p>
      ) : signals.length === 0 ? (
        <div className="hq-attention-item">
          <div className="hq-attention-item__label">
            <StatusBadge tone="success">Clear</StatusBadge>
          </div>
          <p className="hq-attention-item__body">
            No operational attention signals from the current health snapshot. Check{" "}
            <Link className="hq-inline-link" to="/hq/trust-safety">
              Trust &amp; Safety
            </Link>{" "}
            and{" "}
            <Link className="hq-inline-link" to="/hq/members">
              Members
            </Link>{" "}
            for day-to-day work.
          </p>
        </div>
      ) : (
        signals.map((signal) => {
          const drillDown = attentionSignalDrillDown(signal);
          const tone = signal.severity === "warning" ? "warning" : "neutral";
          return (
            <div key={signal.signal} className="hq-attention-item">
              <div className="hq-attention-item__label">
                <StatusBadge tone={tone}>{humanizeKey(signal.signal)}</StatusBadge>
              </div>
              <p className="hq-attention-item__body">
                <strong>{signal.title}</strong> — {signal.reason}
                {drillDown ? (
                  <>
                    {" "}
                    <Link className="hq-inline-link" to={drillDown.to}>
                      {drillDown.label}
                    </Link>
                  </>
                ) : null}
              </p>
            </div>
          );
        })
      )}
      <div className="hq-attention-item">
        <div className="hq-attention-item__label">
          <StatusBadge tone="accent">Start here</StatusBadge>
        </div>
        <p className="hq-attention-item__body">
          <Link className="hq-inline-link" to="/hq/members">
            Members
          </Link>{" "}
          for directory browse and Member 360.
        </p>
      </div>
    </aside>
  );
}

function BrandComparisonTable({
  comparison,
  windows,
}: {
  comparison: HqCommandCentreBrandsResponse;
  windows: HqCommandCentreHealth["windows"];
}) {
  if (comparison.brands.length < 2) {
    return null;
  }

  const todayLabel = windowLabel(windows, "today") ?? "Today";
  const rows = comparison.brands.map((entry) => {
    const health = entry.brand_health;
    return {
      brand: entry.brand,
      role: entry.role,
      memberships: formatMetricAvailableValue(health.audience.memberships_total),
      newToday: formatMetricAvailableValue(health.audience.memberships_new.today),
      activeToday: formatMetricAvailableValue(health.activity.active_users.today),
      activation: formatMetricAvailableValue(health.profile_health.activation_ratio),
      zeroDiscovery: formatMetricAvailableValue(
        health.marketplace.zero_discovery_allocations.yesterday,
      ),
      attention: String(health.attention_signals.length),
    };
  });

  return (
    <MetricCard title="Brand comparison" action={<StatusBadge tone="success">Founder</StatusBadge>}>
      <p className="hq-card__subtitle" style={{ marginBottom: 12 }}>
        Only brands your role can read are included. Snapshot{" "}
        {formatWhenShort(comparison.generated_at)} · {comparison.time_zone}
      </p>
      <div className="hq-brand-compare-wrap">
        <DataTable
          columns={[
            { key: "brand", header: "Brand" },
            { key: "memberships", header: "Members" },
            { key: "newToday", header: `New · ${todayLabel}` },
            { key: "activeToday", header: `Active · ${todayLabel}` },
            { key: "activation", header: "Activation" },
            { key: "zeroDiscovery", header: "Zero discovery (prev day)" },
            { key: "attention", header: "Signals" },
          ]}
          rows={rows}
          empty="No comparable brands returned."
        />
      </div>
    </MetricCard>
  );
}

export function CommandCentreOpsDashboard({
  load,
  data,
  partialErrors,
  canAnalytics,
  canAlerts,
  onRefresh,
  rollingWindow,
}: {
  load: CommandCentreLoadState;
  data: CommandCentreData;
  partialErrors: string[];
  canAnalytics: boolean;
  canAlerts: boolean;
  onRefresh: () => void;
  rollingWindow: OperationalWindow | null;
}) {
  const health = data.health;
  const alertCount = data.alerts?.alerts.length ?? 0;
  const playConsole = playConsoleUrlForBrand(data.devices?.brand);

  return (
    <div className="hq-content hq-content--with-rail">
      <div className="hq-content__primary">
        <DailyRegistrationsPanel data={data.registrations} loading={load === "loading"} />
        <div className="hq-ops-mode-bar">
          <StatusBadge tone="neutral">Ops mode</StatusBadge>
        </div>

        {partialErrors.length > 0 ? (
          <StateBanner
            tone="neutral"
            title="Some command centre data could not load"
            body={partialErrors.join(" ")}
          />
        ) : null}

        <MetricCard
          title="Brand snapshot"
          action={
            health ? <StatusBadge tone="success">Live</StatusBadge> : (
              <StatusBadge tone="neutral">Brand scope</StatusBadge>
            )
          }
        >
          {load === "loading" && canAnalytics ? (
            <p className="hq-card__subtitle">Loading health snapshot…</p>
          ) : !canAnalytics ? (
            <UnavailableState
              badge="FORBIDDEN"
              title="Analytics not enabled for your role"
              body="Requires hq.analytics.read. Member directory and Trust & Safety remain available when your role includes them."
            />
          ) : health ? (
            <>
              <p className="hq-command-header">
                <span className="hq-command-header__brand">{health.brand}</span>
                {data.version ? (
                  <span className="hq-command-header__release">
                    {data.version.release ?? data.version.image_version ?? "unreleased"} ·{" "}
                    {data.version.git_sha?.slice(0, 12) ?? "no sha"}
                  </span>
                ) : null}
              </p>
              <p className="hq-card__subtitle">
                Snapshot {formatWhenShort(health.generated_at)} · {health.time_zone}
                {health.windows.today ? ` · primary window: ${health.windows.today.label}` : null}
              </p>
            </>
          ) : (
            <UnavailableState
              badge="UNAVAILABLE"
              title="Could not load health snapshot"
              body={data.healthError ?? "The command centre health endpoint failed."}
            />
          )}
        </MetricCard>

        {health ? (
          <>
            <MetricCard title="Audience (health snapshot)">
              <div className="hq-command-stats">
                <CommandCentreStat label="Total memberships" metric={health.audience.memberships_total} />
                {PRIMARY_WINDOWS.map((windowKey) =>
                  health.audience.memberships_new[windowKey] ? (
                    <CommandCentreStat
                      key={`new-${windowKey}`}
                      label="New memberships"
                      metric={health.audience.memberships_new[windowKey]}
                      windowLabel={windowLabel(health.windows, windowKey)}
                    />
                  ) : null,
                )}
                {PRIMARY_WINDOWS.map((windowKey) =>
                  health.activity.active_users[windowKey] ? (
                    <CommandCentreStat
                      key={`active-${windowKey}`}
                      label="Active users"
                      metric={health.activity.active_users[windowKey]}
                      windowLabel={windowLabel(health.windows, windowKey)}
                    />
                  ) : null,
                )}
              </div>
            </MetricCard>

            <MetricCard title="Profile health">
              <div className="hq-command-stats">
                <CommandCentreStat label="Profiles by status" metric={health.profile_health.by_status} />
                <CommandCentreStat
                  label="Visible published"
                  metric={health.profile_health.visible_published}
                />
                <CommandCentreStat label="Activation ratio" metric={health.profile_health.activation_ratio} />
              </div>
            </MetricCard>

            <MetricCard title="Marketplace">
              <div className="hq-command-section">
                <p className="hq-command-section__label">Engagement windows</p>
                <div className="hq-command-stats">
                  {(["likes_created", "matches_created", "conversations_created"] as const).flatMap(
                    (metricKey) =>
                      PRIMARY_WINDOWS.map((windowKey) => {
                        const metric = health.marketplace[metricKey][windowKey];
                        if (!metric) return null;
                        return (
                          <CommandCentreStat
                            key={`${metricKey}-${windowKey}`}
                            label={humanizeKey(metricKey)}
                            metric={metric}
                            windowLabel={windowLabel(health.windows, windowKey)}
                          />
                        );
                      }),
                  )}
                </div>
              </div>
              <div className="hq-command-section">
                <p className="hq-command-section__label">Discovery health</p>
                <div className="hq-command-stats">
                  <CommandCentreStat
                    label="Zero-discovery allocations"
                    metric={health.marketplace.zero_discovery_allocations.yesterday}
                    windowLabel={windowLabel(health.windows, "yesterday")}
                  />
                  <CommandCentreStat
                    label="Zero-discovery allocations"
                    metric={health.marketplace.zero_discovery_allocations.last_7d}
                    windowLabel={windowLabel(health.windows, "last_7d")}
                  />
                  <CommandCentreStat
                    label="Zero-discovery allocations"
                    metric={health.marketplace.zero_discovery_allocations.last_30d}
                    windowLabel={windowLabel(health.windows, "last_30d")}
                  />
                  <CommandCentreStat
                    label="Published without likes"
                    metric={health.marketplace.published_without_likes}
                  />
                  <CommandCentreStat
                    label="Published without matches"
                    metric={health.marketplace.published_without_matches}
                  />
                </div>
              </div>
              <div className="hq-command-section hq-command-section--muted">
                <p className="hq-command-section__label">Time-to-first medians</p>
                <div className="hq-command-stats">
                  {(
                    [
                      "time_to_first_like_median",
                      "time_to_first_match_median",
                      "time_to_first_conversation_median",
                    ] as const
                  ).map((key) => (
                    <CommandCentreStat
                      key={key}
                      label={humanizeKey(key)}
                      metric={health.marketplace[key]}
                    />
                  ))}
                </div>
              </div>
            </MetricCard>

            <MetricCard title="Trust & Safety" action={<StatusBadge tone="warning">Operational</StatusBadge>}>
              <div className="hq-command-stats">
                <CommandCentreStat label="Open reports" metric={health.trust_safety.open_reports} />
                <CommandCentreStat
                  label="Awaiting decision"
                  metric={health.trust_safety.awaiting_decision}
                />
                <CommandCentreStat
                  label="Pending photo reviews"
                  metric={health.trust_safety.pending_photo_reviews}
                />
                <CommandCentreStat
                  label="Active enforcements"
                  metric={health.trust_safety.active_enforcements}
                />
                <CommandCentreStat
                  label="Oldest open report age"
                  metric={health.trust_safety.oldest_open_report_age_seconds}
                />
              </div>
              <p className="hq-card__subtitle" style={{ marginTop: 10 }}>
                <Link className="hq-inline-link" to="/hq/trust-safety">
                  Open Trust &amp; Safety
                </Link>
              </p>
            </MetricCard>
          </>
        ) : null}

        <div className="hq-grid-3">
          <MetricCard title="Engagement funnel">
            {data.funnelError ? (
              <UnavailableState
                badge="UNAVAILABLE"
                title="Could not load funnel"
                body={data.funnelError}
              />
            ) : data.funnel ? (
              <>
                <p className="hq-card__subtitle" style={{ marginBottom: 10 }}>
                  {data.funnel.brand} · {data.funnel.window.replace(/_/g, " ")} · {data.funnel.time_zone}
                </p>
                <DataTable
                  columns={[
                    { key: "stage", header: "Stage" },
                    { key: "value", header: "Members" },
                    { key: "ofRegistrations", header: "Of registrations" },
                  ]}
                  rows={data.funnel.stages.map((stage) => ({
                    stage: humanizeKey(stage.id),
                    value:
                      stage.status === "available" && typeof stage.value === "number"
                        ? stage.value.toLocaleString("en-ZA")
                        : "Unavailable",
                    ofRegistrations:
                      stage.conversion_from_registration === null
                        ? "—"
                        : `${(stage.conversion_from_registration * 100).toFixed(0)}%`,
                  }))}
                  empty="No funnel stages returned."
                />
              </>
            ) : load === "loading" ? (
              <p className="hq-card__subtitle">Loading product funnel…</p>
            ) : (
              <UnavailableState
                badge="UNAVAILABLE"
                title="Funnel not loaded"
                body="Product intelligence funnel was not returned for this operator."
              />
            )}
          </MetricCard>
          <MetricCard title="Acquisition channels">
            <UnavailableState
              badge="NOT CONFIGURED"
              title="No attribution capture"
              body="Registration does not store utm_* or campaign source today."
            />
          </MetricCard>
          <MetricCard
            title="System health"
            action={
              data.systemHealth ? (
                <StatusBadge
                  tone={
                    data.systemHealth.overall === "healthy"
                      ? "success"
                      : data.systemHealth.overall === "down"
                        ? "danger"
                        : "warning"
                  }
                >
                  {data.systemHealth.overall.replace(/_/g, " ")}
                </StatusBadge>
              ) : undefined
            }
          >
            {data.systemHealthError ? (
              <UnavailableState
                badge="UNAVAILABLE"
                title="Could not load system health"
                body={data.systemHealthError}
              />
            ) : data.systemHealth ? (
              <StatGroup
                items={[
                  { label: "API", value: data.systemHealth.services.api.status },
                  { label: "Database", value: data.systemHealth.services.database.status },
                  { label: "Jobs", value: data.systemHealth.services.jobs.status },
                  { label: "Media", value: data.systemHealth.services.media_storage.status },
                  { label: "Notifications", value: data.systemHealth.services.notifications.status },
                ]}
              />
            ) : load === "loading" ? (
              <p className="hq-card__subtitle">Loading system probes…</p>
            ) : (
              <UnavailableState
                badge="FORBIDDEN"
                title="System health not enabled"
                body="Requires hq.system.read. Errors, APM, and vendor observability remain reserved."
              />
            )}
          </MetricCard>
        </div>

        <div className="hq-grid-2">
          <MetricCard title="Devices & platforms">
            {data.devicesError ? (
              <UnavailableState badge="UNAVAILABLE" title="Could not load devices" body={data.devicesError} />
            ) : data.devices ? (
              <>
                <p className="hq-card__subtitle" style={{ marginBottom: 10 }}>
                  Rolling {data.devices.window} · {data.devices.brand} · {data.devices.time_zone}. Web
                  includes phones in the browser; Android app is native only.
                </p>
                <StatGroup
                  items={Object.entries(data.devices.platforms).map(([platform, summary]) => ({
                    label:
                      platform === "web"
                        ? "Web"
                        : platform === "android"
                          ? "Android app"
                          : platform === "ios"
                            ? "iOS app"
                            : "Other",
                    value: `${summary.active_users.toLocaleString("en-ZA")} users · ${summary.active_devices.toLocaleString("en-ZA")} devices`,
                  }))}
                />
                {data.devices.platforms.web.browsers && data.devices.platforms.web.browsers.length > 0 ? (
                  <p className="hq-card__subtitle" style={{ marginTop: 10 }}>
                    Browsers:{" "}
                    {data.devices.platforms.web.browsers
                      .map((browser) => `${browser.browser} ${browser.active_users.toLocaleString("en-ZA")}`)
                      .join(" · ")}
                  </p>
                ) : null}
                <p className="hq-card__subtitle" style={{ marginTop: 8 }}>
                  Android app first seen this window:{" "}
                  {(data.devices.platforms.android.first_seen_devices ?? 0).toLocaleString("en-ZA")}
                  . Push-capable:{" "}
                  {(data.devices.platforms.android.push_capable_devices ?? 0).toLocaleString("en-ZA")}
                  . D8N sightings, not Play Store totals.
                </p>
                {playConsole ? (
                  <a className="hq-inline-link" href={playConsole} target="_blank" rel="noreferrer">
                    Open Play Console installs
                  </a>
                ) : null}
              </>
            ) : !rollingWindow ? (
              <UnavailableState
                badge="NOT IN RANGE"
                title="No rolling-window equivalent"
                body={UNSUPPORTED_OPERATIONAL_WINDOW}
              />
            ) : load === "loading" ? (
              <p className="hq-card__subtitle">Loading device telemetry…</p>
            ) : (
              <UnavailableState
                badge="UNAVAILABLE"
                title="Devices not loaded"
                body="Device telemetry was not returned for this operator."
              />
            )}
          </MetricCard>
          <MetricCard
            title="Notification health"
            action={
              <Link className="hq-inline-link" to="/hq/notifications">
                Delivery logs
              </Link>
            }
          >
            {data.notificationHealthError ? (
              <UnavailableState
                badge="UNAVAILABLE"
                title="Could not load notification health"
                body={data.notificationHealthError}
              />
            ) : data.notificationHealth ? (
              <>
                <p className="hq-card__subtitle" style={{ marginBottom: 10 }}>
                  Rolling {data.notificationHealth.window} · Expo push receipts are measured. Email and SMS
                  still report provider acceptance only.
                </p>
                <StatGroup
                  items={(["push", "email", "sms"] as const).map((channel) => {
                    const row = data.notificationHealth?.channels[channel];
                    if (!row) return { label: channel, value: "—" };
                    if (!row.configured) return { label: channel, value: "Not configured" };
                    const receipts =
                      row.delivery_receipts === "not_captured"
                        ? null
                        : `${row.delivery_receipts.ok.toLocaleString("en-ZA")} receipts ok`;
                    return {
                      label: channel,
                      value: `Accepted ${row.provider_accepted.toLocaleString("en-ZA")} · fail ${row.failed.toLocaleString("en-ZA")}${receipts ? ` · ${receipts}` : ""}`,
                    };
                  })}
                />
                {data.notificationHealth.push_funnel ? (
                  <p className="hq-card__subtitle" style={{ marginTop: 10 }}>
                    Push funnel: {data.notificationHealth.push_funnel.events_created.toLocaleString("en-ZA")} events
                    · {data.notificationHealth.push_funnel.expo_accepted.toLocaleString("en-ZA")} Expo accepted
                    · {data.notificationHealth.push_funnel.receipts_ok.toLocaleString("en-ZA")} receipts ok
                  </p>
                ) : null}
              </>
            ) : !rollingWindow ? (
              <UnavailableState
                badge="NOT IN RANGE"
                title="No rolling-window equivalent"
                body={UNSUPPORTED_OPERATIONAL_WINDOW}
              />
            ) : load === "loading" ? (
              <p className="hq-card__subtitle">Loading notification telemetry…</p>
            ) : (
              <UnavailableState
                badge="UNAVAILABLE"
                title="Notification health not loaded"
                body="Notification health was not returned for this operator."
              />
            )}
          </MetricCard>
        </div>

        <div className="hq-score-grid" aria-label="Company scores">
          {SCORE_LABELS.map((label) => (
            <ScoreCard
              key={label}
              label={label}
              badge={label === "Revenue" ? "NOT CONFIGURED" : "INSUFFICIENT DATA"}
              hint={
                label === "Revenue"
                  ? "Billing does not exist in D8N yet."
                  : "Composite scores are not trustworthy until later HQ phases. Underlying counts are in the cards above."
              }
            />
          ))}
        </div>

        <div className="hq-grid-4">
          <MetricCard
            title="Release identity"
            action={data.version ? <StatusBadge tone="success">Live</StatusBadge> : undefined}
          >
            {load === "loading" ? (
              <p className="hq-card__subtitle">Loading version…</p>
            ) : data.version ? (
              <>
                <p className="hq-release-line">
                  {data.version.release ?? data.version.image_version ?? "unreleased"} ·{" "}
                  {data.version.git_sha?.slice(0, 12) ?? "no sha"}
                </p>
                <p className="hq-card__subtitle" style={{ marginTop: 8 }}>
                  {data.version.environment} / {data.version.rails_environment}
                  {data.version.build_timestamp
                    ? ` · built ${formatWhenShort(data.version.build_timestamp)}`
                    : null}
                </p>
              </>
            ) : (
              <UnavailableState
                badge="UNAVAILABLE"
                title="Version endpoint unreachable"
                body={data.versionError ?? "GET /api/v1/version did not return release identity."}
              />
            )}
          </MetricCard>
          <MetricCard title="Top errors">
            <UnavailableState
              badge="COMING LATER"
              title="No error tracker"
              body="Adopt an observability vendor before this card shows data."
            />
          </MetricCard>
          <MetricCard title="Incidents">
            <UnavailableState badge="COMING LATER" title="No incident system" body="Reserved navigation only." />
          </MetricCard>
          <MetricCard title="Company Intelligence" action={<StatusBadge tone="accent">AI</StatusBadge>}>
            <UnavailableState
              badge="COMING LATER"
              title="Intelligence is deferred"
              body="Phase 7+. Requires trustworthy metrics first — never a demo narrative over empty data."
            />
          </MetricCard>
        </div>

        {data.brands ? (
          <BrandComparisonTable comparison={data.brands} windows={health?.windows ?? {}} />
        ) : data.brandsError && canAnalytics ? (
          <MetricCard title="Brand comparison">
            <UnavailableState
              badge="UNAVAILABLE"
              title="Could not load brand comparison"
              body={data.brandsError}
            />
          </MetricCard>
        ) : null}

        {canAlerts ? (
          <MetricCard
            title="Security alerts"
            action={
              alertCount > 0 ? (
                <StatusBadge tone="danger">{alertCount} recent</StatusBadge>
              ) : (
                <StatusBadge tone="neutral">Clear</StatusBadge>
              )
            }
          >
            {data.alertsError ? (
              <UnavailableState
                badge="UNAVAILABLE"
                title="Could not load security alerts"
                body={data.alertsError}
              />
            ) : (
              <>
                <DataTable
                  columns={[
                    { key: "event", header: "Event" },
                    { key: "severity", header: "Severity" },
                    { key: "when", header: "When" },
                  ]}
                  rows={(data.alerts?.alerts ?? []).map((row) => ({
                    event: humanizeKey(row.event_type),
                    severity: row.severity,
                    when: formatWhenShort(row.created_at),
                  }))}
                  empty="No security alerts on this brand."
                />
                <p className="hq-card__subtitle" style={{ marginTop: 10 }}>
                  <Link className="hq-inline-link" to="/hq/alerts">
                    View all alerts
                  </Link>
                </p>
              </>
            )}
          </MetricCard>
        ) : null}

        <button type="button" className="hq-btn hq-btn--ghost hq-command-refresh" onClick={onRefresh}>
          Refresh command centre
        </button>
      </div>

      <AttentionRail
        signals={health?.attention_signals ?? []}
        loading={load === "loading" && canAnalytics}
        canAnalytics={canAnalytics}
      />
    </div>
  );
}
