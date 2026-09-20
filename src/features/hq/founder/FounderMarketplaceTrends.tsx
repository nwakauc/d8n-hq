import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { HqProductTrends } from "../../../lib/hq/types.ts";
import { FounderIconBadge } from "./founderIcons.tsx";

const SERIES = [
  { id: "likes", label: "Likes", color: "#e11d48" },
  { id: "matches", label: "Matches", color: "#8b5cf6" },
  { id: "conversations", label: "Conversations", color: "#2563eb" },
] as const;

function shortDate(value: string): string {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${value}T12:00:00`));
}

export function FounderMarketplaceTrends({
  trends,
  error,
}: {
  trends: HqProductTrends | null;
  error: string | null;
}) {
  if (error) {
    return (
      <section className="founder-panel" aria-labelledby="marketplace-trends-title">
        <h2 id="marketplace-trends-title" className="founder-panel__title">Marketplace trends</h2>
        <p className="founder-panel__error">{error}</p>
      </section>
    );
  }
  if (!trends) {
    return (
      <section className="founder-panel" aria-labelledby="marketplace-trends-title">
        <h2 id="marketplace-trends-title" className="founder-panel__title">Marketplace trends</h2>
        <p className="founder-panel__subtitle">Loading historical engagement…</p>
      </section>
    );
  }

  const available = SERIES.filter((spec) => trends.series.some((series) => series.id === spec.id));
  const dates = [...new Set(trends.series.flatMap((series) => Object.keys(series.points)))].sort();
  const rows = dates.map((date) => ({
    date,
    label: shortDate(date),
    ...Object.fromEntries(available.map((spec) => [spec.id, trends.series.find((series) => series.id === spec.id)?.points[date] ?? 0])),
  }));

  return (
    <section className="founder-panel founder-marketplace-trends" aria-labelledby="marketplace-trends-title">
      <div className="founder-panel__heading">
        <div>
          <h2 id="marketplace-trends-title" className="founder-panel__title">Marketplace trends</h2>
          <p className="founder-panel__subtitle">Likes, matches and conversations over {trends.window.replace(/_/g, " ")}.</p>
        </div>
        <FounderIconBadge name="heart-handshake" tone="rose" />
      </div>
      <div className="founder-marketplace-trends__chart">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={rows} margin={{ top: 12, right: 10, left: -18, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#edf0f5" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
            <Tooltip formatter={(value, name) => [Number(value).toLocaleString("en-ZA"), String(name)]} />
            <Legend iconType="circle" iconSize={8} />
            {available.map((spec) => (
              <Line key={spec.id} type="monotone" dataKey={spec.id} name={spec.label} stroke={spec.color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
