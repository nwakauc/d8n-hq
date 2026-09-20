import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError } from "../../../lib/api/errors.ts";
import { fetchHqMemberDirectory, hqErrorMessage } from "../../../lib/hq/api.ts";
import {
  DIRECTORY_CONTACT_FILTERS,
  DIRECTORY_ENFORCEMENT_FILTERS,
  DIRECTORY_MEMBERSHIP_FILTERS,
  DIRECTORY_PROFILE_STATUS_FILTERS,
  DIRECTORY_SORT_OPTIONS,
  DIRECTORY_VISIBILITY_FILTERS,
  directoryParamsFromSearchParams,
  directoryParamsKey,
  writeDirectoryParamsToSearchParams,
} from "../../../lib/hq/memberDirectoryParams.ts";
import type { HqMemberDirectoryEntry, HqMemberDirectoryParams } from "../../../lib/hq/types.ts";
import { DataTable, StateBanner, StatusBadge } from "./HqPrimitives.tsx";

type Variant = "hq" | "ops";

type Props = {
  variant?: Variant;
  memberBasePath: string;
  showFilters?: boolean;
};

type LoadState =
  | { status: "loading" }
  | { status: "ready"; rows: HqMemberDirectoryEntry[]; next_cursor: string | null }
  | { status: "forbidden" | "error"; message: string; rows: HqMemberDirectoryEntry[]; next_cursor: string | null };

function formatWhen(value: string | null | undefined): string {
  if (!value) return "—";
  return value.replace("T", " ").replace(/\.\d+Z$/, "Z");
}

/** Relative display for the table cell; the exact timestamp is still the
 * title attribute so operators can see precision on hover. */
function formatRelative(value: string | null | undefined): string {
  if (!value) return "—";
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "—";
  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(then);
}

function humanizeKey(key: string): string {
  return key.replace(/_/g, " ");
}

function contactVerificationLabel(
  state: HqMemberDirectoryEntry["contact_verification"],
): string {
  const parts: string[] = [];
  if (state.email) parts.push("email");
  if (state.phone) parts.push("phone");
  if (parts.length === 0) return "None verified";
  return parts.join(" + ");
}

function memberLabel(entry: HqMemberDirectoryEntry): string {
  return entry.display_name?.trim() || `Member ${entry.user_id}`;
}

function memberPath(entry: HqMemberDirectoryEntry, base: string): string | null {
  if (!entry.profile_id) return null;
  return `${base}/${encodeURIComponent(entry.profile_id)}`;
}

/** Email if present (matches most operator muscle memory), else masked
 * phone. Both identifiers remain available inside Member 360. */
function registrationIdentifier(entry: HqMemberDirectoryEntry): string {
  return entry.email ?? entry.phone ?? "—";
}

function locationLabel(entry: HqMemberDirectoryEntry): string {
  if (entry.city && entry.country_code) return `${entry.city}, ${entry.country_code}`;
  return entry.city ?? entry.country_code ?? "—";
}

function lookingForLabel(entry: HqMemberDirectoryEntry): string {
  if (entry.looking_for.length === 0) return "—";
  return entry.looking_for.map(humanizeKey).join(", ");
}

const DISCOVERY_LABELS: Record<HqMemberDirectoryEntry["discovery_status"], string> = {
  visible: "Visible",
  not_visible: "Not visible",
  restricted: "Restricted",
  draft: "Draft",
  no_profile: "No profile",
};

const DISCOVERY_TONE: Record<HqMemberDirectoryEntry["discovery_status"], "success" | "warning" | "danger" | "neutral"> = {
  visible: "success",
  not_visible: "neutral",
  restricted: "danger",
  draft: "neutral",
  no_profile: "neutral",
};

/** Consolidated account+profile state -- distinct backend states stay
 * distinct (never collapsed to a generic "Active"), matching whichever
 * dimension is actually abnormal; a healthy row shows the plain profile
 * status rather than three redundant "active" badges. */
function statusLabel(entry: HqMemberDirectoryEntry): string {
  if (entry.membership_status !== "active") return humanizeKey(entry.membership_status);
  if (entry.user_status !== "active") return humanizeKey(entry.user_status);
  if (entry.profile_status && entry.profile_status !== "active") return humanizeKey(entry.profile_status);
  return entry.profile_status ? "Active" : "No profile";
}

function statusTone(entry: HqMemberDirectoryEntry): "success" | "warning" | "danger" | "neutral" {
  if (entry.membership_status === "suspended" || entry.user_status === "suspended") return "danger";
  if (entry.membership_status !== "active" || entry.user_status !== "active") return "warning";
  if (entry.profile_status === "suspended") return "danger";
  if (entry.profile_status && entry.profile_status !== "active") return "warning";
  return entry.profile_status ? "success" : "neutral";
}

/** Commits on blur/Enter rather than every keystroke, like DirectorySearch,
 * but without its own submit button -- these sit inline in the filter bar. */
function TextFilter({
  value,
  placeholder,
  ariaLabel,
  inputClass,
  onCommit,
}: {
  value: string;
  placeholder: string;
  ariaLabel: string;
  inputClass: string;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <input
      className={inputClass}
      aria-label={ariaLabel}
      placeholder={placeholder}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => onCommit(draft.trim())}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onCommit(draft.trim());
        }
      }}
    />
  );
}

function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="hq-directory-skeleton" aria-busy="true" aria-label="Loading members">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="hq-directory-skeleton__row" />
      ))}
    </div>
  );
}

function DirectorySearch({
  initial,
  inputClass,
  btnPrimary,
  onSubmit,
}: {
  initial: string;
  inputClass: string;
  btnPrimary: string;
  onSubmit: (value: string) => void;
}) {
  const searchId = useId();
  const [draftSearch, setDraftSearch] = useState(initial);
  return (
    <form
      className="hq-directory__search"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(draftSearch.trim());
      }}
    >
      <label className="visually-hidden" htmlFor={searchId}>
        Search members
      </label>
      <input
        id={searchId}
        className={inputClass}
        value={draftSearch}
        onChange={(event) => setDraftSearch(event.target.value)}
        placeholder="Name, email, phone, or profile id"
        autoComplete="off"
        spellCheck={false}
      />
      <button type="submit" className={btnPrimary}>
        Search
      </button>
    </form>
  );
}

function DirectoryResults({
  apiParams,
  filterKey,
  memberBasePath,
  filters,
  hasActiveFilters,
  btnClass,
}: {
  apiParams: HqMemberDirectoryParams;
  filterKey: string;
  memberBasePath: string;
  filters: Omit<HqMemberDirectoryParams, "cursor" | "limit">;
  hasActiveFilters: boolean;
  btnClass: string;
}) {
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [pendingMore, setPendingMore] = useState(false);

  const loadPage = useCallback(
    async (pageCursor: string | null) => {
      return fetchHqMemberDirectory({ ...apiParams, cursor: pageCursor });
    },
    [apiParams],
  );

  useEffect(() => {
    let cancelled = false;
    void loadPage(null)
      .then((page) => {
        if (cancelled) return;
        setLoad({ status: "ready", rows: page.members, next_cursor: page.next_cursor });
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        const message = hqErrorMessage(caught);
        const tone = caught instanceof ApiError && caught.status === 403 ? "forbidden" : "error";
        setLoad({ status: tone, message, rows: [], next_cursor: null });
      });
    return () => {
      cancelled = true;
    };
  }, [filterKey, apiParams.cursor, loadPage]);

  async function loadMore() {
    if (load.status !== "ready" || !load.next_cursor || pendingMore) return;
    setPendingMore(true);
    try {
      const page = await loadPage(load.next_cursor);
      setLoad({
        status: "ready",
        rows: [...load.rows, ...page.members],
        next_cursor: page.next_cursor,
      });
    } catch (caught) {
      setLoad({
        status: "error",
        message: hqErrorMessage(caught),
        rows: load.rows,
        next_cursor: load.next_cursor,
      });
    } finally {
      setPendingMore(false);
    }
  }

  return (
    <>
      {load.status === "forbidden" ? (
        <StateBanner tone="forbidden" title="Forbidden" body={load.message} />
      ) : null}

      {load.status === "error" && load.rows.length === 0 ? (
        <StateBanner tone="error" title="Could not load directory" body={load.message} />
      ) : null}

      {load.status === "loading" ? <TableSkeleton /> : null}

      {load.status !== "loading" ? (
        <>
          <DataTable
            tableClassName="hq-directory-table"
            columns={[
              { key: "member", header: "Member" },
              { key: "identifier", header: "Registration ID" },
              { key: "gender", header: "Gender" },
              { key: "looking_for", header: "Looking for" },
              { key: "location", header: "Location" },
              { key: "joined", header: "Joined" },
              { key: "active", header: "Last active" },
              { key: "discovery", header: "Discovery" },
              { key: "safety", header: "Safety" },
              { key: "status", header: "Status" },
              { key: "account_type", header: "Account type" },
            ]}
            rows={(load.status === "ready" || load.status === "error" ? load.rows : []).map(
              (entry) => {
                const path = memberPath(entry, memberBasePath);
                const name = memberLabel(entry);
                const verified = entry.contact_verification.email || entry.contact_verification.phone;
                const safetyPath = path ? `${path}?sections=safety` : null;

                return {
                  member: (
                    <div className="hq-directory__member">
                      <span className="hq-directory__avatar" aria-hidden="true">
                        {name.trim().slice(0, 1).toUpperCase() || "?"}
                      </span>
                      <span className="hq-directory__member-copy">
                        {path ? (
                          <Link className="hq-inline-link" to={path}>
                            {name}
                            {entry.age !== null ? `, ${entry.age}` : ""}
                          </Link>
                        ) : (
                          <span>
                            {name}
                            {entry.age !== null ? `, ${entry.age}` : ""}
                          </span>
                        )}
                        <small
                          className="hq-card__subtitle"
                          title={verified ? contactVerificationLabel(entry.contact_verification) : undefined}
                        >
                          {verified ? "✓ " : ""}
                          {entry.profile_id ?? `#${entry.user_id}`}
                        </small>
                      </span>
                    </div>
                  ),
                  identifier: registrationIdentifier(entry),
                  gender: entry.gender ? humanizeKey(entry.gender) : "—",
                  looking_for: lookingForLabel(entry),
                  location: locationLabel(entry),
                  joined: (
                    <span title={formatWhen(entry.joined_at)}>{formatRelative(entry.joined_at)}</span>
                  ),
                  active: (
                    <span title={formatWhen(entry.last_active_at)}>{formatRelative(entry.last_active_at)}</span>
                  ),
                  discovery: <StatusBadge tone={DISCOVERY_TONE[entry.discovery_status]}>{DISCOVERY_LABELS[entry.discovery_status]}</StatusBadge>,
                  safety: (
                    <div className="hq-directory__badges">
                      {entry.reports_received_count > 0 ? (
                        <StatusBadge tone="warning">{entry.reports_received_count} report{entry.reports_received_count === 1 ? "" : "s"}</StatusBadge>
                      ) : null}
                      {entry.pending_photo_count > 0 ? (
                        <StatusBadge tone="accent">{entry.pending_photo_count} photo{entry.pending_photo_count === 1 ? "" : "s"}</StatusBadge>
                      ) : null}
                      {entry.active_enforcement ? <StatusBadge tone="danger">Enforced</StatusBadge> : null}
                      {!entry.reports_received_count && !entry.pending_photo_count && !entry.active_enforcement ? (
                        <StatusBadge tone="success">Clean</StatusBadge>
                      ) : null}
                      {safetyPath ? (
                        <Link className="hq-inline-link" to={safetyPath} aria-label={`${name} safety detail`}>
                          Detail
                        </Link>
                      ) : null}
                    </div>
                  ),
                  status: <StatusBadge tone={statusTone(entry)}>{statusLabel(entry)}</StatusBadge>,
                  account_type: entry.account_type,
                };
              },
            )}
            empty={
              filters.search
                ? "No members match this search and filter combination."
                : hasActiveFilters
                  ? "No members match these filters."
                  : "No members on this brand yet."
            }
          />

          {load.status === "ready" && load.next_cursor ? (
            <button
              type="button"
              className={`${btnClass} hq-btn--ghost`}
              style={{ marginTop: 10 }}
              disabled={pendingMore}
              onClick={() => void loadMore()}
            >
              {pendingMore ? "Loading…" : "Load more"}
            </button>
          ) : null}

          {load.status === "ready" && !load.next_cursor && load.rows.length > 0 ? (
            <p className="hq-card__subtitle" style={{ marginTop: 8 }}>
              End of directory for this query.
            </p>
          ) : null}

          {load.status === "error" && load.rows.length > 0 ? (
            <StateBanner tone="error" title="Could not load more" body={load.message} />
          ) : null}
        </>
      ) : null}
    </>
  );
}

export function MemberDirectoryPanel({
  variant = "hq",
  memberBasePath,
  showFilters = true,
}: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => directoryParamsFromSearchParams(searchParams), [searchParams]);
  const filterKey = directoryParamsKey(filters);
  const cursor = searchParams.get("cursor");

  const apiParams = useMemo((): HqMemberDirectoryParams => {
    return {
      ...filters,
      cursor,
      limit: 25,
      contact_verification: filters.contact_verification ?? "any",
      enforcement: filters.enforcement ?? "any",
    };
  }, [cursor, filters]);

  function updateFilters(
    patch: Partial<Omit<HqMemberDirectoryParams, "cursor" | "limit">>,
  ) {
    setSearchParams(writeDirectoryParamsToSearchParams(searchParams, { ...filters, ...patch }), {
      replace: true,
    });
  }

  function clearFilters() {
    setSearchParams(new URLSearchParams(), { replace: true });
  }

  const hasActiveFilters = Boolean(
    filters.search ||
      filters.status ||
      filters.profile_status ||
      filters.profile_visibility ||
      (filters.contact_verification && filters.contact_verification !== "any") ||
      (filters.enforcement && filters.enforcement !== "any") ||
      filters.created_from ||
      filters.created_to ||
      filters.last_active_from ||
      filters.last_active_to ||
      filters.gender ||
      filters.country_code ||
      (filters.sort && filters.sort !== "newest"),
  );

  const selectClass = variant === "ops" ? "ops-select" : "hq-select";
  const inputClass = variant === "ops" ? "ops-input" : "hq-input";
  const btnClass = variant === "ops" ? "ops-btn" : "hq-btn";
  const btnPrimary = variant === "ops" ? "ops-btn ops-btn--primary" : "hq-btn hq-btn--primary";
  const chipClass = variant === "ops" ? "ops-chip" : "hq-chip";

  return (
    <div className="hq-directory">
      {showFilters ? (
        <div className="hq-directory__toolbar">
          <DirectorySearch
            key={filters.search ?? ""}
            initial={filters.search ?? ""}
            inputClass={inputClass}
            btnPrimary={btnPrimary}
            onSubmit={(value) => updateFilters({ search: value || null })}
          />

          <div className="hq-directory__filters" role="toolbar" aria-label="Member filters">
            <select
              className={selectClass}
              aria-label="Membership status"
              value={filters.status ?? ""}
              onChange={(event) =>
                updateFilters({
                  status: (event.target.value || null) as HqMemberDirectoryParams["status"],
                })
              }
            >
              {DIRECTORY_MEMBERSHIP_FILTERS.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              className={selectClass}
              aria-label="Profile status"
              value={filters.profile_status ?? ""}
              onChange={(event) =>
                updateFilters({
                  profile_status: (event.target.value || null) as HqMemberDirectoryParams["profile_status"],
                })
              }
            >
              {DIRECTORY_PROFILE_STATUS_FILTERS.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              className={selectClass}
              aria-label="Profile visibility"
              value={filters.profile_visibility ?? ""}
              onChange={(event) =>
                updateFilters({
                  profile_visibility: (event.target.value || null) as HqMemberDirectoryParams["profile_visibility"],
                })
              }
            >
              {DIRECTORY_VISIBILITY_FILTERS.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              className={selectClass}
              aria-label="Contact verification"
              value={filters.contact_verification ?? "any"}
              onChange={(event) =>
                updateFilters({
                  contact_verification: event.target
                    .value as HqMemberDirectoryParams["contact_verification"],
                })
              }
            >
              {DIRECTORY_CONTACT_FILTERS.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              className={selectClass}
              aria-label="Enforcement"
              value={filters.enforcement ?? "any"}
              onChange={(event) =>
                updateFilters({
                  enforcement: event.target.value as HqMemberDirectoryParams["enforcement"],
                })
              }
            >
              {DIRECTORY_ENFORCEMENT_FILTERS.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <TextFilter
              key={`gender:${filters.gender ?? ""}`}
              value={filters.gender ?? ""}
              placeholder="Gender"
              ariaLabel="Gender"
              inputClass={inputClass}
              onCommit={(value) => updateFilters({ gender: value || null })}
            />

            <TextFilter
              key={`country:${filters.country_code ?? ""}`}
              value={filters.country_code ?? ""}
              placeholder="Country code"
              ariaLabel="Country code"
              inputClass={inputClass}
              onCommit={(value) => updateFilters({ country_code: value || null })}
            />

            <select
              className={selectClass}
              aria-label="Sort order"
              value={filters.sort ?? "newest"}
              onChange={(event) =>
                updateFilters({
                  sort: event.target.value as HqMemberDirectoryParams["sort"],
                })
              }
            >
              {DIRECTORY_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {hasActiveFilters ? (
              <button type="button" className={`${btnClass} ${chipClass}`} onClick={clearFilters}>
                Clear filters
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <DirectoryResults
        key={`${filterKey}:${cursor ?? ""}`}
        apiParams={apiParams}
        filterKey={filterKey}
        memberBasePath={memberBasePath}
        filters={filters}
        hasActiveFilters={hasActiveFilters}
        btnClass={btnClass}
      />
    </div>
  );
}
