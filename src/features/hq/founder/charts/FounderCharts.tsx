import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PULSE_CHART_HEIGHT = 220;
const DONUT_SIZE = 110;

type DonutSegment = {
  key: string;
  label: string;
  value: number;
  color: string;
};

export type PulseGroupedBarRow = {
  window: string;
  active: number;
  newMembers: number;
  matches: number;
};

const PULSE_SERIES = [
  { key: "active", label: "Active users", color: "#2563eb" },
  { key: "newMembers", label: "New members", color: "#16a34a" },
  { key: "matches", label: "Matches", color: "#e11d48" },
] as const;

export function FounderPulseGroupedBarChart({
  rows,
  ariaLabel,
}: {
  rows: PulseGroupedBarRow[];
  ariaLabel: string;
}) {
  return (
    <figure className="founder-chart founder-chart--pulse-bars" aria-label={ariaLabel}>
      <div className="founder-chart__plot" style={{ height: PULSE_CHART_HEIGHT, maxHeight: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barGap={2} barCategoryGap="18%">
            <XAxis
              dataKey="window"
              tick={{ fontSize: 11, fill: "var(--founder-text-muted)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--founder-text-faint)" }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip
              cursor={{ fill: "rgba(24, 24, 27, 0.04)" }}
              contentStyle={{
                borderRadius: 10,
                border: "1px solid var(--founder-border)",
                fontSize: 12,
              }}
            />
            {PULSE_SERIES.map((series) => (
              <Bar
                key={series.key}
                dataKey={series.key}
                name={series.label}
                fill={series.color}
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="visually-hidden">
        {rows
          .map(
            (row) =>
              `${row.window}: active ${row.active}, new ${row.newMembers}, matches ${row.matches}`,
          )
          .join("; ")}
      </figcaption>
    </figure>
  );
}

export function FounderDonutChart({
  segments,
  ariaLabel,
  showCenter = false,
  centerValue,
  centerLabel,
}: {
  segments: DonutSegment[];
  ariaLabel: string;
  showCenter?: boolean;
  centerValue?: string;
  centerLabel?: string;
}) {
  const outerRadius = DONUT_SIZE / 2 - 4;
  const innerRadius = outerRadius * 0.62;

  return (
    <figure className="founder-chart founder-chart--donut" aria-label={ariaLabel}>
      <div className="founder-chart__donut-layout">
        <div
          className="founder-chart__donut-plot"
          style={{ width: DONUT_SIZE, height: DONUT_SIZE }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={segments}
                dataKey="value"
                nameKey="label"
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                strokeWidth={0}
                isAnimationActive={false}
              >
                {segments.map((segment) => (
                  <Cell key={segment.key} fill={segment.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {showCenter && centerValue ? (
            <div className="founder-chart__donut-center-label" aria-hidden="true">
              <strong>{centerValue}</strong>
              {centerLabel ? <span>{centerLabel}</span> : null}
            </div>
          ) : null}
        </div>
        <ul className="founder-chart__legend founder-chart__legend--counts">
          {segments.map((segment) => (
            <li key={segment.key}>
              <span className="founder-chart__swatch" style={{ background: segment.color }} />
              <span>{segment.label}</span>
              <strong>{segment.value.toLocaleString("en-ZA")}</strong>
            </li>
          ))}
        </ul>
      </div>
    </figure>
  );
}

export function FounderHorizontalBars({
  rows,
  ariaLabel,
}: {
  rows: Array<{ key: string; label: string; value: number | null; max: number; tone?: string }>;
  ariaLabel: string;
}) {
  return (
    <figure className="founder-chart founder-chart--horizontal" aria-label={ariaLabel}>
      <ul className="founder-hbars">
        {rows.map((row) => {
          const width =
            row.value === null || row.max <= 0 ? 0 : Math.max(4, (row.value / row.max) * 100);
          return (
            <li key={row.key} className="founder-hbars__row">
              <span className="founder-hbars__label">{row.label}</span>
              <span className="founder-hbars__track">
                <span
                  className="founder-hbars__fill"
                  style={{
                    width: `${width}%`,
                    background: row.tone ?? "var(--founder-accent-blue)",
                  }}
                />
              </span>
              <span className="founder-hbars__value">
                {row.value === null ? "—" : row.value.toLocaleString("en-ZA")}
              </span>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}

export function FounderChartSkeleton({ variant = "bars" }: { variant?: "bars" | "donut" | "area" }) {
  return (
    <div
      className={`founder-chart-skeleton founder-chart-skeleton--${variant}`}
      aria-hidden="true"
    />
  );
}
