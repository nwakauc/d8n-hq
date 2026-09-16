export type HqNavAvailability = "ready" | "planned" | "phase_gated";

/** `available` = live today; `coming_soon` = reserved route, shown with Soon treatment. */
export type HqNavVisibility = "available" | "coming_soon";

export type HqNavItem = {
  id: string;
  label: string;
  /** Path under /hq — may include ?tab= for in-page sections. */
  path: string;
  availability: HqNavAvailability;
  visibility: HqNavVisibility;
};

export type HqNavGroup = {
  id: string;
  label: string;
  items: HqNavItem[];
};

export type HqNavEntry = { type: "group"; group: HqNavGroup };

function soon(
  item: Omit<HqNavItem, "availability" | "visibility"> & {
    availability?: HqNavAvailability;
  },
): HqNavItem {
  const availability = item.availability ?? "planned";
  return {
    ...item,
    availability,
    visibility: availability === "ready" ? "available" : "coming_soon",
  };
}

function live(item: Omit<HqNavItem, "availability" | "visibility">): HqNavItem {
  return { ...item, availability: "ready", visibility: "available" };
}

/**
 * Full HQ navigation IA — every planned area is visible; unimplemented routes use Soon treatment.
 */
export const HQ_NAV: HqNavEntry[] = [
  {
    type: "group",
    group: {
      id: "command",
      label: "Command centre",
      items: [
        live({ id: "command-centre", label: "Command Centre", path: "/hq" }),
        soon({ id: "live-events", label: "Live / Events", path: "/hq/live" }),
        live({ id: "alerts", label: "Security alerts", path: "/hq/alerts" }),
        soon({ id: "incidents", label: "Incidents", path: "/hq/incidents" }),
      ],
    },
  },
  {
    type: "group",
    group: {
      id: "people",
      label: "People",
      items: [
        live({ id: "members", label: "Members", path: "/hq/members" }),
        soon({
          id: "customers",
          label: "Customers & Support",
          path: "/hq/customers",
          availability: "phase_gated",
        }),
      ],
    },
  },
  {
    type: "group",
    group: {
      id: "product",
      label: "Product",
      items: [
        soon({ id: "product", label: "Product Intelligence", path: "/hq/product" }),
        soon({ id: "marketplace", label: "Marketplace Health", path: "/hq/marketplace" }),
        soon({ id: "growth", label: "Growth & Marketing", path: "/hq/growth" }),
      ],
    },
  },
  {
    type: "group",
    group: {
      id: "trust",
      label: "Trust & Safety",
      items: [
        live({ id: "trust-overview", label: "Overview", path: "/hq/trust-safety" }),
        live({ id: "trust-reports", label: "Reports", path: "/hq/trust-safety?tab=queue" }),
        live({ id: "trust-photos", label: "Photo moderation", path: "/hq/trust-safety?tab=overview" }),
        live({ id: "trust-enforcements", label: "Enforcements", path: "/hq/trust-safety?tab=enforcements" }),
        live({ id: "trust-offenders", label: "Repeat offenders", path: "/hq/trust-safety?tab=offenders" }),
      ],
    },
  },
  {
    type: "group",
    group: {
      id: "engineering",
      label: "Engineering",
      items: [
        soon({ id: "reliability", label: "Reliability", path: "/hq/reliability" }),
        soon({ id: "errors", label: "Errors", path: "/hq/errors" }),
        soon({ id: "apm", label: "APM & Traces", path: "/hq/apm" }),
        soon({ id: "jobs", label: "Jobs & Queues", path: "/hq/jobs" }),
        soon({ id: "database", label: "Database", path: "/hq/database" }),
        soon({ id: "infra", label: "Infrastructure", path: "/hq/infrastructure" }),
        soon({ id: "deployments", label: "Deployments", path: "/hq/deployments" }),
      ],
    },
  },
  {
    type: "group",
    group: {
      id: "platform",
      label: "Platform",
      items: [
        soon({ id: "brands", label: "Brands", path: "/hq/brands" }),
        soon({ id: "admin", label: "Operators / Admin", path: "/hq/admin" }),
        soon({ id: "audit", label: "Audit", path: "/hq/audit" }),
        soon({ id: "security-platform", label: "Security", path: "/hq/security" }),
      ],
    },
  },
  {
    type: "group",
    group: {
      id: "business",
      label: "Business",
      items: [
        soon({ id: "revenue", label: "Revenue", path: "/hq/revenue", availability: "phase_gated" }),
        soon({ id: "acquisition", label: "Acquisition", path: "/hq/acquisition" }),
      ],
    },
  },
  {
    type: "group",
    group: {
      id: "intelligence",
      label: "Intelligence",
      items: [
        soon({
          id: "company-intelligence",
          label: "Company Intelligence",
          path: "/hq/intelligence",
          availability: "phase_gated",
        }),
        soon({
          id: "briefings",
          label: "Executive Briefings",
          path: "/hq/briefings",
          availability: "phase_gated",
        }),
      ],
    },
  },
];

/** @deprecated Use HQ_NAV — kept for route lookup helpers. */
export const HQ_NAV_GROUPS: HqNavGroup[] = HQ_NAV.map((entry) => entry.group);

function allNavItems(): HqNavItem[] {
  return HQ_NAV.flatMap((entry) => entry.group.items);
}

export function isNavItemSoon(item: HqNavItem): boolean {
  return item.availability !== "ready" || item.visibility === "coming_soon";
}

export function navItemPathname(path: string): string {
  return path.split("?")[0] ?? path;
}

export function navItemSearchTab(path: string): string | null {
  const query = path.split("?")[1];
  if (!query) return null;
  return new URLSearchParams(query).get("tab");
}

function normalizePathname(pathname: string): string {
  return pathname.replace(/\/$/, "") || "/hq";
}

export function isHqNavItemActive(
  item: HqNavItem,
  pathname: string,
  search: string,
): boolean {
  const normalized = normalizePathname(pathname);
  const currentTab = new URLSearchParams(search).get("tab");
  const itemPath = navItemPathname(item.path);
  const itemTab = navItemSearchTab(item.path);

  if (normalized.match(/^\/hq\/trust-safety\/reports\//)) {
    return item.id === "trust-reports";
  }

  if (item.id === "command-centre") {
    return normalized === "/hq";
  }

  if (item.id === "trust-overview") {
    return (
      normalized === "/hq/trust-safety" &&
      (currentTab === null || currentTab === "overview")
    );
  }

  if (item.id === "trust-photos") {
    return false;
  }

  if (itemTab) {
    return normalized.startsWith(itemPath) && currentTab === itemTab;
  }

  if (itemPath === "/hq/members") {
    return normalized.startsWith("/hq/members");
  }

  if (itemPath === "/hq/alerts") {
    return normalized.startsWith("/hq/alerts");
  }

  return normalized === itemPath || normalized.startsWith(`${itemPath}/`);
}

export function findHqNavItem(pathname: string, search = ""): HqNavItem | undefined {
  const normalized = normalizePathname(pathname);
  for (const item of allNavItems()) {
    if (isHqNavItemActive(item, normalized, search)) {
      return item;
    }
  }
  return undefined;
}

export function findHqNavGroupIdForPath(pathname: string, search = ""): string | null {
  const normalized = normalizePathname(pathname);
  for (const entry of HQ_NAV) {
    for (const item of entry.group.items) {
      if (isHqNavItemActive(item, normalized, search)) {
        return entry.group.id;
      }
    }
  }
  return null;
}

export function hqUnavailableCopy(availability: HqNavAvailability): {
  title: string;
  body: string;
  badge: string;
} {
  if (availability === "phase_gated") {
    return {
      title: "Not available yet",
      body: "This area depends on product capabilities that do not exist in D8N yet. HQ will not invent data for it.",
      badge: "NOT CONFIGURED",
    };
  }
  return {
    title: "Coming later",
    body: "Navigation is reserved so the shell can grow. This page is not part of the Phase 1–2 HQ surfaces yet.",
    badge: "COMING LATER",
  };
}
