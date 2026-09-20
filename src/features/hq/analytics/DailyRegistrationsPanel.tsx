import { useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { HqRegistrationTrendResponse } from "../../../lib/hq/types.ts";
import { memberCohortPath } from "./analyticsTypes.ts";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
    new Date(`${value}T12:00:00`),
  );
}

const CHART_COLORS = ["#8b5cf6", "#0ea5e9", "#14b8a6", "#f59e0b"];

export function DailyRegistrationsPanel({
  data,
  loading,
}: {
  data: HqRegistrationTrendResponse | null;
  loading: boolean;
}) {
  const navigate = useNavigate();
  if (loading) {
    return <section className="hq-card hq-analytics-panel"><h2>Daily registrations</h2><p>Loading registration history…</p></section>;
  }
  if (!data) {
    return <section className="hq-card hq-analytics-panel"><h2>Daily registrations</h2><p>Registration history is unavailable for this operator.</p></section>;
  }

  // Always every brand this admin can see — this endpoint is cross-brand by
  // design (Hq::CommandCentre::RegistrationTrends is admin_user-scoped, not
  // Current.brand-scoped), unlike the rest of the dashboard which reflects
  // only the brand you're signed into. No brand picker needed here.
  const series = data.brands;
  const dates = [...new Set(series.flatMap((brand) => Object.keys(brand.points)))].sort();
  const chartRows = dates.map((date) => ({
    date,
    label: formatDate(date),
    ...Object.fromEntries(series.map((brand) => [brand.brand, brand.points[date] ?? 0])),
  }));

  return (
    <section className="hq-card hq-analytics-panel" aria-labelledby="daily-registrations-title">
      <div className="hq-analytics-panel__header">
        <div>
          <h2 id="daily-registrations-title">Daily registrations</h2>
          <p className="hq-card__subtitle">Kept brand memberships created on each local calendar date.</p>
        </div>
        <span className="hq-analytics-panel__definition">Real membership timestamps · {data.time_zone}</span>
      </div>
      {dates.length === 0 ? (
        <p>No registrations in this period.</p>
      ) : (
        <>
          <div className="hq-registration-chart" aria-label="Daily registrations chart">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartRows} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#edf0f5" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
                <Tooltip
                  labelFormatter={(label) => String(label)}
                  formatter={(value, name) => [Number(value).toLocaleString("en-ZA"), String(name)]}
                />
                {series.map((brand, index) => (
                  <Bar
                    key={brand.brand}
                    dataKey={brand.brand}
                    stackId="registrations"
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                    radius={index === series.length - 1 ? [3, 3, 0, 0] : undefined}
                    onClick={(entry) => navigate(memberCohortPath(entry.date))}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="hq-registration-legend">
            {series.map((brand, index) => (
              <span key={brand.brand}>
                <i style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} />
                {brand.brand} · {brand.total.toLocaleString("en-ZA")}
              </span>
            ))}
            <span className="hq-registration-legend__hint">Click a bar to inspect that day’s members.</span>
          </div>
        </>
      )}
    </section>
  );
}
