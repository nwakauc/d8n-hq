import { Link } from "react-router-dom";
import { findHqNavItem, hqUnavailableCopy } from "../navConfig.ts";
import { MetricCard, UnavailableState } from "../components/HqPrimitives.tsx";

export default function UnavailableHqPage({ path }: { path: string }) {
  const item = findHqNavItem(path);
  const copy = hqUnavailableCopy(item?.availability ?? "planned");

  return (
    <div className="hq-content">
      <MetricCard title={item?.label ?? "D8N HQ"}>
        <UnavailableState badge={copy.badge} title={copy.title} body={copy.body} />
        <p className="hq-card__subtitle" style={{ marginTop: 12 }}>
          <Link to="/hq">Back to Command Centre</Link>
          {" · "}
          <Link to="/hq/members">Open Members</Link>
        </p>
      </MetricCard>
    </div>
  );
}
