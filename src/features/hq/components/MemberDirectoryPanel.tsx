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
  btnPrimary,
}: {
  apiParams: HqMemberDirectoryParams;
  filterKey: string;
  memberBasePath: string;
  filters: Omit<HqMemberDirectoryParams, "cursor" | "limit">;
  hasActiveFilters: boolean;
  btnClass: string;
  btnPrimary: string;
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
              { key: "account", header: "Account" },
              { key: "profile", header: "Profile" },
              { key: "joined", header: "Joined" },
              { key: "active", header: "Last active" },
              { key: "signals", header: "Signals" },
              { key: "actions", header: "" },
            ]}
            rows={(load.status === "ready" || load.status === "error" ? load.rows : []).map(
              (entry) => {
                const path = memberPath(entry, memberBasePath);
                const name = memberLabel(entry);
                return {
                  member: path ? (
                    <Link className="hq-inline-link" to={path}>
                      {name}
                    </Link>
                  ) : (
                    name
                  ),
                  account: (
                    <div className="hq-directory__badges">
                      <StatusBadge
                        tone={entry.membership_status === "active" ? "success" : "neutral"}
                      >
                        {humanizeKey(entry.membership_status)}
                      </StatusBadge>
                      <StatusBadge tone={entry.user_status === "active" ? "neutral" : "warning"}>
                        {humanizeKey(entry.user_status)}
                      </StatusBadge>
                    </div>
                  ),
                  profile: (
                    <div className="hq-directory__badges">
                      {entry.profile_status ? (
                        <StatusBadge
                          tone={entry.profile_status === "suspended" ? "danger" : "neutral"}
                        >
                          {humanizeKey(entry.profile_status)}
                        </StatusBadge>
                      ) : (
                        <span className="hq-card__subtitle">No profile</span>
                      )}
                      {entry.profile_visibility ? (
                        <StatusBadge tone="neutral">{humanizeKey(entry.profile_visibility)}</StatusBadge>
                      ) : null}
                      <StatusBadge tone="neutral" title="Verified contact methods">
                        {contactVerificationLabel(entry.contact_verification)}
                      </StatusBadge>
                    </div>
                  ),
                  joined: formatWhen(entry.joined_at),
                  active: formatWhen(entry.last_active_at),
                  signals: (
                    <div className="hq-directory__badges">
                      {entry.reports_received_count > 0 ? (
                        <StatusBadge tone="warning">{entry.reports_received_count} reports</StatusBadge>
                      ) : null}
                      {entry.pending_photo_count > 0 ? (
                        <StatusBadge tone="accent">{entry.pending_photo_count} photos</StatusBadge>
                      ) : null}
                      {entry.active_enforcement ? (
                        <StatusBadge tone="danger">Enforced</StatusBadge>
                      ) : null}
                      {!entry.reports_received_count &&
                      !entry.pending_photo_count &&
                      !entry.active_enforcement ? (
                        <span className="hq-card__subtitle">—</span>
                      ) : null}
                    </div>
                  ),
                  actions: path ? (
                    <Link className={btnPrimary} to={path}>
                      Open
                    </Link>
                  ) : (
                    <span className="hq-card__subtitle">No profile</span>
                  ),
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
        btnPrimary={btnPrimary}
      />
    </div>
  );
}
