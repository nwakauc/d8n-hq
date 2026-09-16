import { Link } from "react-router-dom";
import { HqSiteLink } from "./HqSiteLink.tsx";
import { HqSidebarNav } from "./HqSidebarNav.tsx";
import { useHqOperator } from "./useHqOperator.ts";

export function HqSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { operator } = useHqOperator();

  return (
    <aside className="hq-sidebar" aria-label="D8N HQ navigation">
      <div className="hq-sidebar__brand">
        <div className="hq-sidebar__mark" aria-hidden="true">
          D8
        </div>
        <div>
          <div className="hq-sidebar__title">D8N HQ</div>
          <div className="hq-sidebar__subtitle">Command centre</div>
        </div>
      </div>

      <HqSidebarNav operator={operator} onNavigate={onNavigate} />

      <div className="hq-sidebar__footer">
        <Link to="/ops" className="hq-site-link hq-site-link--sidebar" onClick={onNavigate}>
          DateZA Admin
        </Link>
        <HqSiteLink variant="sidebar" onNavigate={onNavigate} />
        <p className="hq-sidebar__phase">Phase 1–2 · Operator HQ</p>
      </div>
    </aside>
  );
}
