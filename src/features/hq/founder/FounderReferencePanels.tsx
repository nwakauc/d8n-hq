import { useState } from "react";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import type {
  HqCommandCentreHealth,
  HqSecurityAlertList,
  HqVersionInfo,
} from "../../../lib/hq/types.ts";
import { formatRelativeTime } from "./formatRelativeTime.ts";
import { FounderIcon, FounderIconBadge, type FounderIconName } from "./founderIcons.tsx";
import { humanizeSecurityEvent } from "./securityEventLabels.ts";
import { FounderHorizontalBars } from "./charts/FounderCharts.tsx";

/** Panels below render the reference layout's full visual shell — chart frames,
 * tabs, rows — with every value left null/"needs backend" rather than invented,
 * so wiring a real endpoint later only means passing data in, not rebuilding UI. */
function NeedsBackendNote({ children }: { children: ReactNode }) {
  return <p className="founder-reference-empty founder-reference-empty--note">{children}</p>;
}

function metricCount(metric: { status: string; value?: number | Record<string, number> }): string | number {
  return metric.status === "available" && typeof metric.value === "number" ? metric.value : "—";
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
          <p className="founder-panel__subtitle">Operational events currently available to HQ.</p>
        </div>
        <span className="founder-live-activity__status"><i /> Live</span>
      </header>
      {error ? <p className="founder-panel__error">{error}</p> : null}
      {!error && rows.length > 0 ? (
        <ul className="founder-activity-list">
          {rows.slice(0, 7).map((row) => (
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

const DEVICE_ROWS: Array<{ label: string; icon: FounderIconName }> = [
  { label: "Android", icon: "activity" },
  { label: "iOS", icon: "activity" },
  { label: "Web", icon: "eye" },
  { label: "Other", icon: "info" },
];

export function FounderDevicesAndPlatforms() {
  const [activeBrand, setActiveBrand] = useState(RETENTION_BRANDS[0]);
  return (
    <CoveragePanel title="Devices & platforms" subtitle="Active product surfaces and app versions." icon="search" tone="green">
      <BrandTabs tabs={RETENTION_BRANDS} active={activeBrand} onChange={setActiveBrand} />
      <FounderHorizontalBars
        ariaLabel="Devices and platforms"
        rows={DEVICE_ROWS.map((row) => ({ key: row.label, label: row.label, value: null, max: 1, tone: "#16a34a" }))}
      />
      <NeedsBackendNote>
        Needs backend implementation: device/OS/app-version is not captured on sessions or events yet.
      </NeedsBackendNote>
    </CoveragePanel>
  );
}

const NOTIFICATION_CHANNELS: Array<{ label: string; icon: FounderIconName }> = [
  { label: "Push", icon: "message-circle" },
  { label: "Email", icon: "message-circle" },
  { label: "SMS", icon: "message-circle" },
];

export function FounderNotificationHealth() {
  return (
    <CoveragePanel title="Notification health" subtitle="Delivery health by channel." icon="message-circle" tone="amber">
      <ul className="founder-notification-list">
        {NOTIFICATION_CHANNELS.map((channel) => (
          <li key={channel.label} className="founder-notification-list__row">
            <span className="founder-notification-list__label">
              <FounderIcon name={channel.icon} size={15} />
              {channel.label}
            </span>
            <span className="founder-notification-list__stat">
              <i className="founder-status-dot founder-status-dot--muted" />
              Delivered —
            </span>
            <span className="founder-notification-list__stat founder-notification-list__stat--muted">Fail —</span>
          </li>
        ))}
      </ul>
      <NeedsBackendNote>
        Needs backend implementation: provider delivery receipts (push/email/SMS) are not surfaced to HQ.
      </NeedsBackendNote>
      <Link className="founder-link-arrow" to="/hq">View delivery logs</Link>
    </CoveragePanel>
  );
}

const SYSTEM_SERVICES = [
  { label: "D8N API", icon: "activity" as FounderIconName },
  { label: "Database", icon: "users" as FounderIconName },
  { label: "Jobs / queue", icon: "rocket" as FounderIconName },
  { label: "Media storage", icon: "image" as FounderIconName },
  { label: "Notifications", icon: "message-circle" as FounderIconName },
  { label: "Third-party services", icon: "search" as FounderIconName },
];

export function FounderSystemHealth({ version }: { version: HqVersionInfo | null }) {
  const release = version?.release ?? version?.image_version ?? version?.git_sha?.slice(0, 7) ?? "Unavailable";
  return (
    <CoveragePanel title="System health" subtitle="Evidence-backed platform status." icon="rocket" tone="green">
      <div className="founder-system-health__release">
        <span>HQ release</span>
        <strong>{release}</strong>
      </div>
      <ul className="founder-service-list">
        {SYSTEM_SERVICES.map((service) => (
          <li key={service.label} className="founder-service-list__row">
            <span className="founder-service-list__label">
              <FounderIcon name={service.icon} size={14} />
              {service.label}
            </span>
            <span className="founder-service-list__status">
              <i className="founder-status-dot founder-status-dot--muted" />
              Needs backend
            </span>
          </li>
        ))}
      </ul>
      <NeedsBackendNote>
        Needs backend implementation: per-service availability/latency/error-rate telemetry is not
        exported to HQ beyond this app's own release marker.
      </NeedsBackendNote>
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

export function FounderRecentReports({ health }: { health: HqCommandCentreHealth }) {
  return (
    <CoveragePanel title="Recent reports" subtitle="Trust queue requiring review." icon="shield" tone="amber">
      <ul className="founder-reference-list">
        <li className="founder-reference-list__row"><span>Open reports</span><strong>{metricCount(health.trust_safety.open_reports)}</strong></li>
        <li className="founder-reference-list__row"><span>Awaiting decision</span><strong>{metricCount(health.trust_safety.awaiting_decision)}</strong></li>
        <li className="founder-reference-list__row"><span>Pending photos</span><strong>{metricCount(health.trust_safety.pending_photo_reviews)}</strong></li>
      </ul>
      <NeedsBackendNote>
        Report subject/type/evidence preview needs backend implementation — the queue counts above are
        real; per-report detail rows will land once the reports list endpoint ships.
      </NeedsBackendNote>
      <Link className="founder-link-arrow" to="/hq/trust-safety">View trust queue</Link>
    </CoveragePanel>
  );
}
