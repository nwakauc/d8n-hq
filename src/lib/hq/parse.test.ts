import { describe, expect, it } from "vitest";
import {
  displayNameForMember,
  memberRouteKey,
  parseDiscoveryDiagnostic,
  parseIdentityCorrectionResponse,
  parseMember360,
  parseCurrentOperatorResponse,
  parseRealmeModerationResult,
  parseRealmeQueue,
  parseRegistrationTrendResponse,
  parseProductFunnel,
  parseProductTrends,
  parseHqDevices,
  parseHqNotificationHealth,
  parseHqSystemHealth,
} from "./parse.ts";

describe("operational HQ contracts", () => {
  it("keeps device versions and active counts evidence-backed", () => {
    const result = parseHqDevices({
      window: "24h",
      brand: "date9ja",
      generated_at: "2026-09-21T10:00:00Z",
      time_zone: "Africa/Johannesburg",
      platforms: {
        android: { active_users: 2, active_devices: 2, versions: [{ version: "2.4.1", active_users: 2, active_devices: 2, last_seen_at: null }] },
        ios: { active_users: 0, active_devices: 0, versions: [] },
        web: { active_users: 1, active_devices: 1, versions: [{ version: null, active_users: 1, active_devices: 1, last_seen_at: null }] },
        other: { active_users: 0, active_devices: 0, versions: [] },
      },
      rows: [],
    });
    expect(result.platforms.android.versions[0]?.version).toBe("2.4.1");
  });

  it("does not turn missing notification receipts into delivered counts", () => {
    const channel = (name: "push" | "email" | "sms") => ({
      channel: name,
      configured: true,
      status: "unknown",
      provider: ["test"],
      attempted: 0,
      queued: 0,
      processing: 0,
      provider_accepted: 0,
      failed: 0,
      skipped: 0,
      delivery_receipts: "not_captured",
      delivery_rate: null,
      failure_rate: null,
      failure_reasons: {},
      last_failure_at: null,
      message: "No delivery attempts were recorded in this window.",
    });
    const result = parseHqNotificationHealth({
      window: "24h", brand: "date9ja", generated_at: "2026-09-21T10:00:00Z", time_zone: "Africa/Johannesburg",
      channels: { push: channel("push"), email: channel("email"), sms: { ...channel("sms"), configured: false, status: "not_configured" } },
    });
    expect(result.channels.push.delivery_receipts).toBe("not_captured");
    expect(result.channels.sms.status).toBe("not_configured");
  });

  it("accepts explicit unknown system status", () => {
    const service = { status: "unknown", checked_at: "2026-09-21T10:00:00Z", latency_ms: null, message: "No probe", evidence: {} };
    const result = parseHqSystemHealth({
      generated_at: "2026-09-21T10:00:00Z", brand: "date9ja", overall: "unknown",
      services: { api: service, database: service, jobs: service, media_storage: service, notifications: service, third_party: [] },
      releases: {
        hq: null,
        d8n_api: { app: "d8n", git_sha: null, release: null, image_version: null, environment: "test", rails_environment: "test", build_timestamp: null, booted_at: "2026-09-21T10:00:00Z" },
      },
    });
    expect(result.overall).toBe("unknown");
  });
});

describe("parseRegistrationTrendResponse", () => {
  it("accepts the bounded production registration trend contract", () => {
    const response = parseRegistrationTrendResponse({
      generated_at: "2026-08-30T12:00:00Z",
      time_zone: "Africa/Johannesburg",
      window: "last_30d",
      definition: "Kept brand memberships created on each brand-local calendar date.",
      brands: [{ brand: "dateza", status: "available", total: 2, points: { "2026-08-29": 2 } }],
    });
    expect(response.brands[0]?.points["2026-08-29"]).toBe(2);
  });
});

describe("parseProductFunnel", () => {
  it("keeps uninstrumented funnel stages unavailable instead of turning them into zero", () => {
    const funnel = parseProductFunnel({
      funnel: {
        brand: "dateza",
        window: "last_7d",
        generated_at: "2026-08-30T12:00:00Z",
        time_zone: "Africa/Johannesburg",
        stages: [{
          id: "onboarding_completed",
          definition: "No authoritative onboarding-completed timestamp is persisted yet.",
          status: "unavailable",
          unit: "members",
          conversion_from_previous: null,
          conversion_from_registration: null,
          limitations: ["No authoritative onboarding-completed timestamp is persisted yet."],
        }],
      },
    });
    expect(funnel.stages[0]?.status).toBe("unavailable");
    expect(funnel.stages[0]).not.toHaveProperty("value");
  });
});

describe("parseProductTrends", () => {
  it("parses only explicit count series from the product intelligence contract", () => {
    const trends = parseProductTrends({
      trends: {
        brand: "dateza",
        window: "last_7d",
        generated_at: "2026-08-30T12:00:00Z",
        time_zone: "Africa/Johannesburg",
        series: [{
          id: "likes",
          definition: "Kept Like rows created on each brand-local calendar date.",
          status: "available",
          unit: "count",
          limitations: [],
          points: { "2026-08-30": 7 },
        }],
      },
    });
    expect(trends.series[0]?.points["2026-08-30"]).toBe(7);
  });
});

describe("parseCurrentOperatorResponse", () => {
  it("accepts the production founder operator contract", () => {
    const response = parseCurrentOperatorResponse({
      operator: {
        admin_user_id: 10,
        user_id: 1,
        status: "active",
        current_brand: "dateza",
        role: "founder",
        effective_capabilities: [
          "hq.member.sensitive_read",
          "admin.profile_publication.manage",
          "hq.system.read",
          "hq.backups.manage",
        ],
        grantable_roles: ["moderator"],
        brand_assignments: [{
          brand: "dateza",
          role: "founder",
          effective_capabilities: ["admin.profile_publication.manage"],
        }],
        mfa: {
          state: "active",
          required: true,
          verified: true,
          recovery_codes_remaining: 8,
        },
      },
    });

    expect(response.operator.role).toBe("founder");
    expect(response.operator.effective_capabilities).toContain("admin.profile_publication.manage");
    expect(response.operator.effective_capabilities).toContain("hq.backups.manage");
  });
});

const member360Fixture = {
  member: {
    user_id: 99,
    profile_id: "11111111-1111-1111-1111-111111111111",
    brand: "dateza",
    membership_status: "active",
  },
  sections: {
    identity: {
      user_id: 99,
      user_status: "active",
      first_name: "Lebo",
      last_name: "Molefe",
      user_created_at: "2026-01-01T00:00:00Z",
      membership_status: "active",
      member_since: "2026-01-02T00:00:00Z",
      account_type: {
        label: "Free",
        founding_member: false,
        subscription_status: null,
        premium_expires_at: null,
      },
      identifiers: [
        {
          kind: "email",
          value: "lebo@example.com",
          verified_at: "2026-01-02T00:00:00Z",
          last_seen_at: "2026-01-03T00:00:00Z",
        },
      ],
      recent_sessions: [],
    },
    profile: {
      exists: true,
      public_id: "11111111-1111-1111-1111-111111111111",
      display_name: "Lebo",
      status: "active",
      visibility: "visible",
      gender: "woman",
      birthdate: "1995-04-01",
      country_code: "ZA",
      city: "Cape Town",
      created_at: "2026-01-02T00:00:00Z",
      onboarding_state: "complete",
      onboarding_next_step: null,
      onboarding_completion_percent: 100,
      photo_count: 0,
      photos: [],
      preference: null,
    },
    product: {
      likes_given: 4,
      likes_received: 2,
      matches_active: 1,
      hooks_sent: 0,
      hooks_received: 0,
      hooks_live_sent: 0,
      hooks_live_received: 0,
      hook_tonight_live: false,
      conversations_count: 1,
      recent_conversations: [],
      blocks_given: 0,
      blocks_received: 0,
    },
    comms: {
      delivery_counts_by_status: { sent: 2 },
      delivery_counts_by_channel: { email: 2 },
      recent_deliveries: [],
    },
    safety: {
      reports_filed_count: 0,
      reports_received_count: 0,
      recent_reports: [],
      active_enforcement: null,
      enforcement_count: 0,
      account_closure: null,
    },
    activity: {
      last_login_at: "2026-08-01T12:00:00Z",
      recent_auth_attempts: [],
      recent_security_events: [],
    },
  },
};

describe("parseMember360", () => {
  it("parses the OpenAPI Member 360 shape", () => {
    const member = parseMember360(member360Fixture);
    expect(member.member.profile_id).toBe("11111111-1111-1111-1111-111111111111");
    expect(member.sections.profile.exists).toBe(true);
    expect(member.sections.product.likes_given).toBe(4);
    expect(displayNameForMember(member)).toBe("Lebo");
    expect(memberRouteKey(member.member, "lebo@example.com")).toBe(
      "11111111-1111-1111-1111-111111111111",
    );
  });

  it("keeps profile.exists false without inventing other profile fields", () => {
    const member = parseMember360({
      ...member360Fixture,
      member: { ...member360Fixture.member, profile_id: null },
      sections: {
        ...member360Fixture.sections,
        profile: { exists: false },
      },
    });
    expect(member.sections.profile).toEqual({ exists: false });
    expect(memberRouteKey(member.member, "lebo@example.com")).toBe("lebo@example.com");
  });
});

describe("parseDiscoveryDiagnostic", () => {
  it("parses the coarser three-stage funnel", () => {
    const diagnostic = parseDiscoveryDiagnostic({
      eligible: true,
      ineligibility_reason: null,
      stages: [
        {
          stage: "visible_active_profiles",
          description: "Visible active profiles",
          candidate_count: 1200,
        },
        {
          stage: "reciprocal_gender_age_distance",
          description: "After reciprocal gender, age, and distance filters",
          candidate_count: 80,
        },
        {
          stage: "final_eligible_candidates",
          description: "After exclusions",
          candidate_count: 12,
        },
      ],
    });
    expect(diagnostic.stages).toHaveLength(3);
    expect(diagnostic.stages[1]?.stage).toBe("reciprocal_gender_age_distance");
  });
});

describe("parseRealmeQueue", () => {
  it("parses a queue of pending assertions with evidence", () => {
    const queue = parseRealmeQueue({
      assertions: [
        {
          id: 1,
          user_id: 99,
          check_type: "selfie",
          submitted_at: "2026-01-01T00:00:00Z",
          evidence: { content_type: "image/jpeg", url: "https://r2.example/1", url_expires_in: 300 },
        },
        {
          id: 2,
          user_id: 100,
          check_type: "video",
          submitted_at: null,
          evidence: null,
        },
      ],
    });
    expect(queue.assertions).toHaveLength(2);
    expect(queue.assertions[0]?.evidence?.url).toBe("https://r2.example/1");
    expect(queue.assertions[1]?.evidence).toBeNull();
  });

  it("rejects an unknown check_type", () => {
    expect(() =>
      parseRealmeQueue({ assertions: [{ id: 1, user_id: 1, check_type: "fingerprint", submitted_at: null, evidence: null }] }),
    ).toThrow();
  });
});

describe("parseRealmeModerationResult", () => {
  it("parses an approved decision", () => {
    const result = parseRealmeModerationResult({
      transitioned: true,
      assertion: { id: 1, user_id: 99, check_type: "government_id", status: "approved", reviewed_at: "2026-01-01T00:00:00Z" },
    });
    expect(result.transitioned).toBe(true);
    expect(result.assertion.status).toBe("approved");
  });
});

describe("parseIdentityCorrectionResponse", () => {
  it("parses a gender correction", () => {
    const correction = parseIdentityCorrectionResponse({
      correction: {
        id: 5,
        profile_id: "11111111-1111-1111-1111-111111111111",
        field: "gender",
        previous_value: "man",
        new_value: "woman",
        reason: "member requested correction",
        note: null,
        admin_user_id: 3,
        created_at: "2026-01-01T00:00:00Z",
      },
    });
    expect(correction.field).toBe("gender");
    expect(correction.new_value).toBe("woman");
  });
});
