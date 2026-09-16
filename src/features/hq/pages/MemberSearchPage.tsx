import { useCallback, useId, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../../../lib/api/errors.ts";
import { hqErrorMessage, lookupHqMember } from "../../../lib/hq/api.ts";
import { displayNameForMember, memberRouteKey } from "../../../lib/hq/parse.ts";
import { MemberDirectoryPanel } from "../components/MemberDirectoryPanel.tsx";
import { MetricCard, StateBanner, StatusBadge } from "../components/HqPrimitives.tsx";
import { useHqBrand } from "../useHqBrand.ts";

type LookupStatus = "idle" | "searching" | "not_found" | "forbidden" | "error";

export default function MemberSearchPage() {
  const navigate = useNavigate();
  const { brandName } = useHqBrand();
  const inputId = useId();
  const errorId = useId();
  const [lookup, setLookup] = useState("");
  const [status, setStatus] = useState<LookupStatus>("idle");
  const [error, setError] = useState<string>();
  const pendingRef = useRef(false);

  const runExactLookup = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed || pendingRef.current) return;
      pendingRef.current = true;
      setStatus("searching");
      setError(undefined);
      try {
        const result = await lookupHqMember(trimmed);
        if (!result.found) {
          setStatus("not_found");
          return;
        }
        const key = memberRouteKey(result.member.member, trimmed);
        void navigate(`/hq/members/${encodeURIComponent(key)}`, {
          state: { displayName: displayNameForMember(result.member) },
        });
      } catch (caught) {
        if (caught instanceof ApiError && caught.status === 403) {
          setStatus("forbidden");
          setError(hqErrorMessage(caught));
          return;
        }
        setStatus("error");
        setError(hqErrorMessage(caught));
      } finally {
        pendingRef.current = false;
      }
    },
    [navigate],
  );

  function onLookupSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runExactLookup(lookup);
  }

  return (
    <div className="hq-content hq-content--stack hq-page-members">
      <MetricCard title="Exact member lookup" action={<StatusBadge tone="accent">Direct</StatusBadge>}>
        <p className="hq-card__subtitle" style={{ marginBottom: 12 }}>
          Jump straight to Member 360 by exact email, phone, or profile id on{" "}
          <strong>{brandName ?? "this brand"}</strong>. Unknown and cross-brand identifiers both
          return the same not-found response.
        </p>
        <form className="hq-search-form" onSubmit={onLookupSubmit}>
          <label className="visually-hidden" htmlFor={inputId}>
            Exact member lookup
          </label>
          <input
            id={inputId}
            className="hq-input"
            value={lookup}
            onChange={(event) => setLookup(event.target.value)}
            placeholder="email@example.com, +27…, or profile UUID"
            autoComplete="off"
            spellCheck={false}
            disabled={status === "searching"}
            aria-invalid={status === "error" || status === "forbidden" ? true : undefined}
            aria-describedby={error ? errorId : undefined}
          />
          <button
            type="submit"
            className="hq-btn hq-btn--primary"
            disabled={status === "searching" || !lookup.trim()}
          >
            {status === "searching" ? "Opening…" : "Open Member 360"}
          </button>
        </form>

        {status === "not_found" ? (
          <div style={{ marginTop: 12 }}>
            <StateBanner
              tone="neutral"
              title="No member found"
              body="Nothing matched that identifier for this brand."
            />
          </div>
        ) : null}
        {status === "forbidden" ? (
          <div id={errorId} style={{ marginTop: 12 }}>
            <StateBanner tone="forbidden" title="Forbidden" body={error ?? "Not authorized."} />
          </div>
        ) : null}
        {status === "error" ? (
          <div id={errorId} style={{ marginTop: 12 }}>
            <StateBanner tone="error" title="Lookup failed" body={error ?? "Try again."} />
          </div>
        ) : null}

        <p className="hq-card__subtitle" style={{ marginTop: 14 }}>
          Use the directory below for search, filters, and browsing.{" "}
          <kbd className="hq-control">⌘K</kbd> opens quick lookup from anywhere in HQ.{" "}
          <Link to="/hq">Command Centre</Link>
        </p>
      </MetricCard>

      <MetricCard title="Member directory" action={<StatusBadge tone="neutral">Browse</StatusBadge>}>
        <p className="hq-card__subtitle" style={{ marginBottom: 12 }}>
          Operational list for the current brand. Contact identifiers are never shown here — open a
          member for full identity details.
        </p>
        <MemberDirectoryPanel variant="hq" memberBasePath="/hq/members" />
      </MetricCard>
    </div>
  );
}
