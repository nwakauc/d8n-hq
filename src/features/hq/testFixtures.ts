import type { HqCapability } from "../../lib/hq/types.ts";

const DEFAULT_CAPABILITIES: HqCapability[] = [
  "hq.member.sensitive_read",
  "hq.member.security_read",
  "hq.discovery_diagnostics.read",
  "hq.trust_safety.read",
  "admin.reports.read",
  "admin.reports.moderate",
  "admin.enforcements.create",
  "admin.enforcements.reinstate",
  "hq.analytics.read",
  "hq.security_alerts.read",
];

export function operatorFixture(overrides: Record<string, unknown> = {}, mfaVerified = true) {
  return {
    admin_user_id: 10,
    user_id: 1,
    status: "active",
    current_brand: "dateza",
    role: "moderator",
    effective_capabilities: DEFAULT_CAPABILITIES,
    grantable_roles: [],
    brand_assignments: [
      {
        brand: "dateza",
        role: "moderator",
        effective_capabilities: DEFAULT_CAPABILITIES,
      },
    ],
    mfa: {
      state: "active",
      required: true,
      verified: mfaVerified,
      recovery_codes_remaining: 8,
    },
    ...overrides,
  };
}

export function json(status: number, body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

export function meOk() {
  return json(200, {
    user_id: 1,
    brand: { slug: "dateza", name: "DateZA" },
    session: { id: 2, expires_at: "2026-12-01T00:00:00Z", authentication_mode: "bearer" },
    identifier: { kind: "email", verified: true, masked_destination: "o••@d8n.tech" },
    verification_required: false,
    verification: { code_dispatched: false, resend_available_in: 0 },
  });
}

export function operatorOk(mfaVerified = true, overrides: Record<string, unknown> = {}) {
  return json(200, { operator: operatorFixture(overrides, mfaVerified) });
}

export function urlOf(input: RequestInfo | URL): string {
  return typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
}

export function isOperatorProbe(url: string): boolean {
  return url.includes("/api/v1/hq/operator");
}

function metricAvailable(
  metricId: string,
  definition: string,
  value: number | Record<string, number>,
  unit: "count" | "ratio" | "seconds" = "count",
  extras: Record<string, unknown> = {},
) {
  return {
    metric_id: metricId,
    version: 1,
    definition,
    status: "available",
    value,
    unit,
    limitations: [],
    ...extras,
  };
}

function metricUnavailable(metricId: string, definition: string, limitations: string[]) {
  return {
    metric_id: metricId,
    version: 1,
    definition,
    status: "unavailable",
    unit: null,
    limitations,
  };
}

function metricInsufficient(metricId: string, definition: string, limitations: string[]) {
  return {
    metric_id: metricId,
    version: 1,
    definition,
    status: "insufficient_data",
    unit: null,
    limitations,
  };
}

function windowedMetric(metricId: string, definition: string, values: Record<string, number>) {
  const windows = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key,
      metricAvailable(metricId, definition, value),
    ]),
  );
  return windows;
}

const WINDOWS_META = {
  today: {
    label: "Today",
    start_at: "2026-08-30T00:00:00Z",
    end_at: "2026-08-30T12:00:00Z",
  },
  yesterday: {
    label: "Previous day",
    start_at: "2026-08-29T00:00:00Z",
    end_at: "2026-08-30T00:00:00Z",
  },
  last_7d: {
    label: "Last 7 days",
    start_at: "2026-08-23T12:00:00Z",
    end_at: "2026-08-30T12:00:00Z",
  },
  previous_7d: {
    label: "Previous 7 days",
    start_at: "2026-08-16T12:00:00Z",
    end_at: "2026-08-23T12:00:00Z",
  },
  last_30d: {
    label: "Last 30 days",
    start_at: "2026-07-31T12:00:00Z",
    end_at: "2026-08-30T12:00:00Z",
  },
  previous_30d: {
    label: "Previous 30 days",
    start_at: "2026-07-01T12:00:00Z",
    end_at: "2026-07-31T12:00:00Z",
  },
};

export function commandCentreHealthFixture(overrides: Record<string, unknown> = {}) {
  const brandHealth = {
    brand: "dateza",
    generated_at: "2026-08-30T12:00:00Z",
    time_zone: "Africa/Johannesburg",
    windows: WINDOWS_META,
    audience: {
      memberships_total: metricAvailable(
        "memberships.total",
        "Distinct users with a kept BrandMembership on the brand.",
        500,
      ),
      memberships_new: windowedMetric("memberships.new", "Kept BrandMembership rows created in the window.", {
        today: 3,
        last_7d: 12,
        last_30d: 45,
      }),
    },
    activity: {
      active_users: windowedMetric(
        "users.active",
        "Distinct users with a Session last_used_at in the window for the brand.",
        { today: 8, last_7d: 120, last_30d: 400 },
      ),
    },
    profile_health: {
      by_status: metricAvailable(
        "profiles.by_status",
        "Kept profiles grouped by profile status at snapshot time.",
        { draft: 40, active: 300, suspended: 5 },
      ),
      visible_published: metricAvailable(
        "profiles.visible_published",
        "Kept profiles with status active and visibility visible.",
        280,
      ),
      activation_ratio: metricAvailable(
        "profiles.activation_ratio",
        "Active profiles divided by kept memberships (usable profile rate).",
        0.6,
        "ratio",
        { numerator: 300, denominator: 500 },
      ),
    },
    marketplace: {
      likes_created: windowedMetric("marketplace.likes_created", "Kept Like rows created in the window.", {
        today: 10,
        last_7d: 80,
        last_30d: 300,
      }),
      matches_created: windowedMetric("marketplace.matches_created", "Kept Match rows created in the window.", {
        today: 2,
        last_7d: 15,
        last_30d: 60,
      }),
      conversations_created: windowedMetric(
        "marketplace.conversations_created",
        "Kept Conversation rows created in the window.",
        { today: 1, last_7d: 8, last_30d: 30 },
      ),
      zero_discovery_allocations: {
        yesterday: metricAvailable(
          "marketplace.zero_discovery_allocations",
          "DiscoveryAllocation rows on completed local calendar dates in the window with zero kept candidates.",
          0,
        ),
        last_7d: metricAvailable(
          "marketplace.zero_discovery_allocations",
          "DiscoveryAllocation rows on completed local calendar dates in the window with zero kept candidates.",
          2,
        ),
        last_30d: metricAvailable(
          "marketplace.zero_discovery_allocations",
          "DiscoveryAllocation rows on completed local calendar dates in the window with zero kept candidates.",
          5,
        ),
      },
      published_without_likes: metricAvailable(
        "marketplace.published_without_likes",
        "Published profiles with no kept Like row as liker or liked profile (lifetime).",
        12,
      ),
      published_without_matches: metricAvailable(
        "marketplace.published_without_matches",
        "Published profiles with no kept Match row on either profile side (lifetime).",
        40,
      ),
      time_to_first_like_median: metricUnavailable("marketplace.time_to_first_like_median", "Median seconds to first like.", [
        "Deferred in this milestone.",
      ]),
      time_to_first_match_median: metricUnavailable("marketplace.time_to_first_match_median", "Median seconds to first match.", [
        "Deferred in this milestone.",
      ]),
      time_to_first_conversation_median: metricUnavailable(
        "marketplace.time_to_first_conversation_median",
        "Median seconds to first conversation.",
        ["Deferred in this milestone."],
      ),
    },
    trust_safety: {
      open_reports: metricAvailable("trust.open_reports", "Reports with status open.", 5),
      awaiting_decision: metricAvailable("trust.awaiting_decision", "Reports with status open or reviewing.", 3),
      active_enforcements: metricAvailable(
        "trust.active_enforcements",
        "AccountEnforcement rows active on the brand.",
        2,
      ),
      pending_photo_reviews: metricAvailable(
        "trust.pending_photo_reviews",
        "Kept profile photos awaiting moderation review.",
        0,
      ),
      oldest_open_report_age_seconds: metricInsufficient(
        "trust.oldest_open_report_age_seconds",
        "Age in seconds of the oldest open report, if any.",
        ["No open reports on this brand."],
      ),
    },
    attention_signals: [],
    ...overrides,
  };

  return { brand_health: brandHealth };
}

export function commandCentreHealthOk(overrides: Record<string, unknown> = {}) {
  return json(200, commandCentreHealthFixture(overrides));
}

export function commandCentreBrandsOk(
  brands: Array<{ brand: string; role?: string; brand_health?: Record<string, unknown> }> = [
    { brand: "dateza", role: "moderator" },
    { brand: "otherbrand", role: "founder" },
  ],
) {
  return json(200, {
    generated_at: "2026-08-30T12:00:00Z",
    time_zone: "Africa/Johannesburg",
    brands: brands.map((entry) => ({
      brand: entry.brand,
      accessible: true,
      role: entry.role ?? "moderator",
      brand_health: commandCentreHealthFixture({
        brand: entry.brand,
        ...(entry.brand_health ?? {}),
      }).brand_health,
    })),
  });
}

export function commandCentreRouteOk(url: string) {
  if (url.includes("/api/v1/hq/command_centre/health")) {
    return commandCentreHealthOk();
  }
  if (url.includes("/api/v1/hq/command_centre/brands")) {
    return commandCentreBrandsOk();
  }
  return undefined;
}
