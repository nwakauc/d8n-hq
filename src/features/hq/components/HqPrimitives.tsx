import { useState, type ReactNode } from "react";
import type {
  HqDiscoveryExclusionBreakdown,
  HqDiscoveryInteractionEntry,
  HqDiscoveryToday,
} from "../../../lib/hq/types.ts";

type StatusTone = "neutral" | "accent" | "success" | "warning" | "danger";

const TONE_LABEL: Record<StatusTone, string> = {
  neutral: "",
  accent: "",
  success: "OK",
  warning: "Warning",
  danger: "Critical",
};

export function StatusBadge({
  children,
  tone = "neutral",
  title,
}: {
  children: ReactNode;
  tone?: StatusTone;
  title?: string;
}) {
  const a11y = TONE_LABEL[tone];
  return (
    <span className={`hq-badge hq-badge--${tone}`} title={title}>
      {a11y ? <span className="visually-hidden">{a11y}: </span> : null}
      {children}
    </span>
  );
}

export function EmptyState({
  badge = "NO DATA",
  title,
  body,
  tone = "neutral",
}: {
  badge?: string;
  title: string;
  body: string;
  tone?: StatusTone;
}) {
  return (
    <div className="hq-empty" role="status">
      <StatusBadge tone={tone}>{badge}</StatusBadge>
      <h3 className="hq-empty__title">{title}</h3>
      <p className="hq-empty__body">{body}</p>
    </div>
  );
}

export function UnavailableState({
  badge,
  title,
  body,
}: {
  badge: string;
  title: string;
  body: string;
}) {
  const tone: StatusTone =
    badge === "NOT CONFIGURED" || badge === "INSUFFICIENT DATA" ? "warning" : "neutral";
  return <EmptyState badge={badge} title={title} body={body} tone={tone} />;
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="hq-card__header">
      <div>
        <h2 className="hq-card__title">{title}</h2>
        {subtitle ? <p className="hq-card__subtitle">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function MetricCard({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="hq-card">
      <SectionHeader title={title} action={action} />
      {children}
    </section>
  );
}

export function ScoreCard({
  label,
  badge = "NOT CONFIGURED",
  hint = "No trustworthy inputs yet.",
}: {
  label: string;
  badge?: string;
  hint?: string;
}) {
  return (
    <article className="hq-card hq-score-card" aria-label={`${label} score`}>
      <div className="hq-score-card__label">{label}</div>
      <div className="hq-score-card__value">
        <StatusBadge tone="warning">{badge}</StatusBadge>
      </div>
      <p className="hq-score-card__hint">{hint}</p>
    </article>
  );
}

export function StatGroup({
  items,
}: {
  items: Array<{ label: string; value: string | number | null | undefined }>;
}) {
  return (
    <dl className="hq-kv-grid">
      {items.map((item) => (
        <div className="hq-kv" key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value === null || item.value === undefined || item.value === "" ? "—" : item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function PageToolbar({ children }: { children: ReactNode }) {
  return <div className="hq-page-toolbar">{children}</div>;
}

export function DataTable({
  columns,
  rows,
  empty,
  tableClassName,
  wrapClassName,
}: {
  columns: Array<{ key: string; header: string }>;
  rows: Array<Record<string, ReactNode>>;
  empty?: string;
  tableClassName?: string;
  wrapClassName?: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="hq-table-empty" role="status">
        {empty ?? "No rows."}
      </p>
    );
  }
  const tableClass = tableClassName ? `hq-table ${tableClassName}` : "hq-table";
  const wrapClass = wrapClassName ? `hq-table-wrap ${wrapClassName}` : "hq-table-wrap";
  return (
    <div className={wrapClass} role="region" aria-label="Data table" tabIndex={0}>
      <table className={tableClass}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} scope="col">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((col) => (
                <td key={col.key} data-label={col.header}>
                  {row[col.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DiagnosticBreakdown({
  title = "Discover eligibility",
  eligible,
  ineligibilityReason,
  stages,
}: {
  title?: string;
  eligible: boolean;
  ineligibilityReason?: string | null;
  stages: Array<{ stage: string; description: string; candidate_count: number }>;
}) {
  if (!eligible) {
    return (
      <UnavailableState
        badge="NOT ELIGIBLE"
        title="Member cannot use Discover right now"
        body={
          ineligibilityReason
            ? `Reason: ${ineligibilityReason.replace(/_/g, " ")}.`
            : "The member is not currently eligible for discovery on this brand."
        }
      />
    );
  }

  if (stages.length === 0) {
    return (
      <UnavailableState
        badge="NO DATA"
        title="No funnel stages returned"
        body="The diagnostic succeeded but returned no stage counts."
      />
    );
  }

  const final = stages.find((stage) => stage.stage === "final_eligible_candidates");

  return (
    <div className="hq-diagnostic" aria-label={title}>
      <div className="hq-card__header" style={{ marginBottom: 8 }}>
        <h3 className="hq-diagnostic__title">{title}</h3>
        <StatusBadge tone="success">Eligible</StatusBadge>
      </div>
      <p className="hq-card__subtitle" style={{ marginBottom: 10 }}>
        Live read-only re-run of discovery scopes. Gender, age, and distance are one combined
        middle stage — not separate filter counts.
      </p>
      <dl className="hq-diagnostic__rows">
        {stages.map((step, index) => (
          <div className="hq-diagnostic__row" key={step.stage}>
            <dt>
              <span className="hq-nav-link__meta">{String(index + 1).padStart(2, "0")}</span>{" "}
              {step.description}
              <div className="hq-card__subtitle" style={{ marginTop: 2 }}>
                {step.stage}
              </div>
            </dt>
            <dd>{step.candidate_count.toLocaleString()}</dd>
          </div>
        ))}
      </dl>
      {final ? (
        <div className="hq-diagnostic__final">
          <span>Ultimately remaining</span>
          <span>{final.candidate_count.toLocaleString()}</span>
        </div>
      ) : null}
    </div>
  );
}

export function CollapsibleSection({
  id,
  title,
  badge,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  badge?: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const panelId = `${id}-panel`;
  return (
    <section className="hq-section">
      <button
        type="button"
        className="hq-section__toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <div className="hq-section__heading">
          <h2 className="hq-section__title">{title}</h2>
          {badge}
        </div>
        <span className="hq-section__chevron" aria-hidden="true">
          {open ? "▾" : "▸"}
        </span>
      </button>
      {open ? (
        <div className="hq-section__body" id={panelId}>
          {children}
        </div>
      ) : null}
    </section>
  );
}

function formatWhenShort(value: string | null | undefined): string {
  if (!value) return "—";
  return value.replace("T", " ").replace(/\.\d+Z$/, "Z");
}

const EXCLUSION_CATEGORY_LABELS: Record<keyof HqDiscoveryExclusionBreakdown, string> = {
  you_liked: "You Liked",
  passed: "Passed",
  matched: "Active Match",
  blocked: "Blocked",
};

const EXCLUSION_CATEGORY_ORDER: Array<keyof HqDiscoveryExclusionBreakdown> = [
  "you_liked",
  "passed",
  "matched",
  "blocked",
];

function deletedReasonLabel(reason: HqDiscoveryInteractionEntry["deleted_reason"]): string {
  if (!reason) return "—";
  return reason.replace(/_/g, " ");
}

/** Inspectable member lists behind each Discovery exclusion category (You
 * Liked / Passed / Active Match / Blocked), each entry tagged active/
 * inactive with a timestamp and, where present, `deleted_reason` -- the
 * operator requirement is to inspect *who*, not just a count. Collapsed by
 * default; each category expands independently. */
export function DiscoveryExclusionBreakdownPanel({
  breakdown,
}: {
  breakdown: Partial<HqDiscoveryExclusionBreakdown>;
}) {
  const [openCategory, setOpenCategory] = useState<keyof HqDiscoveryExclusionBreakdown | null>(null);
  const categories = EXCLUSION_CATEGORY_ORDER.filter((key) => breakdown[key] !== undefined);

  if (categories.length === 0) {
    return (
      <UnavailableState
        badge="NO DATA"
        title="No exclusion breakdown returned"
        body="The diagnostic succeeded but returned no exclusion categories."
      />
    );
  }

  return (
    <div className="hq-diagnostic" aria-label="Discovery exclusion breakdown">
      <p className="hq-card__subtitle" style={{ marginBottom: 10 }}>
        Every member excluded from this member&apos;s reciprocal-eligible pool, by category. Includes
        inactive rows (withdrawn Likes, undone Passes, unmatched Matches) so an operator can see why the
        pool is smaller than it looks — not just the live count.
      </p>
      <div style={{ display: "grid", gap: 8 }}>
        {categories.map((key) => {
          const entries = breakdown[key] ?? [];
          const activeCount = entries.filter((entry) => entry.active).length;
          const open = openCategory === key;
          return (
            <div key={key} className="hq-card" style={{ padding: 10 }}>
              <button
                type="button"
                className="hq-btn hq-btn--ghost hq-btn--sm"
                aria-expanded={open}
                onClick={() => setOpenCategory(open ? null : key)}
                style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <span>{EXCLUSION_CATEGORY_LABELS[key]}</span>
                <span className="hq-card__subtitle">
                  {activeCount} active / {entries.length} total {open ? "▾" : "▸"}
                </span>
              </button>
              {open ? (
                <div style={{ marginTop: 8 }}>
                  <DataTable
                    columns={[
                      { key: "member", header: "Member" },
                      { key: "status", header: "Status" },
                      { key: "interacted_at", header: "Interacted" },
                      { key: "deleted_reason", header: "Deleted reason" },
                    ]}
                    rows={entries.map((entry) => ({
                      member: entry.profile.display_name ?? entry.profile.id,
                      status: entry.active ? (
                        <StatusBadge tone="success">Active</StatusBadge>
                      ) : (
                        <StatusBadge tone="neutral">Inactive</StatusBadge>
                      ),
                      interacted_at: formatWhenShort(entry.interacted_at),
                      deleted_reason: deletedReasonLabel(entry.deleted_reason),
                    }))}
                    empty={`No ${EXCLUSION_CATEGORY_LABELS[key].toLowerCase()} entries.`}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Today's real Introduction allocation and live Explore availability.
 * Vocabulary is deliberately restricted to "allocated" and "returned" --
 * D8N has no seen/viewed/opened instrumentation, so the UI must never
 * imply it does. */
export function DiscoveryTodayPanel({ today }: { today: HqDiscoveryToday | null }) {
  if (!today) {
    return (
      <UnavailableState
        badge="NOT AVAILABLE"
        title="Today's allocation state is not available"
        body="The member is not currently eligible, or discovery is not configured for this brand."
      />
    );
  }

  const { introduction, explore } = today;

  return (
    <div className="hq-diagnostic" aria-label="Today's Discovery state">
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <div className="hq-card" style={{ padding: 10 }}>
          <p className="hq-card__title" style={{ margin: 0 }}>Introduction</p>
          {introduction.configured ? (
            <StatGroup
              items={[
                { label: "Allocated today", value: introduction.allocated_count ?? 0 },
                { label: "Daily limit", value: introduction.daily_limit ?? "—" },
                { label: "Finalized at", value: formatWhenShort(introduction.finalized_at) },
              ]}
            />
          ) : (
            <p className="hq-card__subtitle">Introduction is not configured for this brand.</p>
          )}
        </div>
        <div className="hq-card" style={{ padding: 10 }}>
          <p className="hq-card__title" style={{ margin: 0 }}>Explore</p>
          {explore.configured ? (
            <StatGroup
              items={[
                {
                  label: "Returned right now (live)",
                  value: explore.available_count ?? 0,
                },
              ]}
            />
          ) : (
            <p className="hq-card__subtitle">Explore is not configured for this brand.</p>
          )}
          <p className="hq-card__subtitle" style={{ marginTop: 4 }}>
            Computed on demand — Explore has no allocation table, so there is no historical
            &quot;returned today&quot; count, only what would be returned right now.
          </p>
        </div>
      </div>
    </div>
  );
}

export function StateBanner({
  tone,
  title,
  body,
}: {
  tone: "error" | "forbidden" | "neutral";
  title: string;
  body: string;
}) {
  const className =
    tone === "error"
      ? "hq-state-banner hq-state-banner--error"
      : tone === "forbidden"
        ? "hq-state-banner hq-state-banner--forbidden"
        : "hq-state-banner";
  return (
    <div className={className} role="alert">
      <h2>{title}</h2>
      <p>{body}</p>
    </div>
  );
}
