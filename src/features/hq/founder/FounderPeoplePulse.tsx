import { useState } from "react";
import type { HqAnalyticsOverview } from "../../../lib/hq/types.ts";
import { FounderIconBadge } from "./founderIcons.tsx";

const DEMOGRAPHIC_DIMENSIONS = ["Gender", "Age range", "Relationship intent", "Top countries"];

function count(value: number): string {
  return value.toLocaleString("en-ZA");
}

export function FounderActiveUsers({ analytics }: { analytics: HqAnalyticsOverview | null }) {
  if (!analytics) {
    return (
      <section className="founder-panel" aria-labelledby="active-users-title">
        <h2 id="active-users-title" className="founder-panel__title">Active users</h2>
        <p className="founder-panel__subtitle">Loading activity windows…</p>
      </section>
    );
  }

  const maximum = Math.max(1, analytics.active_today, analytics.active_7d, analytics.active_30d);
  const windows = [
    { label: "Today", value: analytics.active_today },
    { label: "7 days", value: analytics.active_7d },
    { label: "30 days", value: analytics.active_30d },
  ];

  return (
    <section className="founder-panel founder-people-panel" aria-labelledby="active-users-title">
      <div className="founder-panel__heading">
        <div>
          <h2 id="active-users-title" className="founder-panel__title">Active users</h2>
          <p className="founder-panel__subtitle">Distinct members with a session used during each window.</p>
        </div>
        <FounderIconBadge name="activity" tone="blue" />
      </div>
      <div className="founder-active-windows">
        {windows.map((window) => (
          <div className="founder-active-windows__row" key={window.label}>
            <span>{window.label}</span>
            <div className="founder-active-windows__bar" aria-label={`${window.label}: ${count(window.value)} active users`}>
              <i style={{ width: `${(window.value / maximum) * 100}%` }} />
            </div>
            <strong>{count(window.value)}</strong>
          </div>
        ))}
      </div>
      <p className="founder-panel__footnote">Online now is unavailable until D8N has a canonical presence signal.</p>
    </section>
  );
}

export function FounderDemographics({ analytics }: { analytics: HqAnalyticsOverview | null }) {
  const [dimension, setDimension] = useState(DEMOGRAPHIC_DIMENSIONS[0]);
  if (!analytics) {
    return (
      <section className="founder-panel" aria-labelledby="demographics-title">
        <h2 id="demographics-title" className="founder-panel__title">Member demographics</h2>
        <p className="founder-panel__subtitle">Loading demographic summary…</p>
      </section>
    );
  }

  const slices = [
    { label: "Women", value: analytics.gender_split.woman, tone: "#8b5cf6" },
    { label: "Men", value: analytics.gender_split.man, tone: "#0ea5e9" },
    { label: "Other", value: analytics.gender_split.other, tone: "#14b8a6" },
    { label: "Unspecified", value: analytics.gender_split.unknown, tone: "#cbd5e1" },
  ];
  const total = slices.reduce((sum, item) => sum + item.value, 0);
  let progress = 0;
  const segments = slices.map((slice) => {
    const start = total ? (progress / total) * 100 : 0;
    progress += slice.value;
    const end = total ? (progress / total) * 100 : 0;
    return `${slice.tone} ${start}% ${end}%`;
  }).join(", ");

  return (
    <section className="founder-panel founder-people-panel" aria-labelledby="demographics-title">
      <div className="founder-panel__heading">
        <div>
          <h2 id="demographics-title" className="founder-panel__title">Member demographics</h2>
          <p className="founder-panel__subtitle">Published profile breakdown for {analytics.brand}.</p>
        </div>
        <FounderIconBadge name="users" tone="green" />
      </div>
      <div className="founder-pool-tabs" role="tablist" aria-label="Demographic dimension">
        {DEMOGRAPHIC_DIMENSIONS.map((dim) => (
          <span
            key={dim}
            role="tab"
            tabIndex={0}
            aria-selected={dim === dimension}
            className={dim === dimension ? "is-active" : undefined}
            onClick={() => setDimension(dim)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") setDimension(dim);
            }}
          >
            {dim}
          </span>
        ))}
      </div>
      {dimension === "Gender" ? (
        <div className="founder-demographics">
          <div className="founder-demographics__donut" style={{ background: `conic-gradient(${segments})` }}>
            <div><strong>{count(total)}</strong><span>profiles</span></div>
          </div>
          <dl className="founder-demographics__list">
            {slices.map((slice) => (
              <div key={slice.label}>
                <dt><i style={{ background: slice.tone }} />{slice.label}</dt>
                <dd>{count(slice.value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : (
        <p className="founder-reference-empty founder-reference-empty--note">
          Needs backend implementation: {dimension.toLowerCase()} is not exposed by the analytics
          overview contract yet — only gender distribution is aggregated today.
        </p>
      )}
    </section>
  );
}
