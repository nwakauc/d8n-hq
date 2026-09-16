import { ChevronRight, Lock } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { canAccessNavItem } from "../../lib/hq/capabilities.ts";
import type { HqCurrentOperator } from "../../lib/hq/types.ts";
import { isNavGroupExpanded, setNavGroupExpanded } from "./hqNavExpansion.ts";
import {
  HQ_NAV,
  isHqNavItemActive,
  isNavItemSoon,
  type HqNavGroup,
  type HqNavItem,
} from "./navConfig.ts";

function capabilityIdForItem(item: HqNavItem): string {
  if (item.id.startsWith("trust-")) return "trust-safety";
  return item.id;
}

function accessibleItems(
  items: HqNavItem[],
  operator: HqCurrentOperator | null | undefined,
): HqNavItem[] {
  return items.filter((item) => canAccessNavItem(operator, capabilityIdForItem(item)));
}

function accessibleGroups(
  operator: HqCurrentOperator | null | undefined,
): HqNavGroup[] {
  return HQ_NAV.map((entry) => ({
    ...entry.group,
    items: accessibleItems(entry.group.items, operator),
  })).filter((group) => group.items.length > 0);
}

function groupHasActiveChild(group: HqNavGroup, pathname: string, search: string): boolean {
  return group.items.some((item) => isHqNavItemActive(item, pathname, search));
}

function NavGroup({
  group,
  pathname,
  search,
  onNavigate,
}: {
  group: HqNavGroup;
  pathname: string;
  search: string;
  onNavigate?: () => void;
}) {
  const activeChild = groupHasActiveChild(group, pathname, search);
  const [toggleExpanded, setToggleExpanded] = useState(() =>
    isNavGroupExpanded(group.id, activeChild),
  );
  const expanded = activeChild || toggleExpanded;

  const toggle = useCallback(() => {
    setToggleExpanded((value) => {
      const next = activeChild ? true : !value;
      setNavGroupExpanded(group.id, next);
      return next;
    });
  }, [activeChild, group.id]);

  const panelId = `hq-nav-group-${group.id}`;

  return (
    <div className={`hq-nav-accordion${expanded ? " hq-nav-accordion--open" : ""}`}>
      <button
        type="button"
        className="hq-nav-accordion__trigger"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={toggle}
      >
        <span className="hq-nav-accordion__label">{group.label}</span>
        <ChevronRight size={14} className="hq-nav-accordion__chevron" aria-hidden="true" />
      </button>
      <div id={panelId} className="hq-nav-accordion__panel" hidden={!expanded}>
        <div className="hq-nav-accordion__items">
          {group.items.map((item) => {
            const active = isHqNavItemActive(item, pathname, search);
            const soon = isNavItemSoon(item);
            return (
              <NavLink
                key={item.id}
                to={item.path}
                className={[
                  "hq-nav-link",
                  "hq-nav-link--child",
                  active ? "hq-nav-link--active" : "",
                  soon ? "hq-nav-link--soon" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
              >
                <span className="hq-nav-link__label">{item.label}</span>
                {soon ? (
                  <span className="hq-nav-link__meta" title="Coming soon">
                    <Lock size={11} aria-hidden="true" />
                    <span>Soon</span>
                  </span>
                ) : null}
              </NavLink>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function HqSidebarNav({
  operator,
  onNavigate,
}: {
  operator: HqCurrentOperator | null | undefined;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const pathname = location.pathname;
  const search = location.search;

  const groups = useMemo(() => accessibleGroups(operator), [operator]);

  return (
    <nav className="hq-sidebar__nav" aria-label="HQ sections">
      {groups.map((group) => (
        <NavGroup
          key={group.id}
          group={group}
          pathname={pathname}
          search={search}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}
