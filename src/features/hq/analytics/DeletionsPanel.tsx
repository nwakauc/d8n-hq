import { Link } from "react-router-dom";
import { FounderIcon } from "../founder/founderIcons.tsx";

const REASON_ROWS = [
  "Not enough people",
  "Not finding suitable people",
  "Found someone",
  "Privacy concerns",
  "Fake/scam concerns",
  "App/product problems",
  "Other",
];

/**
 * Reference-layout shell: D8N does not yet emit a canonical cross-brand
 * deletion event with a preserved reason, so this renders the chart/legend
 * frame the moment that lands, without inventing counts today.
 */
export function DeletionsPanel() {
  return (
    <section className="hq-card hq-analytics-panel founder-reference-panel founder-deletions" aria-labelledby="deletions-title">
      <div className="hq-analytics-panel__header">
        <div>
          <h2 id="deletions-title">Deletions</h2>
          <p className="hq-card__subtitle">Account deletions by day, with stored reasons.</p>
        </div>
      </div>
      <div className="founder-empty-frame founder-empty-frame--chart" aria-hidden="true">
        <FounderIcon name="circle-alert" size={20} />
        <span>Deletion trend renders here once a canonical event exists</span>
      </div>
      <ul className="founder-reference-list founder-reference-list--compact">
        {REASON_ROWS.map((reason) => (
          <li key={reason} className="founder-reference-list__row">
            <span>{reason}</span>
            <span className="founder-reference-list__value">—</span>
          </li>
        ))}
      </ul>
      <p className="founder-reference-empty founder-reference-empty--note">
        Needs backend implementation: a canonical, cross-brand deletion event with a preserved reason
        code. See instrumentation gap register (deletions).
      </p>
      <Link className="founder-link-arrow" to="/hq/members">View deleted accounts</Link>
    </section>
  );
}
