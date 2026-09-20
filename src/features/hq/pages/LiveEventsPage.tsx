import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fetchHqLiveEvents, hqErrorMessage } from "../../../lib/hq/api.ts";
import { canReadSecurityAlerts } from "../../../lib/hq/enforcementAccess.ts";
import type {
  HqLiveEvent,
  HqLiveEventCategory,
  HqLiveEventSeverity,
} from "../../../lib/hq/types.ts";
import { StateBanner, StatusBadge } from "../components/HqPrimitives.tsx";
import { formatRelativeTime } from "../founder/formatRelativeTime.ts";
import { useHqOperator } from "../useHqOperator.ts";

const POLL_MS = 8_000;
const MAX_KEPT = 500;

const CATEGORY_LABEL: Record<HqLiveEventCategory, string> = {
  member: "Member",
  profile: "Profile",
  marketplace: "Marketplace",
  conversation: "Conversation",
  trust_safety: "Trust & Safety",
  security: "Security",
  operator: "Operator",
  system: "System",
};

const SEVERITY_TONE: Record<HqLiveEventSeverity, "neutral" | "warning" | "danger" | "accent"> = {
  info: "neutral",
  attention: "accent",
  warning: "warning",
  critical: "danger",
};

function formatWhen(value: string): string {
  return value.replace("T", " ").replace(/\.\d+Z$/, "Z");
}

function dedupeAppend(existing: HqLiveEvent[], incoming: HqLiveEvent[]): HqLiveEvent[] {
  if (incoming.length === 0) return existing;
  const seen = new Set(existing.map((event) => event.id));
  const fresh = incoming.filter((event) => !seen.has(event.id));
  if (fresh.length === 0) return existing;
  return [...fresh, ...existing]
    .sort((a, b) => (a.occurred_at < b.occurred_at ? 1 : a.occurred_at > b.occurred_at ? -1 : 0))
    .slice(0, MAX_KEPT);
}

function TableSkeleton() {
  return (
    <div className="hq-directory-skeleton" aria-busy="true" aria-label="Loading live events">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="hq-directory-skeleton__row" />
      ))}
    </div>
  );
}

function EventDetail({ event, onClose }: { event: HqLiveEvent; onClose: () => void }) {
  const metadataEntries = Object.entries(event.metadata).filter(([, value]) => value !== null);
  return (
    <aside className="hq-live-detail" aria-label="Event detail">
      <header className="hq-live-detail__header">
        <div>
          <StatusBadge tone={SEVERITY_TONE[event.severity]}>{event.severity}</StatusBadge>
          <h3 className="hq-live-detail__title">{event.title}</h3>
          <p className="hq-live-detail__meta">
            {event.id} · {formatWhen(event.occurred_at)}
          </p>
        </div>
        <button type="button" className="hq-live-detail__close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </header>

      <p className="hq-live-detail__description">{event.description}</p>

      <dl className="hq-kv-grid">
        <div className="hq-kv">
          <dt>Category</dt>
          <dd>{CATEGORY_LABEL[event.category]}</dd>
        </div>
        <div className="hq-kv">
          <dt>Event type</dt>
          <dd>{event.event_type}</dd>
        </div>
        <div className="hq-kv">
          <dt>Brand</dt>
          <dd>{event.brand}</dd>
        </div>
        {event.subject ? (
          <div className="hq-kv">
            <dt>Subject</dt>
            <dd>
              {event.subject.type} #{event.subject.id ?? "—"}
            </dd>
          </div>
        ) : null}
      </dl>

      {metadataEntries.length > 0 ? (
        <>
          <h4 className="hq-live-detail__subhead">Metadata</h4>
          <dl className="hq-kv-grid">
            {metadataEntries.map(([key, value]) => (
              <div className="hq-kv" key={key}>
                <dt>{key.replace(/_/g, " ")}</dt>
                <dd className="hq-live-detail__metadata-value">
                  {typeof value === "string" || typeof value === "number"
                    ? String(value)
                    : JSON.stringify(value)}
                </dd>
              </div>
            ))}
          </dl>
        </>
      ) : null}

      {event.subject?.type === "member" && event.subject.id ? (
        <Link className="hq-inline-link" to={`/hq/members/${encodeURIComponent(String(event.subject.id))}`}>
          Open Member 360 →
        </Link>
      ) : null}
    </aside>
  );
}

/**
 * Owns fetch/poll state for one brand scope. Keyed by that scope in the
 * parent so flipping "All brands" remounts this instead of resetting state
 * from inside an effect (which react-hooks/set-state-in-effect flags, and
 * which would race the in-flight fetch from the previous scope anyway).
 */
function LiveEventsFeed({ allBrands }: { allBrands: boolean }) {
  const [load, setLoad] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState<string>();
  const [events, setEvents] = useState<HqLiveEvent[]>([]);
  const [category, setCategory] = useState<"all" | HqLiveEventCategory>("all");
  const [severity, setSeverity] = useState<"all" | HqLiveEventSeverity>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [pending, setPending] = useState<HqLiveEvent[]>([]);

  const cursorRef = useRef<string | null>(null);
  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    let cancelled = false;
    void fetchHqLiveEvents({ brand: allBrands ? "all" : undefined, limit: 200 })
      .then((result) => {
        if (cancelled) return;
        setEvents(result.events);
        cursorRef.current = result.generated_at;
        setLoad("ready");
      })
      .catch((caught) => {
        if (cancelled) return;
        setMessage(hqErrorMessage(caught));
        setLoad("error");
      });

    return () => {
      cancelled = true;
    };
  }, [allBrands]);

  useEffect(() => {
    if (load !== "ready") return;
    const interval = window.setInterval(() => {
      const since = cursorRef.current;
      if (!since) return;
      void fetchHqLiveEvents({ brand: allBrands ? "all" : undefined, since, limit: 100 })
        .then((result) => {
          cursorRef.current = result.generated_at;
          if (result.events.length === 0) return;
          if (pausedRef.current) {
            setPending((prev) => dedupeAppend(prev, result.events));
          } else {
            setEvents((prev) => dedupeAppend(prev, result.events));
          }
        })
        .catch(() => {
          // Transient polling failures don't tear down the page -- the next tick retries.
        });
    }, POLL_MS);
    return () => window.clearInterval(interval);
  }, [load, allBrands]);

  function resume() {
    setEvents((prev) => dedupeAppend(prev, pending));
    setPending([]);
    setPaused(false);
  }

  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<HqLiveEventCategory, number>> = {};
    for (const event of events) counts[event.category] = (counts[event.category] ?? 0) + 1;
    return counts;
  }, [events]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return events.filter((event) => {
      if (category !== "all" && event.category !== category) return false;
      if (severity !== "all" && event.severity !== severity) return false;
      if (
        term &&
        !event.title.toLowerCase().includes(term) &&
        !event.description.toLowerCase().includes(term) &&
        !event.event_type.toLowerCase().includes(term)
      ) {
        return false;
      }
      return true;
    });
  }, [events, category, severity, search]);

  const selected = selectedId ? events.find((event) => event.id === selectedId) ?? null : null;

  return (
    <>
      <div className="hq-live-header__actions">
        <button type="button" className="hq-btn" onClick={() => setPaused((value) => !value)}>
          {paused ? "Resume" : "Pause"}
        </button>
      </div>

      {pending.length > 0 ? (
        <button type="button" className="hq-live-newbanner" onClick={resume}>
          {pending.length} new event{pending.length === 1 ? "" : "s"} — show
        </button>
      ) : null}

      <div className="hq-live-filters">
        <div className="hq-live-tabs" role="tablist" aria-label="Category">
          <button
            type="button"
            className={`hq-live-tab${category === "all" ? " is-active" : ""}`}
            onClick={() => setCategory("all")}
          >
            All Events <span className="hq-live-tab__count">{events.length}</span>
          </button>
          {(Object.keys(CATEGORY_LABEL) as HqLiveEventCategory[])
            .filter((key) => categoryCounts[key])
            .map((key) => (
              <button
                type="button"
                key={key}
                className={`hq-live-tab${category === key ? " is-active" : ""}`}
                onClick={() => setCategory(key)}
              >
                {CATEGORY_LABEL[key]} <span className="hq-live-tab__count">{categoryCounts[key]}</span>
              </button>
            ))}
        </div>
        <div className="hq-live-filters__row">
          <select
            className="hq-select"
            value={severity}
            onChange={(event) => setSeverity(event.target.value as typeof severity)}
            aria-label="Severity"
          >
            <option value="all">All severity</option>
            <option value="info">Info</option>
            <option value="attention">Attention</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
          <input
            className="hq-input"
            type="search"
            placeholder="Search events, type…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <div className="hq-live-layout">
        <div className="hq-live-stream">
          {load === "loading" ? <TableSkeleton /> : null}
          {load === "error" ? (
            <StateBanner tone="error" title="Could not load the event feed" body={message ?? "Try again."} />
          ) : null}
          {load === "ready" ? (
            filtered.length === 0 ? (
              <p className="hq-loading">No events match the current filters.</p>
            ) : (
              <ul className="hq-live-list">
                {filtered.map((event) => (
                  <li key={event.id}>
                    <button
                      type="button"
                      className={`hq-live-row${selectedId === event.id ? " is-selected" : ""}`}
                      onClick={() => setSelectedId(event.id)}
                    >
                      <span className={`hq-live-row__dot hq-live-row__dot--${event.severity}`} aria-hidden="true" />
                      <span className="hq-live-row__body">
                        <strong>{event.title}</strong>
                        <span className="hq-live-row__desc">{event.description}</span>
                      </span>
                      <span className="hq-live-row__brand">{event.brand}</span>
                      <span className="hq-live-row__when">{formatRelativeTime(event.occurred_at)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : null}
        </div>

        {selected ? (
          <EventDetail event={selected} onClose={() => setSelectedId(null)} />
        ) : (
          <aside className="hq-live-detail hq-live-detail--empty">
            <p className="hq-loading">Select an event to see its detail.</p>
          </aside>
        )}
      </div>
    </>
  );
}

export default function LiveEventsPage() {
  const { operator } = useHqOperator();
  const canView = canReadSecurityAlerts(operator);
  const [allBrands, setAllBrands] = useState(false);

  if (!operator) return null;

  return (
    <div className="hq-content hq-content--stack hq-page-live">
      <header className="hq-live-header">
        <div>
          <h1 className="hq-live-header__title">
            Live / Events <span className="hq-live-pill">● LIVE</span>
          </h1>
          <p className="hq-card__subtitle">Everything happening across D8N in real time.</p>
        </div>
        {canView ? (
          <label className="hq-live-toggle">
            <input
              type="checkbox"
              checked={allBrands}
              onChange={(event) => setAllBrands(event.target.checked)}
            />
            All brands
          </label>
        ) : null}
      </header>

      {canView ? (
        <LiveEventsFeed key={allBrands ? "all" : "brand"} allBrands={allBrands} />
      ) : (
        <StateBanner
          tone="forbidden"
          title="Live / Events not enabled"
          body="Your operator role does not include hq.security_alerts.read. Backend authorization is authoritative — ask an admin if you need this access."
        />
      )}
    </div>
  );
}
