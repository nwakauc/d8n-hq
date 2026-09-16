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
  StatusBadge,
  UnavailableState,
} from "../components/HqPrimitives.tsx";
import type { CommandCentreData, CommandCentreLoadState } from "../hooks/useCommandCentreData.ts";

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
}: {
  load: CommandCentreLoadState;
  data: CommandCentreData;
  partialErrors: string[];
  canAnalytics: boolean;
  canAlerts: boolean;
  onRefresh: () => void;
}) {
  const health = data.health;
  const alertCount = data.alerts?.alerts.length ?? 0;

  return (
    <div className="hq-content hq-content--with-rail">
      <div className="hq-content__primary">
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
          title="Founder snapshot"
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

        <div className="hq-score-grid" aria-label="Company scores">
          {SCORE_LABELS.map((label) => (
            <ScoreCard
              key={label}
              label={label}
              badge={label === "Revenue" ? "NOT CONFIGURED" : "INSUFFICIENT DATA"}
              hint={
                label === "Revenue"
                  ? "Billing does not exist in D8N yet."
                  : "Score inputs are not trustworthy until later HQ phases."
              }
            />
          ))}
        </div>

        {health ? (
          <>
            <MetricCard title="Today / Audience">
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
          <MetricCard title="Funnel overview">
            <UnavailableState
              badge="INSUFFICIENT DATA"
              title="Funnel not wired"
              body="Dedicated funnel dashboards ship in a later HQ phase."
            />
          </MetricCard>
          <MetricCard title="Acquisition channels">
            <UnavailableState
              badge="NOT CONFIGURED"
              title="No attribution capture"
              body="Registration does not store utm_* or campaign source today."
            />
          </MetricCard>
          <MetricCard title="System health">
            <UnavailableState
              badge="COMING LATER"
              title="Observability vendor not adopted"
              body="Errors, APM, and infra health belong to a later phase — not hand-rolled fake uptime."
            />
          </MetricCard>
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
