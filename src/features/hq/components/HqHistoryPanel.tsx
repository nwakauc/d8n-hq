import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ApiError } from "../../../lib/api/errors.ts";
import { hqErrorMessage } from "../../../lib/hq/api.ts";
import { DataTable, StateBanner } from "./HqPrimitives.tsx";

type PageResult<T> = {
  rows: T[];
  next_cursor: string | null;
};

type Props<T> = {
  loadPage: (cursor: string | null) => Promise<PageResult<T>>;
  columns: Array<{ key: string; header: string }>;
  mapRow: (row: T) => Record<string, ReactNode>;
  emptyLabel: string;
  endLabel?: string;
};

type LoadState<T> =
  | { status: "loading" }
  | { status: "ready"; rows: T[]; next_cursor: string | null }
  | { status: "forbidden" | "error"; message: string; rows: T[]; next_cursor: string | null };

/** Remount with a React `key` when lookup/resource changes so state resets. */
export function HqHistoryPanel<T>({
  loadPage,
  columns,
  mapRow,
  emptyLabel,
  endLabel = "End of history for this member.",
}: Props<T>) {
  const [load, setLoad] = useState<LoadState<T>>({ status: "loading" });
  const [pendingMore, setPendingMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadPage(null)
      .then((page) => {
        if (cancelled) return;
        setLoad({ status: "ready", rows: page.rows, next_cursor: page.next_cursor });
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        if (caught instanceof ApiError && caught.status === 403) {
          setLoad({ status: "forbidden", message: hqErrorMessage(caught), rows: [], next_cursor: null });
          return;
        }
        setLoad({ status: "error", message: hqErrorMessage(caught), rows: [], next_cursor: null });
      });
    return () => {
      cancelled = true;
    };
  }, [loadPage]);

  const loadMore = useCallback(async () => {
    if (load.status !== "ready" || !load.next_cursor || pendingMore) {
      return;
    }
    setPendingMore(true);
    try {
      const page = await loadPage(load.next_cursor);
      setLoad({
        status: "ready",
        rows: [...load.rows, ...page.rows],
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
  }, [load, loadPage, pendingMore]);

  if (load.status === "loading") {
    return <p className="hq-loading">Loading history…</p>;
  }

  if (load.status === "forbidden") {
    return <StateBanner tone="forbidden" title="Forbidden" body={load.message} />;
  }

  if (load.status === "error" && load.rows.length === 0) {
    return <StateBanner tone="error" title="Could not load history" body={load.message} />;
  }

  return (
    <div>
      <DataTable columns={columns} rows={load.rows.map(mapRow)} empty={emptyLabel} />
      {load.status === "ready" && load.next_cursor ? (
        <button
          type="button"
          className="hq-btn hq-btn--ghost"
          style={{ marginTop: 10 }}
          disabled={pendingMore}
          onClick={() => void loadMore()}
        >
          {pendingMore ? "Loading…" : "Load more"}
        </button>
      ) : null}
      {load.status === "ready" && !load.next_cursor && load.rows.length > 0 ? (
        <p className="hq-card__subtitle" style={{ marginTop: 8 }}>
          {endLabel}
        </p>
      ) : null}
      {load.status === "error" && load.rows.length > 0 ? (
        <StateBanner tone="error" title="Could not load more" body={load.message} />
      ) : null}
    </div>
  );
}
