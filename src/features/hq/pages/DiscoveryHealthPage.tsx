import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ApiError } from "../../../lib/api/errors.ts";
import { fetchHqDiscoveryHealth, hqErrorMessage } from "../../../lib/hq/api.ts";
import type {
  HqDiscoveryHealth,
  HqDiscoveryHealthBucketLabel,
  HqDiscoveryHealthBuckets,
} from "../../../lib/hq/types.ts";
import {
  DataTable,
  MetricCard,
  StatGroup,
  StateBanner,
  UnavailableState,
} from "../components/HqPrimitives.tsx";

const BUCKET_LABELS: HqDiscoveryHealthBucketLabel[] = ["0", "1-3", "4-9", "10+"];
const BUCKET_COLOR = "#8b5cf6";

type LoadResult =
  | { status: "ready"; data: HqDiscoveryHealth }
  | { status: "forbidden"; message: string }
  | { status: "error"; message: string };

function BucketChart({
  title,
  subtitle,
  configured,
  buckets,
}: {
  title: string;
  subtitle: string;
  configured: boolean;
  buckets: HqDiscoveryHealthBuckets;
}) {
  if (!configured) {
    return (
      <MetricCard title={title}>
        <UnavailableState
          badge="NOT CONFIGURED"
          title={`${title} is not configured`}
          body="This brand has no discovery surface configured for this delivery mode."
        />
      </MetricCard>
    );
  }
  const rows = BUCKET_LABELS.map((label) => ({ label, count: buckets[label] }));
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  return (
    <MetricCard title={title}>
      <p className="hq-card__subtitle" style={{ marginBottom: 8 }}>
        {subtitle}
      </p>
      {total === 0 ? (
        <p className="hq-loading">No members counted.</p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={rows} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#edf0f5" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
            <Tooltip formatter={(value) => [Number(value).toLocaleString("en-ZA"), "Members"]} />
            <Bar dataKey="count" fill={BUCKET_COLOR} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </MetricCard>
  );
}

export default function DiscoveryHealthPage() {
  const [nonce, setNonce] = useState(0);
  const [load, setLoad] = useState<{ nonce: number; result: LoadResult | null }>({
    nonce: -1,
    result: null,
  });

  useEffect(() => {
    let cancelled = false;
    fetchHqDiscoveryHealth()
      .then((data) => {
        if (!cancelled) setLoad({ nonce, result: { status: "ready", data } });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 403) {
          setLoad({ nonce, result: { status: "forbidden", message: hqErrorMessage(error) } });
          return;
        }
        setLoad({ nonce, result: { status: "error", message: hqErrorMessage(error) } });
      });
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  const status: "loading" | LoadResult["status"] =
    load.nonce !== nonce || load.result === null ? "loading" : load.result.status;

  return (
    <div className="hq-content hq-page-discovery-health">
      <nav className="hq-breadcrumbs" aria-label="Breadcrumb">
        <Link to="/hq">Command Centre</Link>
        <span className="hq-breadcrumbs__sep">/</span>
        <span>Platform Discovery Health</span>
      </nav>
      <h1>Platform Discovery Health</h1>
      <p className="hq-card__subtitle">
        Real Introduction allocation and live Explore availability across every active, visible member on
        this brand — the operational early-warning surface for members whose reciprocal-eligible pool is
        collapsing before they complain. Uses only real instrumentation: &quot;allocated&quot; and
        &quot;returned&quot;, never &quot;seen&quot; or &quot;viewed&quot;.
      </p>

      {status === "loading" ? <p className="hq-loading">Loading discovery health…</p> : null}

      {status === "forbidden" && load.result?.status === "forbidden" ? (
        <StateBanner tone="forbidden" title="Forbidden" body={load.result.message} />
      ) : null}

      {status === "error" && load.result?.status === "error" ? (
        <div>
          <StateBanner tone="error" title="Could not load discovery health" body={load.result.message} />
          <button type="button" className="hq-btn hq-btn--ghost" style={{ marginTop: 10 }} onClick={() => setNonce((n) => n + 1)}>
            Retry
          </button>
        </div>
      ) : null}

      {status === "ready" && load.result?.status === "ready" ? (
        <div className="hq-ts-stack">
          <div className="hq-ts-metrics">
            <MetricCard title="Population">
              <StatGroup
                items={[
                  { label: "Active + visible members", value: load.result.data.member_count },
                  { label: "Exhausted (0 available)", value: load.result.data.exhausted_member_count },
                  { label: "Near-exhausted (1–9 available)", value: load.result.data.near_exhausted_member_count },
                ]}
              />
            </MetricCard>
            <MetricCard title="Reciprocal pool">
              <StatGroup
                items={[
                  { label: "Median reciprocal pool", value: load.result.data.median_reciprocal_pool ?? "—" },
                  { label: "Median currently-available pool", value: load.result.data.median_available_pool ?? "—" },
                ]}
              />
            </MetricCard>
          </div>

          <div className="hq-grid-2">
            <BucketChart
              title="Introduction delivery"
              subtitle="Members bucketed by how many candidates were actually allocated today, bounded by daily_limit."
              configured={load.result.data.introduction_configured}
              buckets={load.result.data.introduction_delivery_buckets}
            />
            <BucketChart
              title="Explore availability"
              subtitle="Members bucketed by how many candidates Explore would return right now (live, uncapped, not stored)."
              configured={load.result.data.explore_configured}
              buckets={load.result.data.explore_availability_buckets}
            />
          </div>

          <MetricCard title="By reciprocal market">
            <p className="hq-card__subtitle" style={{ marginBottom: 8 }}>
              Computed from each member&apos;s real gender and interested_in values — not a fixed set of
              combinations, so this reflects whatever markets this brand&apos;s members actually form.
            </p>
            <DataTable
              columns={[
                { key: "market", header: "Market" },
                { key: "member_count", header: "Members" },
                { key: "median_reciprocal_pool", header: "Median reciprocal pool" },
                { key: "median_available_pool", header: "Median available pool" },
                { key: "exhausted_member_count", header: "Exhausted" },
              ]}
              rows={Object.entries(load.result.data.by_market)
                .sort(([, a], [, b]) => b.member_count - a.member_count)
                .map(([market, summary]) => ({
                  market,
                  member_count: summary.member_count,
                  median_reciprocal_pool: summary.median_reciprocal_pool ?? "—",
                  median_available_pool: summary.median_available_pool ?? "—",
                  exhausted_member_count: summary.exhausted_member_count,
                }))}
              empty="No market breakdown available."
            />
          </MetricCard>

          <MetricCard title="Members likely to hit empty discovery">
            <p className="hq-card__subtitle" style={{ marginBottom: 8 }}>
              Members with zero currently-available candidates, ordered by smallest reciprocal pool first
              — the ones with the least room to recover on their own. Capped list, not a full enumeration.
            </p>
            <DataTable
              columns={[
                { key: "profile", header: "Member" },
                { key: "market", header: "Market" },
                { key: "reciprocal_pool", header: "Reciprocal pool" },
              ]}
              rows={load.result.data.likely_empty_discovery.map((member) => ({
                profile: (
                  <Link className="hq-inline-link" to={`/hq/members/${encodeURIComponent(member.profile_id)}`}>
                    {member.profile_id}
                  </Link>
                ),
                market: member.market,
                reciprocal_pool: member.reciprocal_pool,
              }))}
              empty="No members currently have zero available discovery candidates."
            />
          </MetricCard>
        </div>
      ) : null}
    </div>
  );
}
