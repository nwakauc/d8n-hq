import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../auth/AuthProvider.tsx";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../App.tsx";
import { setBrandToken, setActiveBrand } from "../../lib/api/tokenStore.ts";
import { clearHqOperatorAccessCache } from "../../lib/hq/adminAccess.ts";
import { commandCentreRouteOk, json, meOk, operatorOk, urlOf } from "./testFixtures.ts";

function withOperator(handler: (url: string) => ReturnType<typeof json> | undefined) {
  return (input: RequestInfo | URL) => {
    const url = urlOf(input);
    if (url.includes("/api/v1/me")) return meOk();
    if (url.includes("/api/v1/hq/operator")) return operatorOk();
    if (url.includes("/api/v1/version")) {
      return json(200, {
        app: "d8n",
        git_sha: "abc123def456",
        release: "2026.09.21",
        image_version: null,
        environment: "staging",
        rails_environment: "production",
        build_timestamp: "2026-09-21T00:00:00Z",
        booted_at: "2026-09-21T01:00:00Z",
      });
    }
    const commandCentre = commandCentreRouteOk(url);
    if (commandCentre) return commandCentre;
    if (url.includes("/api/v1/hq/security_alerts")) return json(200, { alerts: [] });
    return handler(url) ?? json(404, { error: "not_found" });
  };
}

function discoveryHealthOk(overrides: Record<string, unknown> = {}) {
  return json(200, {
    brand: "dateza",
    member_count: 120,
    introduction_configured: true,
    explore_configured: true,
    introduction_delivery_buckets: { "0": 5, "1-3": 20, "4-9": 40, "10+": 55 },
    explore_availability_buckets: { "0": 3, "1-3": 10, "4-9": 30, "10+": 77 },
    exhausted_member_count: 3,
    near_exhausted_member_count: 13,
    median_reciprocal_pool: 42,
    median_available_pool: 12,
    by_market: {
      "woman→man": {
        member_count: 60,
        median_reciprocal_pool: 45,
        median_available_pool: 14,
        exhausted_member_count: 1,
      },
      "man→woman": {
        member_count: 60,
        median_reciprocal_pool: 39,
        median_available_pool: 10,
        exhausted_member_count: 2,
      },
    },
    likely_empty_discovery: [
      { profile_id: "profile-zero-1", market: "woman→man", reciprocal_pool: 2 },
    ],
    ...overrides,
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

describe("D8N HQ Platform Discovery Health", () => {
  beforeEach(() => {
    setBrandToken("dateza", { token: "opaque-token", expiresAt: "2099-01-01T00:00:00Z" });
    setActiveBrand("dateza");
    clearHqOperatorAccessCache();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    setBrandToken("dateza", undefined);
    clearHqOperatorAccessCache();
  });

  it("renders platform discovery health with real buckets, medians, by-market breakdown, and a link to Member 360", async () => {
    vi.mocked(fetch).mockImplementation(
      withOperator((url) => {
        if (url.includes("/api/v1/hq/discovery_health")) return discoveryHealthOk();
        return undefined;
      }),
    );

    renderAt("/hq/discovery-health");

    expect(await screen.findByRole("heading", { name: "Platform Discovery Health" })).toBeInTheDocument();
    await screen.findByText("Active + visible members");
    expect(screen.getByText("120")).toBeInTheDocument(); // member_count
    expect(screen.getByText("3")).toBeInTheDocument(); // exhausted_member_count
    expect(screen.getAllByText("woman→man").length).toBeGreaterThan(0);
    expect(screen.getByText("man→woman")).toBeInTheDocument();

    const memberLink = screen.getByRole("link", { name: "profile-zero-1" });
    expect(memberLink).toHaveAttribute("href", "/hq/members/profile-zero-1");
  });

  it("shows not-configured state instead of inventing a bucket chart when a surface is unconfigured", async () => {
    vi.mocked(fetch).mockImplementation(
      withOperator((url) => {
        if (url.includes("/api/v1/hq/discovery_health")) {
          return discoveryHealthOk({ introduction_configured: false });
        }
        return undefined;
      }),
    );

    renderAt("/hq/discovery-health");
    expect(await screen.findByText("Introduction delivery is not configured")).toBeInTheDocument();
  });

  it("surfaces forbidden without leaking data when the operator lacks the capability", async () => {
    vi.mocked(fetch).mockImplementation(
      withOperator((url) => {
        if (url.includes("/api/v1/hq/discovery_health")) return json(403, { error: "forbidden" });
        return undefined;
      }),
    );

    renderAt("/hq/discovery-health");
    expect(await screen.findByText(/not authorized for this action/i)).toBeInTheDocument();
  });
});
