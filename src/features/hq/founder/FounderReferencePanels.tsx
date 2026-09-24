import { useState } from "react";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import type {
  HqDevicesResponse,
  HqHealthStatus,
  HqNotificationHealthResponse,
  HqSecurityAlertList,
  HqSystemHealthResponse,
  HqVersionInfo,
} from "../../../lib/hq/types.ts";
import { UNSUPPORTED_OPERATIONAL_WINDOW, type OperationalWindow } from "../commandCentreWindows.ts";
import { formatRelativeTime } from "./formatRelativeTime.ts";
import { FounderIcon, FounderIconBadge, type FounderIconName } from "./founderIcons.tsx";
import { humanizeSecurityEvent } from "./securityEventLabels.ts";
import { FounderHorizontalBars } from "./charts/FounderCharts.tsx";
import { serviceProviderHref, thirdPartyProviderName, providerHref } from "./systemHealthProviders.ts";
import { EXPO_PUSH_CONSOLE_URL, playConsoleUrlForBrand } from "./playConsole.ts";

/** Panels below render the reference layout's full visual shell — chart frames,
 * tabs, rows — with every value left null/"needs backend" rather than invented,
 * so wiring a real endpoint later only means passing data in, not rebuilding UI. */
function NeedsBackendNote({ children }: { children: ReactNode }) {
  return <p className="founder-reference-empty founder-reference-empty--note">{children}</p>;
}

function CoveragePanel({
  title,
  subtitle,
  icon,
  tone,
  action,
  children,
}: {
  title: string;
  subtitle: string;
  icon: FounderIconName;
  tone: "blue" | "green" | "rose" | "amber";
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="founder-panel founder-reference-panel" aria-label={title}>
      <header className="founder-panel__heading">
        <div>
          <h2 className="founder-panel__title">{title}</h2>
          <p className="founder-panel__subtitle">{subtitle}</p>
        </div>
        {action ?? <FounderIconBadge name={icon} tone={tone} />}
      </header>
      {children}
    </section>
  );
}

function BrandTabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (tab: string) => void }) {
  return (
    <div className="founder-pool-tabs" role="tablist" aria-label="Brand">
      {tabs.map((tab) => (
        <span
          key={tab}
          role="tab"
          tabIndex={0}
          aria-selected={tab === active}
          className={tab === active ? "is-active" : undefined}
          onClick={() => onChange(tab)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") onChange(tab);
          }}
        >
          {tab}
        </span>
      ))}
    </div>
  );
}

export function FounderLiveActivity({
  alerts,
  error,
}: {
  alerts: HqSecurityAlertList | null;
  error: string | null;
}) {
  const rows = alerts?.alerts ?? [];
  return (
    <section className="founder-panel founder-reference-panel founder-live-activity" aria-label="Live activity">
      <header className="founder-panel__heading">
        <div>
          <h2 className="founder-panel__title">Live activity</h2>
          <p className="founder-panel__subtitle">Security events HQ can see right now.</p>
        </div>
        <span className="founder-live-activity__status"><i /> Live</span>
      </header>
      {error ? <p className="founder-panel__error">{error}</p> : null}
      {!error && rows.length > 0 ? (
        <ul className="founder-activity-list">
          {rows.slice(0, 4).map((row) => (
            <li key={`${row.event_type}-${row.created_at}`} className="founder-activity-list__row">
              <span className="founder-activity-list__icon" aria-hidden="true"><FounderIcon name="alert-triangle" size={14} /></span>
              <span className="founder-activity-list__body">
                <strong>{humanizeSecurityEvent(row.event_type)}</strong>
                <small>Security event · {formatRelativeTime(row.created_at)}</small>
              </span>
            </li>
          ))}
        </ul>
      ) : !error ? (
        <div className="founder-empty-frame">
          <FounderIcon name="activity" size={20} />
          <p>
            Only security events feed this stream today. The unified event envelope (registration,
            match, message, moderation…) described in the audit needs backend implementation.
          </p>
        </div>
      ) : null}
      <Link className="founder-link-arrow" to="/hq/alerts">View security events</Link>
    </section>
  );
}

const POOL_TABS = ["Men → Women", "Women → Men", "Men → Men", "Women → Women", "Open"];

export function FounderMarketplacePools() {
  const [activeTab, setActiveTab] = useState(POOL_TABS[0]);
  return (
    <CoveragePanel
      title="Marketplace pools"
      subtitle="Reciprocal eligible supply and demand by preference."
      icon="heart-handshake"
      tone="rose"
    >
      <BrandTabs tabs={POOL_TABS} active={activeTab} onChange={setActiveTab} />
      <FounderHorizontalBars
        ariaLabel={`${activeTab} pool metrics`}
        rows={[
          { key: "total", label: "Members in pool", value: null, max: 1, tone: "#e11d48" },
          { key: "active", label: "Active in pool", value: null, max: 1, tone: "#e11d48" },
          { key: "reciprocal", label: "Reciprocal supply", value: null, max: 1, tone: "#e11d48" },
          { key: "match-rate", label: "Match rate", value: null, max: 1, tone: "#e11d48" },
          { key: "conversation-rate", label: "Conversation rate", value: null, max: 1, tone: "#e11d48" },
        ]}
      />
      <NeedsBackendNote>
        Needs backend implementation: preference-aware reciprocal liquidity aggregation per pool.
      </NeedsBackendNote>
    </CoveragePanel>
  );
}

const RETENTION_BRANDS = ["All Brands", "Date9ja", "DateZA", "HookUs"];

export function FounderRetention() {
  const [activeBrand, setActiveBrand] = useState(RETENTION_BRANDS[0]);
  return (
    <CoveragePanel title="Retention" subtitle="Returning members by registration cohort." icon="activity" tone="blue">
      <BrandTabs tabs={RETENTION_BRANDS} active={activeBrand} onChange={setActiveBrand} />
      <div className="founder-retention-windows">
        {["D1", "D7", "D30"].map((window) => (
          <div key={window}>
            <strong>—</strong>
            <span>{window}</span>
          </div>
        ))}
      </div>
      <div className="founder-empty-frame founder-empty-frame--chart" aria-hidden="true">
        <FounderIcon name="activity" size={20} />
        <span>Cohort retention trend renders here once captured</span>
      </div>
      <NeedsBackendNote>
        Needs backend implementation: a canonical registration-cohort return definition (D1/D7/D30) — the
        current health snapshot does not expose cohort survival.
      </NeedsBackendNote>
    </CoveragePanel>
  );
}

const DEVICE_ORDER = ["web", "android", "ios", "other"] as const;

function platformLabel(platform: string): string {
  if (platform === "web") return "Web";
  if (platform === "android") return "Android app";
  if (platform === "ios") return "iOS app";
  return "Other";
}

function platformCounts(summary: { active_users: number; active_devices: number }) {
  return `${summary.active_users.toLocaleString("en-ZA")} users · ${summary.active_devices.toLocaleString("en-ZA")} devices`;
}

function healthLabel(status: HqHealthStatus): string {
  return status.replace(/_/g, " ");
}

function healthClass(status: HqHealthStatus): string {
  return `founder-health-status founder-health-status--${status}`;
}

export function FounderDevicesAndPlatforms({
  data,
  error,
  rollingWindow,
}: {
  data: HqDevicesResponse | null;
  error: string | null;
  rollingWindow: OperationalWindow | null;
}) {
  const platformRows = data
    ? DEVICE_ORDER.map((platform) => {
        const summary = data.platforms[platform];
        return {
          key: platform,
          label: platformLabel(platform),
          value: summary.active_users,
          max: Math.max(...DEVICE_ORDER.map((name) => data.platforms[name].active_users), 1),
          tone: platform === "android" ? "#16a34a" : "#2563eb",
        };
      })
    : DEVICE_ORDER.map((platform) => ({
        key: platform,
        label: platformLabel(platform),
        value: null,
        max: 1,
        tone: "#2563eb",
      }));
  const web = data?.platforms.web;
  const android = data?.platforms.android;
  const playConsole = playConsoleUrlForBrand(data?.brand);
  return (
    <CoveragePanel
      title="Devices & platforms"
      subtitle={
        data
          ? `Web browsers vs native apps in a rolling ${data.window} window. Android phones on the website count as web.`
          : "Active product surfaces and app versions."
      }
      icon="search"
      tone="green"
    >
      <p className="founder-today__scope">
        Brand scope: {data?.brand ?? "current brand"}
        {data ? ` · API window ${data.window}` : rollingWindow ? ` · requested ${rollingWindow}` : ""}
      </p>
      {!rollingWindow && !data && !error ? (
        <NeedsBackendNote>{UNSUPPORTED_OPERATIONAL_WINDOW}</NeedsBackendNote>
      ) : null}
      <FounderHorizontalBars
        ariaLabel="Devices and platforms"
        rows={platformRows}
      />
      {error ? <p className="founder-panel__error">{error}</p> : null}
      {web?.browsers && web.browsers.length > 0 ? (
        <ul className="founder-device-breakdown">
          {web.browsers.map((browser) => (
            <li key={browser.browser}>
              <span>{browser.browser}</span>
              <strong>{platformCounts(browser)}</strong>
            </li>
          ))}
        </ul>
      ) : null}
      {android ? (
        <p className="founder-device-installs">
          Android app first seen this window:{" "}
          <strong>{(android.first_seen_devices ?? 0).toLocaleString("en-ZA")}</strong>
          . Push-capable:{" "}
          <strong>{(android.push_capable_devices ?? 0).toLocaleString("en-ZA")}</strong>
          . Those are D8N device sightings, not Play Store install totals.
        </p>
      ) : null}
      {playConsole ? (
        <a className="founder-link-arrow" href={playConsole} target="_blank" rel="noreferrer">
          Open Play Console installs
        </a>
      ) : null}
      {data ? (
        <div className="founder-device-versions">
          {DEVICE_ORDER.flatMap((platform) =>
            data.platforms[platform].versions.map((version) => (
              <span key={`${platform}-${version.version ?? "unknown"}`}>
                {platformLabel(platform)} · {version.version ?? "Version not reported"} ·{" "}
                {version.active_users.toLocaleString("en-ZA")} users
              </span>
            )),
          ).slice(0, 8)}
          {data.rows.length === 0 ? <span>No client activity recorded in this window.</span> : null}
        </div>
      ) : !error && rollingWindow ? (
        <NeedsBackendNote>Loading device telemetry…</NeedsBackendNote>
      ) : null}
    </CoveragePanel>
  );
}

const NOTIFICATION_CHANNELS: Array<{ label: string; icon: FounderIconName }> = [
  { label: "Push", icon: "message-circle" },
  { label: "Email", icon: "message-circle" },
  { label: "SMS", icon: "message-circle" },
];

export function FounderNotificationHealth({
  data,
  devices,
  error,
  rollingWindow,
}: {
  data: HqNotificationHealthResponse | null;
  devices?: HqDevicesResponse | null;
  error: string | null;
  rollingWindow: OperationalWindow | null;
}) {
  return (
    <CoveragePanel
      title="Notification health"
      subtitle={
        data
          ? `Push, email, and SMS provider acceptance in a rolling ${data.window} window. Delivery receipts are not captured.`
          : "Delivery health by channel."
      }
      icon="message-circle"
      tone="amber"
    >
      {!rollingWindow && !data && !error ? (
        <NeedsBackendNote>{UNSUPPORTED_OPERATIONAL_WINDOW}</NeedsBackendNote>
      ) : null}
      <ul className="founder-notification-list">
        {NOTIFICATION_CHANNELS.map((channel) => (
          <li key={channel.label} className="founder-notification-list__row">
            <span className="founder-notification-list__label">
              <FounderIcon name={channel.icon} size={15} />
              {channel.label}
            </span>
            {(() => {
              const key = channel.label.toLowerCase() as "push" | "email" | "sms";
              const metric = data?.channels[key];
              if (!metric) return <span className="founder-notification-list__stat founder-notification-list__stat--muted">—</span>;
              if (!metric.configured) return <span className="founder-notification-list__stat founder-notification-list__stat--muted">Not configured</span>;
              return (
                <>
                  <span className="founder-notification-list__stat">
                    <i className={`founder-status-dot founder-status-dot--${metric.status === "healthy" ? "good" : "warn"}`} />
                    {metric.attempted.toLocaleString("en-ZA")} attempted
                  </span>
                  <span className="founder-notification-list__stat">
                    Accepted {metric.provider_accepted.toLocaleString("en-ZA")}
                  </span>
                  <span className="founder-notification-list__stat founder-notification-list__stat--muted">
                    Fail {metric.failed.toLocaleString("en-ZA")}
                  </span>
                </>
              );
            })()}
          </li>
        ))}
      </ul>
      {error ? <p className="founder-panel__error">{error}</p> : null}
      {devices?.platforms.android ? (
        <p className="founder-device-installs">
          Android app devices registered for push this window:{" "}
          <strong>{(devices.platforms.android.push_capable_devices ?? 0).toLocaleString("en-ZA")}</strong>
        </p>
      ) : null}
      {data ? (
        <p className="founder-reference-empty founder-reference-empty--note">
          Push uses {data.channels.push.provider.join(", ") || "no recorded provider"}. Provider
          acceptance is measured. Delivery receipts are not captured yet.
        </p>
      ) : null}
      {!data && !error && rollingWindow ? <NeedsBackendNote>Loading notification telemetry…</NeedsBackendNote> : null}
      {data?.channels.push.configured ? (
        <a className="founder-link-arrow" href={EXPO_PUSH_CONSOLE_URL} target="_blank" rel="noreferrer">
          Open Expo push
        </a>
      ) : null}
      {data ? <Link className="founder-link-arrow" to="/hq/notifications">View delivery logs</Link> : null}
    </CoveragePanel>
  );
}

const SYSTEM_SERVICES = [
  { label: "D8N API", icon: "activity" as FounderIconName },
  { label: "Database", icon: "users" as FounderIconName },
  { label: "Jobs / queue", icon: "rocket" as FounderIconName },
  { label: "Media storage", icon: "image" as FounderIconName },
  { label: "Notifications", icon: "message-circle" as FounderIconName },
];

function ServiceHealthRow({
  label,
  icon,
  statusLabel,
  statusClass,
  tone,
  href,
}: {
  label: string;
  icon: FounderIconName;
  statusLabel: string;
  statusClass: string;
  tone: "good" | "warn" | "muted";
  href: string | null;
}) {
  const body = (
    <>
      <span className="founder-service-list__label">
        <FounderIcon name={icon} size={14} />
        {label}
      </span>
      <span className={statusClass}>
        <i className={`founder-status-dot founder-status-dot--${tone}`} />
        {statusLabel}
        {href ? <span className="founder-service-list__open">Open</span> : null}
      </span>
    </>
  );

  if (href) {
    return (
      <a
        className="founder-service-list__row founder-service-list__row--link"
        href={href}
        target="_blank"
        rel="noreferrer"
      >
        {body}
      </a>
    );
  }

  return <div className="founder-service-list__row">{body}</div>;
}

export function FounderSystemHealth({
  version,
  data,
  error,
}: {
  version: HqVersionInfo | null;
  data: HqSystemHealthResponse | null;
  error: string | null;
}) {
  const release = version?.release ?? version?.image_version ?? version?.git_sha?.slice(0, 7) ?? "Unavailable";
  const serviceRows = data
    ? ([
        ["D8N API", "api", data.services.api],
        ["Database", "database", data.services.database],
        ["Jobs / queue", "jobs", data.services.jobs],
        ["Media storage", "media_storage", data.services.media_storage],
        ["Notifications", "notifications", data.services.notifications],
      ] as const)
    : [];
  return (
    <CoveragePanel title="System health" subtitle="Evidence-backed platform status. Click a provider to open its console." icon="rocket" tone="green">
      <div className="founder-system-health__release">
        <span>HQ release</span>
        <strong>{release}</strong>
      </div>
      <ul className="founder-service-list">
        {(serviceRows.length > 0
          ? serviceRows
          : SYSTEM_SERVICES.filter((service) => service.label !== "Third-party services").map(
              (service) => [service.label, null, null] as const,
            )
        ).map(([label, key, service]) => {
          const href = key && service ? serviceProviderHref(key, service) : null;
          return (
            <li key={label}>
              <ServiceHealthRow
                label={label}
                icon={SYSTEM_SERVICES.find((entry) => entry.label === label)?.icon ?? "info"}
                statusLabel={
                  service
                    ? `${healthLabel(service.status)}${service.latency_ms === null ? "" : ` · ${service.latency_ms}ms`}`
                    : "Loading"
                }
                statusClass={service ? healthClass(service.status) : "founder-service-list__status"}
                tone={service?.status === "healthy" ? "good" : service ? "warn" : "muted"}
                href={href}
              />
            </li>
          );
        })}
        {data?.services.third_party.map((service, index) => {
          const name = thirdPartyProviderName(service, index);
          return (
            <li key={`${name}-${index}`}>
              <ServiceHealthRow
                label={name}
                icon="search"
                statusLabel={healthLabel(service.status)}
                statusClass={healthClass(service.status)}
                tone={service.status === "healthy" ? "good" : service.status === "unknown" ? "muted" : "warn"}
                href={providerHref(name)}
              />
            </li>
          );
        })}
      </ul>
      {error ? <p className="founder-panel__error">{error}</p> : null}
      {data ? <p className="founder-reference-empty founder-reference-empty--note">Checked {formatRelativeTime(data.generated_at)}. Unknown means no current probe evidence.</p> : null}
      {!data && !error ? <NeedsBackendNote>Loading system telemetry…</NeedsBackendNote> : null}
    </CoveragePanel>
  );
}

export function FounderRecentErrors() {
  return (
    <CoveragePanel title="Recent errors" subtitle="Grouped operational failures." icon="alert-triangle" tone="rose">
      <div className="founder-error-table" role="table" aria-label="Recent errors">
        <div className="founder-error-table__head" role="row">
          <span role="columnheader">Time</span>
          <span role="columnheader">Service</span>
          <span role="columnheader">Error</span>
          <span role="columnheader">Count</span>
        </div>
        <div className="founder-error-table__empty" role="row">
          <span role="cell" className="founder-reference-empty founder-reference-empty--large">
            Needs backend implementation: D8N does not yet emit a grouped error contract (service,
            exception, occurrence count, first/last seen) to HQ.
          </span>
        </div>
      </div>
      <Link className="founder-link-arrow" to="/hq/errors">Open errors</Link>
    </CoveragePanel>
  );
}

/** Queue counts (open/awaiting/photos) already live in the Trust & Safety panel
 * below — this card is for the report rows themselves, which need a list
 * endpoint (see HQ-BACKEND-TODO.md #6) rather than repeating those counts. */
export function FounderRecentReports() {
  return (
    <CoveragePanel title="Recent reports" subtitle="Latest items in the trust queue." icon="shield" tone="amber">
      <div className="founder-error-table" role="table" aria-label="Recent reports">
        <div className="founder-error-table__head" role="row">
          <span role="columnheader">Reported</span>
          <span role="columnheader">Reason</span>
          <span role="columnheader">Brand</span>
          <span role="columnheader">Status</span>
        </div>
        <div className="founder-error-table__empty" role="row">
          <span role="cell" className="founder-reference-empty founder-reference-empty--large">
            Report rows live in Trust &amp; Safety → Reports (admin reports queue). This card does
            not duplicate that queue or invent a second list.
          </span>
        </div>
      </div>
      <Link className="founder-link-arrow" to="/hq/trust-safety">View trust queue</Link>
    </CoveragePanel>
  );
}
