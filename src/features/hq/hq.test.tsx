import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../auth/AuthProvider.tsx";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../App.tsx";
import { setBrandToken, setActiveBrand } from "../../lib/api/tokenStore.ts";
import { clearHqOperatorAccessCache } from "../../lib/hq/adminAccess.ts";
import { lookupHqMember } from "../../lib/hq/api.ts";
import { clearNavExpansionState } from "./hqNavExpansion.ts";
import {
  commandCentreBrandsOk,
  commandCentreHealthFixture,
  commandCentreHealthOk,
  json,
  meOk,
  operatorOk,
  commandCentreRouteOk,
  urlOf,
} from "./testFixtures.ts";

function withOperator(
  handler: (url: string) => ReturnType<typeof json> | undefined,
  mfaVerified = true,
  operatorOverrides: Record<string, unknown> = {},
) {
  return (input: RequestInfo | URL) => {
    const url = urlOf(input);
    if (url.includes("/api/v1/me")) return meOk();
    if (url.includes("/api/v1/hq/operator")) return operatorOk(mfaVerified, operatorOverrides);
    if (url.includes("/api/v1/version")) return versionOk();
    const commandCentre = commandCentreRouteOk(url);
    if (commandCentre) return commandCentre;
    if (url.includes("/api/v1/hq/security_alerts")) return json(200, { alerts: [] });
    return handler(url) ?? json(404, { error: "not_found" });
  };
}

const PROFILE_ID = "11111111-1111-1111-1111-111111111111";

function isMemberDirectoryList(url: string): boolean {
  return /\/api\/v1\/hq\/members(\?|$)/.test(url);
}

function directoryMember(overrides: Record<string, unknown> = {}) {
  return {
    user_id: 42,
    profile_id: PROFILE_ID,
    display_name: "Sam Directory",
    email: "sam@example.com",
    phone: null,
    age: null,
    gender: "woman",
    looking_for: ["man"],
    city: "Cape Town",
    country_code: "ZA",
    account_type: "Free",
    discovery_status: "visible",
    user_status: "active",
    membership_status: "active",
    profile_status: "active",
    profile_visibility: "visible",
    joined_at: "2026-01-02T00:00:00Z",
    user_created_at: "2026-01-01T00:00:00Z",
    last_active_at: "2026-08-01T12:00:00Z",
    contact_verification: { email: true, phone: false },
    reports_received_count: 1,
    pending_photo_count: 0,
    active_enforcement: false,
    ...overrides,
  };
}

function memberDirectoryOk(
  members: Record<string, unknown>[] = [directoryMember()],
  next_cursor: string | null = null,
) {
  return json(200, { members, next_cursor });
}

function versionOk() {
  return json(200, {
    app: "d8n",
    git_sha: "abc123def456",
    release: "2026.08.30",
    image_version: null,
    environment: "staging",
    rails_environment: "production",
    build_timestamp: "2026-08-30T00:00:00Z",
    booted_at: "2026-08-30T01:00:00Z",
  });
}

function member360Ok(overrides: Record<string, unknown> = {}) {
  return json(200, {
    member: {
      user_id: 99,
      profile_id: PROFILE_ID,
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
            last_seen_at: null,
          },
        ],
        recent_sessions: [],
      },
      profile: {
        exists: true,
        public_id: PROFILE_ID,
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
        delivery_counts_by_status: { sent: 1 },
        delivery_counts_by_channel: { email: 1 },
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
        recent_auth_attempts: [
          {
            kind: "password",
            result: "succeeded",
            ip_address: "1.2.3.4",
            created_at: "2026-08-01T12:00:00Z",
          },
        ],
        recent_security_events: [
          {
            event_type: "hq.member_360_viewed",
            severity: "info",
            created_at: "2026-08-01T12:01:00Z",
          },
        ],
      },
    },
    ...overrides,
  });
}

function member360NoProfile() {
  return json(200, {
    member: {
      user_id: 50,
      profile_id: null,
      brand: "dateza",
      membership_status: "active",
    },
    sections: {
      identity: {
        user_id: 50,
        user_status: "active",
        first_name: null,
        last_name: null,
        user_created_at: "2026-01-01T00:00:00Z",
        membership_status: "active",
        member_since: "2026-01-02T00:00:00Z",
        account_type: {
          label: "Free",
          founding_member: false,
          subscription_status: null,
          premium_expires_at: null,
        },
        identifiers: [],
        recent_sessions: [],
      },
      profile: { exists: false },
      product: {
        likes_given: 0,
        likes_received: 0,
        matches_active: 0,
        hooks_sent: 0,
        hooks_received: 0,
        hooks_live_sent: 0,
        hooks_live_received: 0,
        hook_tonight_live: false,
        conversations_count: 0,
        recent_conversations: [],
        blocks_given: 0,
        blocks_received: 0,
      },
      comms: {
        delivery_counts_by_status: {},
        delivery_counts_by_channel: {},
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
        last_login_at: null,
        recent_auth_attempts: [],
        recent_security_events: [],
      },
    },
  });
}

function renderAt(path: string) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe("D8N HQ Phase 1 integration", () => {
  beforeEach(() => {
    setBrandToken("dateza", { token: "opaque-token", expiresAt: "2099-01-01T00:00:00Z" }); setActiveBrand("dateza");
    clearHqOperatorAccessCache();
    clearNavExpansionState();
    window.localStorage.setItem("hq:experience-mode:v1", "ops");
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    setBrandToken("dateza", undefined);
    clearHqOperatorAccessCache();
    clearNavExpansionState();
    window.localStorage.clear();
  });

  it("redirects unauthenticated operators from /hq to sign-in", async () => {
    setBrandToken("dateza", undefined);
    vi.mocked(fetch).mockImplementation(() => json(401, { error: "unauthorized" }));
    renderAt("/hq");
    expect(
      await screen.findByRole("heading", { name: /d8n hq/i }, { timeout: 5000 }),
    ).toBeInTheDocument();
  });

  it("completes login, session establishment, operator bootstrap, and HQ load", async () => {
    const user = userEvent.setup();
    setBrandToken("dateza", undefined);
    vi.mocked(fetch).mockImplementation((input) => {
      const url = urlOf(input);
      if (url.includes("/api/v1/hq/auth/login")) {
        return json(201, {
          session: { expires_at: "2099-01-01T00:00:00Z", csrf_token: "csrf-token" },
          operator: { user_id: 1, admin_user_id: 10, brand: "dateza" },
        });
      }
      return withOperator(() => undefined)(input);
    });

    renderAt("/sign-in");
    await user.type(screen.getByLabelText("Email or phone"), "founder@example.com");
    await user.type(screen.getByLabelText("Password"), "secret");
    await user.click(screen.getByRole("button", { name: /sign in to dateza/i }));

    expect(await screen.findByRole("heading", { name: "Command Centre" })).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/hq/auth/login"),
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("retains an existing cookie session when the restore probe returns 204", async () => {
    setBrandToken("dateza", undefined);
    window.localStorage.setItem("hq:active-brand:v1", "dateza");
    vi.mocked(fetch).mockImplementation((input) => {
      const url = urlOf(input);
      if (url.includes("/api/v1/hq/auth/session")) return Promise.resolve(new Response(null, { status: 204 }));
      return withOperator(() => undefined)(input);
    });

    renderAt("/hq");
    expect(await screen.findByRole("heading", { name: "Command Centre" })).toBeInTheDocument();
  });

  it("blocks signed-in non-operators from /hq", async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = urlOf(input);
      if (url.includes("/api/v1/me")) return meOk();
      if (url.includes("/api/v1/hq/operator")) return json(403, { error: "forbidden" });
      return json(404, { error: "not_found" });
    });
    renderAt("/hq");
    expect(
      await screen.findByRole("heading", { name: /hq is for authorized operators/i }),
    ).toBeInTheDocument();
  });

  it("requires MFA step-up before loading HQ surfaces", async () => {
    vi.mocked(fetch).mockImplementation(withOperator(() => undefined, false));
    renderAt("/hq");
    expect(await screen.findByRole("heading", { name: /confirm it is you/i })).toBeInTheDocument();
  });

  it("shows host brand context without inventing All Company", async () => {
    vi.mocked(fetch).mockImplementation(withOperator(() => undefined));
    renderAt("/hq");
    expect(await screen.findByLabelText("Brand context")).toHaveTextContent(/DateZA/i);
    expect(screen.queryByRole("option", { name: /all company/i })).not.toBeInTheDocument();
  });

  it("offers a sign-out path from HQ (standalone app has no member site to return to)", async () => {
    vi.mocked(fetch).mockImplementation(withOperator(() => undefined));
    renderAt("/hq");
    expect(await screen.findByRole("heading", { name: "Command Centre" })).toBeInTheDocument();
    const exits = screen.getAllByRole("button", { name: /sign out/i });
    expect(exits.length).toBeGreaterThan(0);
  });

  it("looks up a member and navigates to Member 360 via profile public id", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation(
      withOperator((url) => {
        if (isMemberDirectoryList(url)) return memberDirectoryOk();
        if (url.includes("/api/v1/hq/members/")) {
        if (url.includes("/discovery_diagnostic")) {
          return json(200, {
            eligible: true,
            ineligibility_reason: null,
            stages: [
              {
                stage: "visible_active_profiles",
                description: "Visible active profiles",
                candidate_count: 100,
              },
              {
                stage: "reciprocal_gender_age_distance",
                description: "After reciprocal gender, age, and distance filters",
                candidate_count: 40,
              },
              {
                stage: "final_eligible_candidates",
                description: "After exclusions",
                candidate_count: 3,
              },
            ],
          });
        }
        return member360Ok();
      }
      return undefined;
      }),
    );

    renderAt("/hq/members");
    await screen.findByLabelText(/exact member lookup/i);
    await user.type(screen.getByLabelText(/exact member lookup/i), "lebo@example.com");
    await user.click(screen.getByRole("button", { name: /open member 360/i }));

    expect(await screen.findByRole("heading", { name: "Lebo" })).toBeInTheDocument();
    expect(screen.getAllByText(new RegExp(PROFILE_ID)).length).toBeGreaterThan(0);
    expect(screen.getByText(/likes given/i)).toBeInTheDocument();
  });

  it("shows unknown lookup as not found without enumeration claims", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation((input) => {
      const url = urlOf(input);
      if (url.includes("/api/v1/me")) return meOk();
      if (url.includes("/api/v1/hq/operator")) return operatorOk();
      if (isMemberDirectoryList(url)) return memberDirectoryOk([]);
      if (url.includes("/api/v1/hq/members/")) return json(404, { error: "member_unavailable" });
      return json(404, { error: "not_found" });
    });
    renderAt("/hq/members");
    await screen.findByLabelText(/exact member lookup/i);
    await user.type(screen.getByLabelText(/exact member lookup/i), "missing@example.com");
    await user.click(screen.getByRole("button", { name: /open member 360/i }));
    expect(await screen.findByText(/no member found/i)).toBeInTheDocument();
    expect(screen.getByText(/nothing matched that identifier/i)).toBeInTheDocument();
  });

  it("surfaces forbidden on lookup", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation((input) => {
      const url = urlOf(input);
      if (url.includes("/api/v1/me")) return meOk();
      if (url.includes("/api/v1/hq/operator")) return operatorOk();
      if (isMemberDirectoryList(url)) return memberDirectoryOk([]);
      if (url.includes("/api/v1/hq/members/")) return json(403, { error: "forbidden" });
      return json(404, { error: "not_found" });
    });
    renderAt("/hq/members");
    await screen.findByLabelText(/exact member lookup/i);
    await user.type(screen.getByLabelText(/exact member lookup/i), "x@example.com");
    await user.click(screen.getByRole("button", { name: /open member 360/i }));
    expect(await screen.findByText(/not authorized for this action/i)).toBeInTheDocument();
  });

  it("renders profile-not-existing state from exists:false", async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = urlOf(input);
      if (url.includes("/api/v1/me")) return meOk();
      if (url.includes("/api/v1/hq/operator")) return operatorOk();
      if (url.includes("/discovery_diagnostic")) {
        return json(404, { error: "profile_unavailable" });
      }
      if (url.includes("/api/v1/hq/members/")) return member360NoProfile();
      return json(404, { error: "not_found" });
    });

    renderAt(`/hq/members/no-profile-user@example.com?sections=profile,product`);
    expect(await screen.findByText("This member has no profile yet")).toBeInTheDocument();
    expect(screen.getByText(/sections.profile.exists is false/i)).toBeInTheDocument();
  });

  it("loads security event history on demand with pagination", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation((input) => {
      const url = urlOf(input);
      if (url.includes("/api/v1/me")) return meOk();
      if (url.includes("/api/v1/hq/operator")) return operatorOk();
      if (url.includes("/security_events")) {
        if (url.includes("cursor=")) {
          return json(200, {
            security_events: [
              {
                id: 2,
                event_type: "admin.report_viewed",
                severity: "warning",
                metadata: {},
                ip_address: null,
                created_at: "2026-07-01T00:00:00Z",
              },
            ],
            next_cursor: null,
          });
        }
        return json(200, {
          security_events: [
            {
              id: 1,
              event_type: "hq.security_events_page_loaded",
              severity: "info",
              metadata: { admin_user_id: 1 },
              ip_address: "9.9.9.9",
              created_at: "2026-08-01T00:00:00Z",
            },
          ],
          next_cursor: "cursor-a",
        });
      }
      if (url.includes("/discovery_diagnostic")) {
        return json(200, { eligible: false, ineligibility_reason: "profile_incomplete", stages: [] });
      }
      if (url.includes("/api/v1/hq/members/")) return member360Ok();
      return json(404, { error: "not_found" });
    });

    renderAt(`/hq/members/${PROFILE_ID}?sections=activity`);
    expect(await screen.findByRole("heading", { name: "Lebo" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /load security history/i }));
    expect(await screen.findByText("hq.security_events_page_loaded")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /load more/i }));
    expect(await screen.findByText("admin.report_viewed")).toBeInTheDocument();
  });

  it("loads auth attempts and enforcement history on demand", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation((input) => {
      const url = urlOf(input);
      if (url.includes("/api/v1/me")) return meOk();
      if (url.includes("/api/v1/hq/operator")) return operatorOk();
      if (url.includes("/auth_attempts")) {
        return json(200, {
          auth_attempts: [
            {
              id: 9,
              kind: "password",
              result: "failed",
              identifier: "lebo@example.com",
              ip_address: "1.1.1.1",
              created_at: "2026-08-02T00:00:00Z",
            },
          ],
          next_cursor: null,
        });
      }
      if (url.includes("/enforcements")) {
        return json(200, {
          enforcements: [
            {
              id: 3,
              kind: "ban",
              state: "reverted",
              profile_id: PROFILE_ID,
              reason: "policy",
              note: "internal note",
              report_id: 8,
              admin_user_id: 1,
              reverted_by_admin_user_id: 1,
              created_at: "2026-07-01T00:00:00Z",
              reverted_at: "2026-07-02T00:00:00Z",
            },
          ],
          next_cursor: null,
        });
      }
      if (url.includes("/discovery_diagnostic")) {
        return json(200, { eligible: true, ineligibility_reason: null, stages: [] });
      }
      if (url.includes("/api/v1/hq/members/")) return member360Ok();
      return json(404, { error: "not_found" });
    });

    renderAt(`/hq/members/${PROFILE_ID}?sections=activity,safety`);
    await screen.findByRole("heading", { name: "Lebo" });

    const authButtons = screen.getAllByRole("button", { name: /load auth history/i });
    await user.click(authButtons[0]!);
    expect(await screen.findByText("lebo@example.com")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /load full history/i }));
    expect(await screen.findByText("policy")).toBeInTheDocument();
  });

  it("renders discovery diagnostic stages without inventing gender/age/distance splits", async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = urlOf(input);
      if (url.includes("/api/v1/me")) return meOk();
      if (url.includes("/api/v1/hq/operator")) return operatorOk();
      if (url.includes("/discovery_diagnostic")) {
        return json(200, {
          eligible: true,
          ineligibility_reason: null,
          stages: [
            {
              stage: "visible_active_profiles",
              description: "Visible active profiles",
              candidate_count: 100,
            },
            {
              stage: "reciprocal_gender_age_distance",
              description: "After reciprocal gender, age, and distance filters",
              candidate_count: 40,
            },
            {
              stage: "final_eligible_candidates",
              description: "After exclusions",
              candidate_count: 3,
            },
          ],
        });
      }
      if (url.includes("/api/v1/hq/members/")) return member360Ok();
      return json(404, { error: "not_found" });
    });

    renderAt(`/hq/members/${PROFILE_ID}?sections=product`);
    expect(await screen.findByText(/reciprocal gender, age, and distance/i)).toBeInTheDocument();
    expect(screen.getByText("reciprocal_gender_age_distance")).toBeInTheDocument();
    expect(screen.queryByText(/^Gender filter$/i)).not.toBeInTheDocument();
    expect(screen.getByText("Ultimately remaining")).toBeInTheDocument();
  });

  it("preserves section URL state", async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = urlOf(input);
      if (url.includes("/api/v1/me")) return meOk();
      if (url.includes("/api/v1/hq/operator")) return operatorOk();
      if (url.includes("/discovery_diagnostic")) {
        return json(200, { eligible: false, ineligibility_reason: "suspended", stages: [] });
      }
      if (url.includes("/api/v1/hq/members/")) return member360Ok();
      return json(404, { error: "not_found" });
    });

    renderAt(`/hq/members/${PROFILE_ID}?sections=identity,product`);
    expect(await screen.findByText(/likes given/i)).toBeInTheDocument();
    const product = screen
      .getAllByRole("button")
      .find((button) => button.getAttribute("aria-controls") === "hq-product-panel");
    expect(product).toBeTruthy();
    expect(product).toHaveAttribute("aria-expanded", "true");
  });

  it("shows backend failure on Member 360 load", async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = urlOf(input);
      if (url.includes("/api/v1/me")) return meOk();
      if (url.includes("/api/v1/hq/operator")) return operatorOk();
      if (url.includes("/api/v1/hq/members/")) return json(500, { error: "server_error" });
      return json(404, { error: "not_found" });
    });
    renderAt(`/hq/members/${PROFILE_ID}`);
    expect(await screen.findByRole("heading", { name: /could not load member 360/i })).toBeInTheDocument();
  });

  it("renders Command Centre health snapshot from canonical API", async () => {
    vi.mocked(fetch).mockImplementation(withOperator(() => undefined));
    renderAt("/hq");
    expect(await screen.findByRole("heading", { name: "Command Centre" })).toBeInTheDocument();
    expect(screen.queryByText(/\b72\/100\b/)).not.toBeInTheDocument();
    expect(await screen.findByText(/total memberships/i)).toBeInTheDocument();
    expect(screen.getAllByText("500").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/2026\.08\.30/).length).toBeGreaterThan(0);
    expect(await screen.findByText(/brand comparison/i)).toBeInTheDocument();
  });

  it("renders real zero without treating unavailable metrics as zero", async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = urlOf(input);
      if (url.includes("/api/v1/me")) return meOk();
      if (url.includes("/api/v1/hq/operator")) return operatorOk();
      if (url.includes("/api/v1/version")) return versionOk();
      if (url.includes("/api/v1/hq/command_centre/health")) {
        return commandCentreHealthOk({
          marketplace: {
            ...commandCentreHealthFixture().brand_health.marketplace,
            zero_discovery_allocations: {
              yesterday: {
                metric_id: "marketplace.zero_discovery_allocations",
                version: 1,
                definition: "Zero discovery test.",
                status: "available",
                value: 0,
                unit: "count",
                limitations: [],
              },
              last_7d: commandCentreHealthFixture().brand_health.marketplace.zero_discovery_allocations.last_7d,
              last_30d: commandCentreHealthFixture().brand_health.marketplace.zero_discovery_allocations.last_30d,
            },
            time_to_first_like_median: {
              metric_id: "marketplace.time_to_first_like_median",
              version: 1,
              definition: "Deferred median.",
              status: "unavailable",
              unit: null,
              limitations: ["Deferred."],
            },
          },
          trust_safety: {
            ...commandCentreHealthFixture().brand_health.trust_safety,
            oldest_open_report_age_seconds: {
              metric_id: "trust.oldest_open_report_age_seconds",
              version: 1,
              definition: "Oldest open report age.",
              status: "insufficient_data",
              unit: null,
              limitations: ["No open reports on this brand."],
            },
          },
        });
      }
      if (url.includes("/api/v1/hq/command_centre/brands")) {
        return commandCentreBrandsOk([{ brand: "dateza" }]);
      }
      if (url.includes("/api/v1/hq/security_alerts")) return json(200, { alerts: [] });
      return json(404, { error: "not_found" });
    });

    renderAt("/hq");
    await screen.findByText(/total memberships/i);
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Not enough data").length).toBeGreaterThan(0);
  });

  it("shows metric definition on info interaction", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation(withOperator(() => undefined));
    renderAt("/hq");
    await screen.findByText(/total memberships/i);
    const infoButtons = screen.getAllByRole("button", { name: /definition for memberships\.total/i });
    await user.click(infoButtons[0]);
    expect(
      await screen.findByText(/Distinct users with a kept BrandMembership on the brand/i),
    ).toBeInTheDocument();
  });

  it("renders backend attention signals with drill-down links", async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = urlOf(input);
      if (url.includes("/api/v1/me")) return meOk();
      if (url.includes("/api/v1/hq/operator")) return operatorOk();
      if (url.includes("/api/v1/version")) return versionOk();
      if (url.includes("/api/v1/hq/command_centre/health")) {
        return commandCentreHealthOk({
          attention_signals: [
            {
              signal: "old_unresolved_report",
              severity: "warning",
              title: "Oldest open report is aging",
              reason: "Needs operator review.",
              value: 300000,
              unit: "seconds",
            },
          ],
        });
      }
      if (url.includes("/api/v1/hq/command_centre/brands")) {
        return commandCentreBrandsOk([{ brand: "dateza" }]);
      }
      if (url.includes("/api/v1/hq/security_alerts")) return json(200, { alerts: [] });
      return json(404, { error: "not_found" });
    });

    renderAt("/hq");
    expect(await screen.findByText(/Oldest open report is aging/i)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /open report queue/i });
    expect(link).toHaveAttribute("href", "/hq/trust-safety?tab=queue");
  });

  it("shows empty attention state when no signals returned", async () => {
    vi.mocked(fetch).mockImplementation(withOperator(() => undefined));
    renderAt("/hq");
    expect(await screen.findByText(/No operational attention signals/i)).toBeInTheDocument();
  });

  it("omits inaccessible brands from comparison table", async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = urlOf(input);
      if (url.includes("/api/v1/me")) return meOk();
      if (url.includes("/api/v1/hq/operator")) return operatorOk();
      if (url.includes("/api/v1/version")) return versionOk();
      if (url.includes("/api/v1/hq/command_centre/health")) return commandCentreHealthOk();
      if (url.includes("/api/v1/hq/command_centre/brands")) {
        return commandCentreBrandsOk([{ brand: "dateza" }]);
      }
      if (url.includes("/api/v1/hq/security_alerts")) return json(200, { alerts: [] });
      return json(404, { error: "not_found" });
    });
    renderAt("/hq");
    await screen.findByText(/total memberships/i);
    expect(screen.queryByText(/brand comparison/i)).not.toBeInTheDocument();
    expect(screen.queryByText("otherbrand")).not.toBeInTheDocument();
  });

  it("survives partial Command Centre API failure", async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = urlOf(input);
      if (url.includes("/api/v1/me")) return meOk();
      if (url.includes("/api/v1/hq/operator")) return operatorOk();
      if (url.includes("/api/v1/version")) return versionOk();
      if (url.includes("/api/v1/hq/command_centre/health")) return commandCentreHealthOk();
      if (url.includes("/api/v1/hq/command_centre/brands")) {
        return json(500, { error: "server_error" });
      }
      if (url.includes("/api/v1/hq/security_alerts")) return json(200, { alerts: [] });
      return json(404, { error: "not_found" });
    });
    renderAt("/hq");
    expect(await screen.findByText(/Some command centre data could not load/i)).toBeInTheDocument();
    expect(await screen.findByText(/total memberships/i)).toBeInTheDocument();
    expect(await screen.findByText(/Could not load brand comparison/i)).toBeInTheDocument();
  });

  it("gates Command Centre health without hq.analytics.read", async () => {
    vi.mocked(fetch).mockImplementation(
      withOperator(() => undefined, true, {
        effective_capabilities: [
          "hq.member.sensitive_read",
          "hq.trust_safety.read",
          "hq.security_alerts.read",
        ],
      }),
    );
    renderAt("/hq");
    expect(await screen.findByText(/Analytics not enabled for your role/i)).toBeInTheDocument();
    expect(screen.queryByText(/total memberships/i)).not.toBeInTheDocument();
  });

  it("renders founder light dashboard with canonical health data", async () => {
    window.localStorage.setItem("hq:experience-mode:v1", "founder");
    vi.mocked(fetch).mockImplementation(withOperator(() => undefined));
    renderAt("/hq");
    expect(await screen.findByRole("heading", { name: /Founder/i })).toBeInTheDocument();
    expect(await screen.findByText(/Total members/i)).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /Daily registrations/i })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /Active users/i })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /Engagement funnel/i })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /Marketplace trends/i })).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: /Brand context/i })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /Marketplace pools/i })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /Retention/i })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /Devices & platforms/i })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /Notification health/i })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /Recent errors/i })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /Recent reports/i })).toBeInTheDocument();
    expect(await screen.findByText(/Company pulse/i)).toBeInTheDocument();
    expect(await screen.findByText(/Needs your attention/i)).toBeInTheDocument();
  });

  it("switches between founder and ops modes", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem("hq:experience-mode:v1", "founder");
    vi.mocked(fetch).mockImplementation(withOperator(() => undefined));
    renderAt("/hq");
    await screen.findByText(/Company pulse/i);
    await user.click(screen.getByRole("button", { name: /^Ops$/i }));
    expect(await screen.findByText(/total memberships/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Ops$/i })).toHaveAttribute("aria-pressed", "true");
  });

  it("shows unavailable and insufficient founder metric states", async () => {
    window.localStorage.setItem("hq:experience-mode:v1", "founder");
    vi.mocked(fetch).mockImplementation((input) => {
      const url = urlOf(input);
      if (url.includes("/api/v1/me")) return meOk();
      if (url.includes("/api/v1/hq/operator")) return operatorOk();
      if (url.includes("/api/v1/version")) return versionOk();
      if (url.includes("/api/v1/hq/command_centre/health")) {
        return commandCentreHealthOk({
          trust_safety: {
            ...commandCentreHealthFixture().brand_health.trust_safety,
            oldest_open_report_age_seconds: {
              metric_id: "trust.oldest_open_report_age_seconds",
              version: 1,
              definition: "Oldest open report age.",
              status: "insufficient_data",
              unit: null,
              limitations: ["No open reports on this brand."],
            },
          },
          marketplace: {
            ...commandCentreHealthFixture().brand_health.marketplace,
            time_to_first_like_median: {
              metric_id: "marketplace.time_to_first_like_median",
              version: 1,
              definition: "Deferred.",
              status: "unavailable",
              unit: null,
              limitations: ["Deferred."],
            },
          },
        });
      }
      if (url.includes("/api/v1/hq/command_centre/brands")) {
        return commandCentreBrandsOk([{ brand: "dateza" }]);
      }
      if (url.includes("/api/v1/hq/security_alerts")) return json(200, { alerts: [] });
      return json(404, { error: "not_found" });
    });
    renderAt("/hq");
    await screen.findByText(/Company pulse/i);
    expect(screen.getAllByText(/Not enough data yet/i).length).toBeGreaterThan(0);
  });

  it("loads member directory with filters and pagination", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation((input) => {
      const url = urlOf(input);
      if (url.includes("/api/v1/me")) return meOk();
      if (url.includes("/api/v1/hq/operator")) return operatorOk();
      if (isMemberDirectoryList(url)) {
        if (url.includes("search=sam")) {
          return memberDirectoryOk([directoryMember({ display_name: "Sam Filtered" })]);
        }
        if (url.includes("cursor=page-2")) {
          return memberDirectoryOk([directoryMember({ display_name: "Sam Page Two", user_id: 43 })]);
        }
        return memberDirectoryOk([directoryMember()], "page-2");
      }
      return json(404, { error: "not_found" });
    });

    renderAt("/hq/members");
    expect(await screen.findByText("Sam Directory")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /load more/i }));
    expect(await screen.findByText("Sam Page Two")).toBeInTheDocument();

    await user.type(screen.getByLabelText(/search members/i), "sam");
    await user.click(screen.getByRole("button", { name: /^search$/i }));
    expect(await screen.findByText("Sam Filtered")).toBeInTheDocument();
  });

  it("hides alerts nav without hq.security_alerts.read", async () => {
    vi.mocked(fetch).mockImplementation(
      withOperator(() => undefined, true, {
        effective_capabilities: [
          "hq.member.sensitive_read",
          "hq.trust_safety.read",
          "admin.reports.read",
        ],
      }),
    );
    renderAt("/hq");
    await screen.findByRole("heading", { name: "Command Centre" });
    expect(screen.queryByRole("link", { name: /security alerts/i })).not.toBeInTheDocument();
  });

  it("applies founder shell on member directory route", async () => {
    window.localStorage.setItem("hq:experience-mode:v1", "founder");
    vi.mocked(fetch).mockImplementation((input) => {
      const url = urlOf(input);
      if (url.includes("/api/v1/me")) return meOk();
      if (url.includes("/api/v1/hq/operator")) return operatorOk();
      if (isMemberDirectoryList(url)) return memberDirectoryOk();
      return json(404, { error: "not_found" });
    });
    renderAt("/hq/members");
    expect(await screen.findByText("Sam Directory")).toBeInTheDocument();
    expect(document.querySelector(".hq-root")).toHaveAttribute("data-hq-experience", "founder");
  });

  it("preserves founder mode when loading a child route directly", async () => {
    window.localStorage.setItem("hq:experience-mode:v1", "founder");
    vi.mocked(fetch).mockImplementation((input) => {
      const url = urlOf(input);
      if (url.includes("/api/v1/me")) return meOk();
      if (url.includes("/api/v1/hq/operator")) return operatorOk();
      if (isMemberDirectoryList(url)) return memberDirectoryOk();
      return json(404, { error: "not_found" });
    });
    renderAt("/hq/members");
    await screen.findByText("Sam Directory");
    expect(window.localStorage.getItem("hq:experience-mode:v1")).toBe("founder");
    expect(document.querySelector(".hq-root")).toHaveAttribute("data-hq-experience", "founder");
  });

  it("applies ops shell on child routes when ops mode is selected", async () => {
    window.localStorage.setItem("hq:experience-mode:v1", "ops");
    vi.mocked(fetch).mockImplementation((input) => {
      const url = urlOf(input);
      if (url.includes("/api/v1/me")) return meOk();
      if (url.includes("/api/v1/hq/operator")) return operatorOk();
      if (isMemberDirectoryList(url)) return memberDirectoryOk();
      return json(404, { error: "not_found" });
    });
    renderAt("/hq/members");
    await screen.findByText("Sam Directory");
    expect(document.querySelector(".hq-root")).toHaveAttribute("data-hq-experience", "ops");
  });

  it("switches to ops mode from member directory header toggle", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem("hq:experience-mode:v1", "founder");
    vi.mocked(fetch).mockImplementation((input) => {
      const url = urlOf(input);
      if (url.includes("/api/v1/me")) return meOk();
      if (url.includes("/api/v1/hq/operator")) return operatorOk();
      if (isMemberDirectoryList(url)) return memberDirectoryOk();
      return json(404, { error: "not_found" });
    });
    renderAt("/hq/members");
    await screen.findByText("Sam Directory");
    const opsButtons = screen.getAllByRole("button", { name: /^Ops$/i });
    await user.click(opsButtons[0]!);
    expect(document.querySelector(".hq-root")).toHaveAttribute("data-hq-experience", "ops");
    expect(window.localStorage.getItem("hq:experience-mode:v1")).toBe("ops");
  });

  it("persists founder mode across HQ route navigation", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem("hq:experience-mode:v1", "founder");
    vi.mocked(fetch).mockImplementation((input) => {
      const url = urlOf(input);
      if (url.includes("/api/v1/me")) return meOk();
      if (url.includes("/api/v1/hq/operator")) return operatorOk();
      if (url.includes("/api/v1/version")) return versionOk();
      const commandCentre = commandCentreRouteOk(url);
      if (commandCentre) return commandCentre;
      if (isMemberDirectoryList(url)) return memberDirectoryOk();
      if (url.includes("/api/v1/hq/members/")) return member360Ok();
      if (url.includes("/api/v1/hq/trust_safety/overview")) {
        return json(200, {
          overview: {
            brand: "dateza",
            generated_at: "2026-08-29T15:00:00Z",
            reports: {
              total: 0,
              by_status: { open: 0, reviewing: 0, actioned: 0, dismissed: 0 },
              awaiting_decision: 0,
              oldest_open_report_at: null,
              oldest_open_report_age_seconds: null,
              by_reason: {},
              by_target_type: {},
              sla_status: "not_configured",
            },
            enforcements: { active: 0, reverted: 0 },
            photo_reviews: { pending: 0 },
            repeat_offenders: { count: 0 },
          },
        });
      }
      if (url.includes("/api/v1/hq/security_alerts")) {
        return json(200, {
          alerts: [
            {
              id: 1,
              event_type: "failed_login",
              severity: "warning",
              metadata: { user_id: 42 },
              ip_address: "203.0.113.10",
              created_at: "2026-01-01T12:00:00Z",
            },
          ],
        });
      }
      return json(404, { error: "not_found" });
    });

    renderAt("/hq");
    await screen.findByRole("heading", { name: /Founder/i });
    expect(document.querySelector(".hq-root")).toHaveAttribute("data-hq-experience", "founder");

    const peopleTrigger = screen.getByRole("button", { name: /^people$/i });
    if (peopleTrigger.getAttribute("aria-expanded") !== "true") {
      await user.click(peopleTrigger);
    }
    await user.click(screen.getByRole("link", { name: /^members$/i }));
    await screen.findByText("Member directory");
    expect(document.querySelector(".hq-root")).toHaveAttribute("data-hq-experience", "founder");

    await user.click(screen.getByRole("link", { name: /^sam directory$/i }));
    expect(await screen.findByRole("heading", { name: /^lebo$/i })).toBeInTheDocument();
    expect(document.querySelector(".hq-root")).toHaveAttribute("data-hq-experience", "founder");

    await user.click(screen.getByRole("button", { name: /trust & safety/i }));
    await user.click(screen.getByRole("link", { name: /^overview$/i }));
    await screen.findByRole("tab", { name: /^overview$/i });
    expect(document.querySelector(".hq-root")).toHaveAttribute("data-hq-experience", "founder");

    const commandTrigger = screen.getByRole("button", { name: /^command centre$/i });
    if (commandTrigger.getAttribute("aria-expanded") !== "true") {
      await user.click(commandTrigger);
    }
    await user.click(screen.getByRole("link", { name: /security alerts/i }));
    expect(await screen.findByText(/failed login/i)).toBeInTheDocument();
    expect(document.querySelector(".hq-root")).toHaveAttribute("data-hq-experience", "founder");
    expect(window.localStorage.getItem("hq:experience-mode:v1")).toBe("founder");

    await user.click(screen.getByRole("link", { name: /^command centre$/i }));
    await screen.findByRole("heading", { name: /Founder/i });
    expect(document.querySelector(".hq-root")).toHaveAttribute("data-hq-experience", "founder");
  });

  it("expands the trust & safety accordion when a child route is active", async () => {
    vi.mocked(fetch).mockImplementation(withOperator(() => undefined));
    renderAt("/hq/trust-safety?tab=queue");
    const trigger = await screen.findByRole("button", { name: /trust & safety/i });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: /^reports$/i })).toHaveAttribute("aria-current", "page");
  });

  it("toggles accordion groups from the keyboard", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation(withOperator(() => undefined));
    renderAt("/hq");
    const peopleTrigger = await screen.findByRole("button", { name: /^people$/i });
    expect(peopleTrigger).toHaveAttribute("aria-expanded", "false");
    peopleTrigger.focus();
    await user.keyboard("{Enter}");
    expect(peopleTrigger).toHaveAttribute("aria-expanded", "true");
    await user.keyboard(" ");
    expect(peopleTrigger).toHaveAttribute("aria-expanded", "false");
  });

  it("shows coming-soon people items in both founder and ops modes", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation(withOperator(() => undefined));

    for (const mode of ["ops", "founder"] as const) {
      cleanup();
      clearNavExpansionState();
      window.localStorage.setItem("hq:experience-mode:v1", mode);
      renderAt("/hq");
      const peopleTrigger = await screen.findByRole("button", { name: /^people$/i });
      if (peopleTrigger.getAttribute("aria-expanded") !== "true") {
        await user.click(peopleTrigger);
      }
      expect(await screen.findByRole("link", { name: /customers & support/i })).toBeInTheDocument();
    }
  });

  it("renders full roadmap engineering group with soon treatment", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation(withOperator(() => undefined));
    renderAt("/hq");
    const engineeringTrigger = await screen.findByRole("button", { name: /^engineering$/i });
    await user.click(engineeringTrigger);
    expect(await screen.findByRole("link", { name: /deployments/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /deployments/i })).toHaveTextContent(/soon/i);
  });

  it("expands the command centre accordion when on /hq", async () => {
    vi.mocked(fetch).mockImplementation(withOperator(() => undefined));
    renderAt("/hq");
    await screen.findByRole("heading", { name: "Command Centre" });
    const nav = await screen.findByRole("navigation", { name: "HQ sections" });
    const trigger = within(nav).getByRole("button", { name: /^command centre$/i });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(within(nav).getByRole("link", { name: /^command centre$/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});

describe("HQ API adapter", () => {
  it("rejects empty lookup", async () => {
    await expect(lookupHqMember("   ")).rejects.toMatchObject({ status: 400 });
  });
});
