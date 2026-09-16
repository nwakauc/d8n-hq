import { describe, expect, it } from "vitest";
import { displayNameForMember, memberRouteKey, parseDiscoveryDiagnostic, parseMember360 } from "./parse.ts";

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
