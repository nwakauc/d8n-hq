import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  CircleAlert,
  Download,
  ExternalLink,
  FileText,
  Heart,
  Image,
  Info,
  Maximize2,
  MessageCircle,
  Pause,
  Play,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  UserPlus,
  Users,
  X,
  ChevronDown,
} from "lucide-react";
import { fetchHqLiveEvents, hqErrorMessage } from "../../../lib/hq/api.ts";
import { canReadSecurityAlerts } from "../../../lib/hq/enforcementAccess.ts";
import type { HqLiveEvent, HqLiveEventCategory, HqLiveEventSeverity } from "../../../lib/hq/types.ts";
import { StateBanner } from "../components/HqPrimitives.tsx";
import { formatRelativeTime } from "../founder/formatRelativeTime.ts";
import { useHqOperator } from "../useHqOperator.ts";

const POLL_MS = 8_000;
const MAX_KEPT = 500;

const CATEGORY_LABEL: Record<HqLiveEventCategory, string> = {
  member: "Member",
  marketplace: "Marketplace",
  conversation: "Conversation",
  profile: "Profile",
  trust_safety: "Trust & Safety",
  security: "Security",
  system: "System",
  operator: "Operator",
};

const CATEGORY_ICON: Record<HqLiveEventCategory, typeof Activity> = {
  member: Users,
  marketplace: Heart,
  conversation: MessageCircle,
  profile: Image,
  trust_safety: ShieldAlert,
  security: Shield,
  system: Settings,
  operator: UserPlus,
};

const CATEGORY_TONE: Record<HqLiveEventCategory, string> = {
  member: "member",
  marketplace: "marketplace",
  conversation: "conversation",
  profile: "profile",
  trust_safety: "safety",
  security: "security",
  system: "system",
  operator: "operator",
};

const SEVERITY_TONE: Record<HqLiveEventSeverity, string> = {
  info: "info",
  attention: "attention",
  warning: "warning",
  critical: "critical",
};

type FeedRange = "hour" | "today" | "seven_days";
type DetailTab = "overview" | "context" | "related" | "json";

function formatWhen(value: string): string {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatLongWhen(value: string): string {
  return new Date(value).toLocaleString([], { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function brandLabel(value: string): string {
  const labels: Record<string, string> = { date9ja: "Date9ja", dateza: "DateZA", hookus: "HookUs", platform: "Platform" };
  return labels[value.toLowerCase()] ?? value;
}

function eventLooksLike(event: HqLiveEvent, terms: string[]): boolean {
  const haystack = `${event.event_type} ${event.title} ${event.description}`.toLowerCase();
  return terms.some((term) => haystack.includes(term));
}

function isSelfReadAuditEvent(event: HqLiveEvent): boolean {
  return event.event_type.toLowerCase() === "hq.live_events.viewed";
}

function dedupeAppend(existing: HqLiveEvent[], incoming: HqLiveEvent[]): HqLiveEvent[] {
  if (incoming.length === 0) return existing;
  const seen = new Set(existing.map((event) => event.id));
  const fresh = incoming.filter((event) => !seen.has(event.id) && !isSelfReadAuditEvent(event));
  if (fresh.length === 0) return existing;
  return [...fresh, ...existing]
    .sort((a, b) => (a.occurred_at < b.occurred_at ? 1 : a.occurred_at > b.occurred_at ? -1 : 0))
    .slice(0, MAX_KEPT);
}

function TableSkeleton() {
  return <div className="hq-directory-skeleton" aria-busy="true" aria-label="Loading live events">{Array.from({ length: 8 }, (_, index) => <div key={index} className="hq-directory-skeleton__row" />)}</div>;
}

function CategoryIcon({ category, size = 16 }: { category: HqLiveEventCategory; size?: number }) {
  const Icon = CATEGORY_ICON[category];
  return <Icon size={size} aria-hidden="true" />;
}

function EventKpi({ icon: Icon, tone, value, label, detail, unavailable = false }: { icon: typeof Activity; tone: string; value: string; label: string; detail: string; unavailable?: boolean }) {
  return <div className={`hq-live-kpi hq-live-kpi--${tone}${unavailable ? " is-unavailable" : ""}`} title={detail}>
    <span className="hq-live-kpi__icon"><Icon size={18} aria-hidden="true" /></span>
    <span className="hq-live-kpi__body"><strong>{value}</strong><span>{label}</span><small>{detail}</small></span>
  </div>;
}

function EventDetail({ event, related, onClose }: { event: HqLiveEvent; related: HqLiveEvent[]; onClose: () => void }) {
  const [tab, setTab] = useState<DetailTab>("overview");
  const metadataEntries = Object.entries(event.metadata).filter(([, value]) => value !== null);
  const Icon = CATEGORY_ICON[event.category];
  return <aside className="hq-live-detail" aria-label="Event detail">
    <header className="hq-live-detail__header">
      <div className="hq-live-detail__heading"><span className={`hq-live-event-icon hq-live-event-icon--${CATEGORY_TONE[event.category]}`}><Icon size={17} aria-hidden="true" /></span><div>
        <span className={`hq-live-severity hq-live-severity--${SEVERITY_TONE[event.severity]}`}><span /> {event.severity}</span>
        <h2 className="hq-live-detail__title">{event.title}</h2><p className="hq-live-detail__meta">Event ID: {event.id}</p><p className="hq-live-detail__meta">{formatLongWhen(event.occurred_at)}</p>
      </div></div>
      <button type="button" className="hq-live-detail__close" onClick={onClose} aria-label="Close event details"><X size={17} aria-hidden="true" /></button>
    </header>
    <div className="hq-live-detail__tabs" role="tablist" aria-label="Event detail sections">
      {(["overview", "context", "related", "json"] as DetailTab[]).map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} className={tab === item ? "is-active" : ""} onClick={() => setTab(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}
    </div>
    {tab === "overview" ? <div className="hq-live-detail__content">
      <p className="hq-live-detail__description">{event.description}</p>
      {event.subject ? <section className="hq-live-subject-card"><span className="hq-live-subject-card__icon"><Users size={18} aria-hidden="true" /></span><div><strong>{`${event.subject.type} ${event.subject.id ? `#${event.subject.id}` : ""}`}</strong><span>{event.subject.type === "member" ? "Linked event subject" : "Related record"}</span></div>{event.subject.type === "member" && event.subject.id ? <Link className="hq-inline-link" to={`/hq/members/${encodeURIComponent(String(event.subject.id))}`}>View member <ExternalLink size={13} aria-hidden="true" /></Link> : null}</section> : null}
      <h3 className="hq-live-detail__subhead">Event metadata</h3>
      <dl className="hq-live-detail__facts"><div><dt>Category</dt><dd>{CATEGORY_LABEL[event.category]}</dd></div><div><dt>Event type</dt><dd>{event.event_type}</dd></div><div><dt>Brand</dt><dd>{brandLabel(event.brand)}</dd></div><div><dt>Severity</dt><dd>{event.severity}</dd></div>{metadataEntries.map(([key, value]) => <div key={key}><dt>{key.replace(/_/g, " ")}</dt><dd>{typeof value === "string" || typeof value === "number" ? String(value) : JSON.stringify(value)}</dd></div>)}</dl>
      <div className="hq-live-detail__actions">{event.subject?.type === "member" && event.subject.id ? <Link className="hq-btn hq-btn--primary" to={`/hq/members/${encodeURIComponent(String(event.subject.id))}`}>View Member 360</Link> : null}<Link className="hq-btn hq-btn--ghost" to="/hq/audit">View in Audit Log</Link></div>
    </div> : null}
    {tab === "context" ? <div className="hq-live-detail__content"><h3 className="hq-live-detail__subhead">Source context</h3><p className="hq-live-detail__description">This event is a read-only projection from D8N’s operational event sources. Sensitive values are only shown when the backend contract permits them.</p><dl className="hq-live-detail__facts"><div><dt>Source</dt><dd>{String(event.metadata.source ?? "D8N event feed")}</dd></div><div><dt>Environment</dt><dd>{String(event.metadata.environment ?? "Production")}</dd></div><div><dt>Correlation ID</dt><dd>{String(event.metadata.correlation_id ?? "Not supplied")}</dd></div></dl></div> : null}
    {tab === "related" ? <div className="hq-live-detail__content"><h3 className="hq-live-detail__subhead">Related events ({related.length})</h3>{related.length === 0 ? <p className="hq-live-detail__description">No related events are present in the loaded window.</p> : <ul className="hq-live-related-list">{related.map((item) => <li key={item.id}><span>{formatWhen(item.occurred_at)}</span><strong>{item.title}</strong></li>)}</ul>}</div> : null}
    {tab === "json" ? <pre className="hq-live-json">{JSON.stringify(event, null, 2)}</pre> : null}
  </aside>;
}

function VolumeFooter({ events }: { events: HqLiveEvent[] }) {
  const [renderNow] = useState(() => Date.now());
  const now = events.reduce((latest, event) => Math.max(latest, new Date(event.occurred_at).getTime()), renderNow);
  const buckets = Array.from({ length: 12 }, (_, index) => { const end = now - index * 5 * 60_000; const start = end - 5 * 60_000; return { entries: events.filter((event) => { const time = new Date(event.occurred_at).getTime(); return time > start && time <= end; }), label: new Date(end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }; }).reverse();
  const max = Math.max(1, ...buckets.map((bucket) => bucket.entries.length));
  const categoryTotals = (Object.keys(CATEGORY_LABEL) as HqLiveEventCategory[]).map((category) => ({ category, count: events.filter((event) => event.category === category).length })).filter((entry) => entry.count > 0);
  return <div className="hq-live-footer-grid">
    <section className="hq-live-summary-card"><header><h2>Event volume <span>(last 60 minutes)</span></h2><Activity size={15} aria-hidden="true" /></header><div className="hq-live-volume-chart" aria-label="Event volume for the last 60 minutes">{buckets.map((bucket, index) => <div className="hq-live-volume-bar" key={`${bucket.label}-${index}`} title={`${bucket.entries.length} events at ${bucket.label}`}><i style={{ height: `${Math.max(8, (bucket.entries.length / max) * 100)}%` }} />{bucket.entries.slice(0, 8).map((event, itemIndex) => <span className={`hq-live-volume-segment hq-live-volume-segment--${CATEGORY_TONE[event.category]}`} key={`${event.id}-${itemIndex}`} />)}</div>)}</div><div className="hq-live-volume-labels"><span>{buckets[0]?.label}</span><span>{buckets[5]?.label}</span><span>{buckets[11]?.label}</span></div></section>
    <section className="hq-live-summary-card hq-live-category-summary"><header><h2>Events by category <span>(loaded window)</span></h2><FileText size={15} aria-hidden="true" /></header>{categoryTotals.length === 0 ? <p className="hq-live-muted">No category data in this window.</p> : categoryTotals.map(({ category, count }) => { const Icon = CATEGORY_ICON[category]; return <div className="hq-live-category-row" key={category}><span className={`hq-live-event-icon hq-live-event-icon--${CATEGORY_TONE[category]}`}><Icon size={13} /></span><span>{CATEGORY_LABEL[category]}</span><strong>{count}</strong></div>; })}</section>
  </div>;
}

function LiveEventsFeed({ allBrands, currentBrand, onAllBrandsChange }: { allBrands: boolean; currentBrand: string; onAllBrandsChange: (allBrands: boolean) => void }) {
  const [load, setLoad] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState<string>();
  const [events, setEvents] = useState<HqLiveEvent[]>([]);
  const [category, setCategory] = useState<"all" | HqLiveEventCategory>("all");
  const [severity, setSeverity] = useState<"all" | HqLiveEventSeverity>("all");
  const [range, setRange] = useState<FeedRange>("hour");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [pending, setPending] = useState<HqLiveEvent[]>([]);
  const [showMore, setShowMore] = useState(false);
  const [subjectOnly, setSubjectOnly] = useState(false);
  const [actionableOnly, setActionableOnly] = useState(false);
  const [renderNow] = useState(() => Date.now());
  const cursorRef = useRef<string | null>(null);
  const pausedRef = useRef(paused);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { let cancelled = false; void fetchHqLiveEvents({ brand: allBrands ? "all" : undefined, limit: 200 }).then((result) => { if (cancelled) return; setEvents(result.events.filter((event) => !isSelfReadAuditEvent(event))); cursorRef.current = result.generated_at; setLoad("ready"); }).catch((caught) => { if (cancelled) return; setMessage(hqErrorMessage(caught)); setLoad("error"); }); return () => { cancelled = true; }; }, [allBrands]);
  useEffect(() => { if (load !== "ready") return; const interval = window.setInterval(() => { const since = cursorRef.current; if (!since) return; void fetchHqLiveEvents({ brand: allBrands ? "all" : undefined, since, limit: 100 }).then((result) => { cursorRef.current = result.generated_at; if (result.events.length === 0) return; if (pausedRef.current) setPending((prev) => dedupeAppend(prev, result.events)); else setEvents((prev) => dedupeAppend(prev, result.events)); }).catch(() => undefined); }, POLL_MS); return () => window.clearInterval(interval); }, [load, allBrands]);
  const feedNow = useMemo(() => events.reduce((latest, event) => Math.max(latest, new Date(event.occurred_at).getTime()), renderNow), [events, renderNow]);
  const rangeStart = range === "hour" ? feedNow - 60 * 60_000 : range === "today" ? new Date(feedNow).setHours(0, 0, 0, 0) : feedNow - 7 * 24 * 60 * 60_000;
  const inRange = useMemo(() => events.filter((event) => new Date(event.occurred_at).getTime() >= rangeStart), [events, rangeStart]);
  const categoryCounts = useMemo(() => (Object.keys(CATEGORY_LABEL) as HqLiveEventCategory[]).reduce((result, key) => { result[key] = inRange.filter((event) => event.category === key).length; return result; }, {} as Record<HqLiveEventCategory, number>), [inRange]);
  const filtered = useMemo(() => { const term = search.trim().toLowerCase(); return inRange.filter((event) => { if (category !== "all" && event.category !== category) return false; if (severity !== "all" && event.severity !== severity) return false; if (subjectOnly && !event.subject) return false; if (actionableOnly && event.severity === "info") return false; if (term && !eventLooksLike(event, [term])) return false; return true; }); }, [inRange, category, severity, search, subjectOnly, actionableOnly]);
  const selected = selectedId ? events.find((event) => event.id === selectedId) ?? null : null;
  const selectedRelated = selected?.subject ? events.filter((event) => event.id !== selected.id && event.subject?.type === selected.subject?.type && event.subject?.id === selected.subject?.id).slice(0, 5) : [];
  const todayEvents = inRange.filter((event) => new Date(event.occurred_at).toDateString() === new Date(feedNow).toDateString());
  const lastHour = events.filter((event) => new Date(event.occurred_at).getTime() >= feedNow - 60 * 60_000);
  const registrations = todayEvents.filter((event) => eventLooksLike(event, ["register", "sign up"])).length;
  const matches = todayEvents.filter((event) => eventLooksLike(event, ["match"])).length;
  const conversations = todayEvents.filter((event) => event.category === "conversation").length;
  const reports = todayEvents.filter((event) => eventLooksLike(event, ["report"])).length;
  const errors = lastHour.filter((event) => event.severity === "critical" || eventLooksLike(event, ["error", "failed"])).length;
  function resume() { setEvents((prev) => dedupeAppend(prev, pending)); setPending([]); setPaused(false); }
  function exportEvents() { const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `d8n-live-events-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url); }
  return <>
    <section className="hq-live-page-heading"><div><h1>Live / Events <span className="hq-live-pill"><span /> LIVE</span></h1><p>Everything happening across D8N in real time.</p></div><div className="hq-live-page-actions"><button type="button" className="hq-btn hq-btn--primary" onClick={() => setPaused((value) => !value)}>{paused ? <Play size={14} /> : <Pause size={14} />} {paused ? "Resume" : "Pause"}</button><button type="button" className="hq-btn hq-btn--ghost" onClick={exportEvents}><Download size={14} /> Export</button><button type="button" className="hq-icon-btn" aria-label="Live page settings"><Settings size={16} /></button><button type="button" className="hq-icon-btn" aria-label="Expand live page"><Maximize2 size={16} /></button></div></section>
    {pending.length > 0 ? <button type="button" className="hq-live-newbanner" onClick={resume}>{pending.length} new event{pending.length === 1 ? "" : "s"} — show</button> : null}
    <section className="hq-live-kpis" aria-label="Live event summary"><EventKpi icon={Activity} tone="slate" value={(lastHour.length / 60).toFixed(1)} label="Events / min" detail="Derived from events loaded in the last 60 minutes." /><EventKpi icon={UserPlus} tone="green" value={String(registrations)} label="Registrations" detail="Registration events loaded today." /><EventKpi icon={Heart} tone="rose" value={String(matches)} label="Matches" detail="Match events loaded today." /><EventKpi icon={MessageCircle} tone="blue" value={String(conversations)} label="Conversations" detail="Conversation events loaded today." /><EventKpi icon={Shield} tone="green" value={String(reports)} label="Reports" detail="Report events loaded today." /><EventKpi icon={AlertTriangle} tone="red" value={String(errors)} label="Errors" detail="Critical or failed events loaded in the last hour." /><EventKpi icon={Users} tone="teal" value="—" label="Active users" detail="Live presence is not currently instrumented." unavailable /></section>
    <section className="hq-live-filter-bar" aria-label="Live event filters"><label className="hq-live-filter-select"><span className="visually-hidden">Brand</span><select value={allBrands ? "all" : "current"} onChange={(event) => onAllBrandsChange(event.target.value === "all")} aria-label="Brand"><option value="all">All Brands</option><option value="current">{brandLabel(currentBrand)} (current)</option></select><ChevronDown size={14} /></label><label className="hq-live-filter-select"><span className="visually-hidden">Time range</span><select value={range} onChange={(event) => setRange(event.target.value as FeedRange)} aria-label="Time range"><option value="hour">Last 1 hour</option><option value="today">Today</option><option value="seven_days">Last 7 days</option></select><ChevronDown size={14} /></label><label className="hq-live-filter-select"><span className="visually-hidden">Category</span><select value={category} onChange={(event) => setCategory(event.target.value as typeof category)} aria-label="Category"><option value="all">All Categories</option>{(Object.keys(CATEGORY_LABEL) as HqLiveEventCategory[]).map((key) => <option key={key} value={key}>{CATEGORY_LABEL[key]}</option>)}</select><ChevronDown size={14} /></label><label className="hq-live-filter-select"><span className="visually-hidden">Severity</span><select value={severity} onChange={(event) => setSeverity(event.target.value as typeof severity)} aria-label="Severity"><option value="all">All Severity</option><option value="info">Info</option><option value="attention">Attention</option><option value="warning">Warning</option><option value="critical">Critical</option></select><ChevronDown size={14} /></label><label className="hq-live-search"><Search size={15} aria-hidden="true" /><input type="search" placeholder="Search events, member, email, report, error ID…" value={search} onChange={(event) => setSearch(event.target.value)} /></label><button type="button" className={`hq-live-more-filter${showMore ? " is-active" : ""}`} onClick={() => setShowMore((value) => !value)}><CircleAlert size={14} /> More filters</button></section>
    {showMore ? <div className="hq-live-more-row"><label><input type="checkbox" checked={subjectOnly} onChange={(event) => setSubjectOnly(event.target.checked)} /> Has linked subject</label><label><input type="checkbox" checked={actionableOnly} onChange={(event) => setActionableOnly(event.target.checked)} /> Attention and above</label></div> : null}
    <div className="hq-live-tabs" role="tablist" aria-label="Event categories"><button type="button" className={`hq-live-tab${category === "all" ? " is-active" : ""}`} onClick={() => setCategory("all")}><Activity size={14} /> All Events <span>{inRange.length}</span></button>{(Object.keys(CATEGORY_LABEL) as HqLiveEventCategory[]).filter((key) => categoryCounts[key] > 0).map((key) => <button type="button" key={key} className={`hq-live-tab${category === key ? " is-active" : ""}`} onClick={() => setCategory(key)}><CategoryIcon category={key} size={14} /> {CATEGORY_LABEL[key]} <span>{categoryCounts[key]}</span></button>)}</div>
    <div className="hq-live-layout"><section className="hq-live-stream" aria-label="Live event stream">{load === "loading" ? <TableSkeleton /> : null}{load === "error" ? <StateBanner tone="error" title="Could not load the event feed" body={message ?? "Try again."} /> : null}{load === "ready" ? filtered.length === 0 ? <p className="hq-loading">No events match the current filters.</p> : <div className="hq-live-table-wrap"><table className="hq-live-table"><thead><tr><th>Time</th><th>Event</th><th>Details</th><th>Brand</th><th>Severity</th></tr></thead><tbody>{filtered.map((event) => { const Icon = CATEGORY_ICON[event.category]; return <tr key={event.id} className={selectedId === event.id ? "is-selected" : ""} onClick={() => setSelectedId(event.id)}><td className="hq-live-table__time"><span>{formatWhen(event.occurred_at)}</span><small>{formatRelativeTime(event.occurred_at)}</small></td><td><div className="hq-live-table__event"><span className={`hq-live-event-icon hq-live-event-icon--${CATEGORY_TONE[event.category]}`}><Icon size={15} /></span><button type="button" className="hq-live-table__event-button" onClick={(clickEvent) => { clickEvent.stopPropagation(); setSelectedId(event.id); }}>{event.title}</button></div></td><td><span className="hq-live-table__description">{event.description}</span></td><td><span className="hq-live-brand"><span className={`hq-live-brand__mark hq-live-brand__mark--${event.brand.toLowerCase()}`} />{brandLabel(event.brand)}</span></td><td><span className={`hq-live-severity hq-live-severity--${SEVERITY_TONE[event.severity]}`}><span />{event.severity}</span></td></tr>; })}</tbody></table></div> : null}</section>{selected ? <EventDetail event={selected} related={selectedRelated} onClose={() => setSelectedId(null)} /> : <aside className="hq-live-detail hq-live-detail--empty"><Info size={18} /><p>Select an event to inspect its evidence and context.</p></aside>}</div>
    <VolumeFooter events={inRange} />
  </>;
}

export default function LiveEventsPage() {
  const { operator, brandSlug } = useHqOperator();
  const canView = canReadSecurityAlerts(operator);
  const [allBrands, setAllBrands] = useState(false);
  if (!operator) return null;
  return <div className="hq-content hq-content--stack hq-page-live">{canView ? <LiveEventsFeed key={allBrands ? "all" : "brand"} allBrands={allBrands} currentBrand={brandSlug ?? operator.current_brand} onAllBrandsChange={setAllBrands} /> : <StateBanner tone="forbidden" title="Live / Events not enabled" body="Your operator role does not include hq.security_alerts.read. Backend authorization is authoritative — ask an admin if you need this access." />}</div>;
}
