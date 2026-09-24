import { useNavigate } from "react-router-dom";
import type { HqRegistrationTrendResponse } from "../../../lib/hq/types.ts";
import { FounderLineTrendsChart } from "../founder/charts/FounderCharts.tsx";
import { memberCohortPath } from "./analyticsTypes.ts";
import { splitRegistrationAxes } from "./registrationChart.ts";

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
    return (
      <section className="hq-card hq-analytics-panel">
        <h2>Daily registrations</h2>
        <p>Loading registration history…</p>
      </section>
    );
  }
  if (!data) {
    return (
      <section className="hq-card hq-analytics-panel">
        <h2>Daily registrations</h2>
        <p>Registration history is unavailable for this operator.</p>
      </section>
    );
  }

  // Always every brand this admin can see — this endpoint is cross-brand by
  // design (Hq::CommandCentre::RegistrationTrends is admin-user-scoped, not
  // Current.brand-scoped), unlike the rest of the dashboard which reflects
  // only the brand you're signed into. No brand picker needed here.
  const series = data.brands;
  const dates = [...new Set(series.flatMap((brand) => Object.keys(brand.points)))].sort();
  const chartRows = dates.map((date) => ({
    date,
    label: formatDate(date),
    ...Object.fromEntries(series.map((brand) => [brand.brand, brand.points[date] ?? 0])),
  }));
  const axes = splitRegistrationAxes(
    series.map((brand) => brand.brand),
    chartRows,
  );
  const splitAxis = Object.values(axes).includes("right");

  return (
    <section className="hq-card hq-analytics-panel" aria-labelledby="daily-registrations-title">
      <div className="hq-analytics-panel__header">
        <div>
          <h2 id="daily-registrations-title">Daily registrations</h2>
          <p className="hq-card__subtitle">
            Cross-brand kept memberships created on each {data.time_zone} calendar date. Clicking a day
            opens the member directory on the signed-in brand only.
            {splitAxis ? " The largest brand uses the right axis so the other lines stay visible." : null}
          </p>
        </div>
        <span className="hq-analytics-panel__definition">
          {data.definition} · {data.time_zone}
        </span>
      </div>
      {dates.length === 0 ? (
        <p>No registrations in this period.</p>
      ) : (
        <>
          <FounderLineTrendsChart
            ariaLabel="Daily registrations chart"
            rows={chartRows}
            series={series.map((brand, index) => ({
              id: brand.brand,
              label: `${brand.brand} · ${brand.total.toLocaleString("en-ZA")}`,
              color: CHART_COLORS[index % CHART_COLORS.length],
              yAxisId: axes[brand.brand],
            }))}
            onPointClick={(date) => navigate(memberCohortPath(date))}
          />
          <p className="hq-registration-legend__hint">
            Click a day to inspect that day’s members on the current brand.
          </p>
        </>
      )}
    </section>
  );
}
