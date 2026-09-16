import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../auth/AuthProvider.tsx";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../App.tsx";
import { setBrandToken, setActiveBrand } from "../../lib/api/tokenStore.ts";
import { clearHqOperatorAccessCache } from "../../lib/hq/adminAccess.ts";
import { json, meOk, operatorOk, commandCentreHealthOk, urlOf } from "./testFixtures.ts";

function isReportDetail(url: string): boolean {
  return /\/api\/v1\/admin\/reports\/\d+/.test(url);
}

function isReportList(url: string): boolean {
  return url.includes("/api/v1/admin/reports") && !isReportDetail(url);
}

const PROFILE_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const PROFILE_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

function overviewOk(overrides: Record<string, unknown> = {}) {
  return json(200, {
    overview: {
      brand: "dateza",
      generated_at: "2026-08-29T15:00:00Z",
      reports: {
        total: 12,
        by_status: { open: 3, reviewing: 1, actioned: 5, dismissed: 3 },
        awaiting_decision: 4,
        oldest_open_report_at: "2026-08-28T12:00:00Z",
        oldest_open_report_age_seconds: 97200,
        by_reason: {
          inappropriate_content: 2,
          harassment: 3,
          spam: 1,
          fake_profile: 1,
          underage: 0,
          other: 2,
          violence_or_threat: 1,
          non_consensual_content: 1,
          impersonation: 1,
        },
        by_target_type: {
          profile: 6,
          message: 3,
          profile_media: 1,
          hook: 1,
          conversation: 1,
        },
        sla_status: "not_configured",
        overdue: null,
        ...((overrides.reports as Record<string, unknown> | undefined) ?? {}),
      },
      enforcements: { total: 4, active: 1 },
      ...overrides,
    },
  });
}

function reportFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    status: "open" as const,
    reason: "harassment" as const,
    target_type: "message" as const,
    evidence: { message_text: "leave me alone", conversation_id: "c-1" },
    reporter: { id: PROFILE_B, display_name: "Reporter" },
    reported: { id: PROFILE_A, display_name: "Reported" },
    note: "Please review" as string | null,
    resolution_note: null as string | null,
    reviewed_by_admin_user_id: null as number | null,
    reviewed_at: null as string | null,
    created_at: "2026-08-28T12:00:00Z",
    updated_at: "2026-08-28T12:00:00Z",
    ...overrides,
  };
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

describe("D8N HQ Phase 2 Trust & Safety", () => {
  beforeEach(() => {
    setBrandToken("dateza", { token: "opaque-token", expiresAt: "2099-01-01T00:00:00Z" }); setActiveBrand("dateza");
    clearHqOperatorAccessCache();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    setBrandToken("dateza", undefined);
    clearHqOperatorAccessCache();
  });

  it("shows overview with SLA not configured and never invents 0 overdue", async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = urlOf(input);
      if (url.includes("/api/v1/me")) return meOk();
      if (url.includes("/api/v1/hq/operator")) return operatorOk();
      if (url.includes("/api/v1/hq/trust_safety/overview")) return overviewOk();
      return json(404, { error: "not_found" });
    });

    renderAt("/hq/trust-safety");
    expect(await screen.findByText("SLA NOT CONFIGURED")).toBeInTheDocument();
    expect(screen.getByText(/no trust & safety sla/i)).toBeInTheDocument();
    expect(screen.queryByText(/0 overdue/i)).not.toBeInTheDocument();
    expect(screen.getByText("Awaiting decision")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getAllByText("4").length).toBeGreaterThan(0);
  });

  it("paginates the report queue and filters by status", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation((input) => {
      const url = urlOf(input);
      if (url.includes("/api/v1/me")) return meOk();
      if (url.includes("/api/v1/hq/operator")) return operatorOk();
      if (url.includes("/api/v1/hq/trust_safety/overview")) return overviewOk();
      if (isReportList(url)) {
        if (url.includes("status=open")) {
          if (url.includes("cursor=")) {
            return json(200, {
              reports: [reportFixture({ id: 2, status: "open", reason: "spam" })],
              next_cursor: null,
            });
          }
          return json(200, {
            reports: [reportFixture({ id: 1, status: "open" })],
            next_cursor: "cursor-q",
          });
        }
        return json(200, {
          reports: [reportFixture({ id: 9, status: "dismissed" })],
          next_cursor: null,
        });
      }
      return json(404, { error: "not_found" });
    });

    renderAt("/hq/trust-safety?tab=queue");
    expect(await screen.findByRole("link", { name: "#9" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Open$/i }));
    expect(await screen.findByRole("link", { name: "#1" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /load more/i }));
    expect(await screen.findByRole("link", { name: "#2" })).toBeInTheDocument();
  });

  it("loads report detail with structured evidence and member links", async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = urlOf(input);
      if (url.includes("/api/v1/me")) return meOk();
      if (url.includes("/api/v1/hq/operator")) return operatorOk();
      if (isReportDetail(url)) return json(200, { report: reportFixture() });
      return json(404, { error: "not_found" });
    });

    renderAt("/hq/trust-safety/reports/42");
    expect(await screen.findByRole("heading", { name: /report #42/i })).toBeInTheDocument();
    expect(screen.getByText("message text")).toBeInTheDocument();
    expect(screen.getByText("leave me alone")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reported" })).toHaveAttribute(
      "href",
      `/hq/members/${PROFILE_A}`,
    );
    expect(screen.getByRole("link", { name: "Reporter" })).toHaveAttribute(
      "href",
      `/hq/members/${PROFILE_B}`,
    );
  });

  it("lists repeat offenders with truncated banner and unavailable Member 360", async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = urlOf(input);
      if (url.includes("/api/v1/me")) return meOk();
      if (url.includes("/api/v1/hq/operator")) return operatorOk();
      if (url.includes("/api/v1/hq/trust_safety/overview")) return overviewOk();
      if (url.includes("/api/v1/hq/trust_safety/repeat_offenders")) {
        return json(200, {
          repeat_offenders: [
            {
              profile_id: PROFILE_A,
              display_name: "Repeat One",
              member_360_lookup: PROFILE_A,
              report_count: 5,
              awaiting_decision_count: 2,
              latest_report_at: "2026-08-28T12:00:00Z",
            },
            {
              profile_id: PROFILE_B,
              display_name: "Deleted Profile",
              member_360_lookup: null,
              report_count: 2,
              awaiting_decision_count: 0,
              latest_report_at: "2026-08-20T12:00:00Z",
            },
          ],
          minimum_reports: 2,
          truncated: true,
        });
      }
      return json(404, { error: "not_found" });
    });

    renderAt("/hq/trust-safety?tab=offenders");
    expect(await screen.findByText(/triage signal only/i)).toBeInTheDocument();
    expect(screen.getByText(/results are truncated/i)).toBeInTheDocument();
    expect(screen.getByText("Repeat One")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open/i })).toHaveAttribute(
      "href",
      `/hq/members/${PROFILE_A}`,
    );
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
  });

  it("paginates enforcements and surfaces invalid cursor without silent reset", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation((input) => {
      const url = urlOf(input);
      if (url.includes("/api/v1/me")) return meOk();
      if (url.includes("/api/v1/hq/operator")) return operatorOk();
      if (url.includes("/api/v1/hq/trust_safety/overview")) return overviewOk();
      if (url.includes("/api/v1/hq/trust_safety/enforcements")) {
        if (url.includes("cursor=")) {
          return json(422, { error: "invalid_cursor" });
        }
        return json(200, {
          enforcements: [
            {
              id: 7,
              kind: "suspension",
              state: "active",
              profile_id: PROFILE_A,
              reason: "policy",
              note: null,
              report_id: 42,
              admin_user_id: 1,
              reverted_by_admin_user_id: null,
              created_at: "2026-08-01T00:00:00Z",
              reverted_at: null,
            },
          ],
          next_cursor: "bad-cursor",
        });
      }
      return json(404, { error: "not_found" });
    });

    renderAt("/hq/trust-safety?tab=enforcements");
    expect(await screen.findByText("policy")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /load more/i }));
    expect(await screen.findByText(/page cursor is no longer valid/i)).toBeInTheDocument();
    expect(screen.getByText("policy")).toBeInTheDocument();
  });

  it("applies a moderation status transition after confirmation", async () => {
    const user = userEvent.setup();
    let current: Record<string, unknown> = reportFixture();
    vi.mocked(fetch).mockImplementation((input, init) => {
      const url = urlOf(input);
      const method = (init?.method ?? "GET").toUpperCase();
      if (url.includes("/api/v1/me")) return meOk();
      if (url.includes("/api/v1/hq/operator")) return operatorOk();
      if (isReportDetail(url) && method === "PATCH") {
        current = { ...current, status: "reviewing", resolution_note: "looking" };
        return json(200, { report: current });
      }
      if (isReportDetail(url)) return json(200, { report: current });
      return json(404, { error: "not_found" });
    });

    renderAt("/hq/trust-safety/reports/42");
    await screen.findByRole("heading", { name: /report #42/i });
    await user.click(screen.getByRole("button", { name: /mark reviewing/i }));
    await user.type(screen.getByLabelText(/optional note/i), "looking");
    await user.click(screen.getByRole("button", { name: /^Confirm$/i }));
    expect(await screen.findAllByText("reviewing")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /mark reviewing/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mark actioned/i })).toBeInTheDocument();
  });

  it("surfaces moderation failure without optimistic success", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation((input, init) => {
      const url = urlOf(input);
      const method = (init?.method ?? "GET").toUpperCase();
      if (url.includes("/api/v1/me")) return meOk();
      if (url.includes("/api/v1/hq/operator")) return operatorOk();
      if (isReportDetail(url) && method === "PATCH") {
        return json(422, { error: "invalid_transition" });
      }
      if (isReportDetail(url)) return json(200, { report: reportFixture() });
      return json(404, { error: "not_found" });
    });

    renderAt("/hq/trust-safety/reports/42");
    await screen.findByRole("heading", { name: /report #42/i });
    await user.click(screen.getByRole("button", { name: /mark reviewing/i }));
    await user.click(screen.getByRole("button", { name: /^Confirm$/i }));
    expect(await screen.findByText(/not allowed from the report's current state/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mark reviewing/i })).toBeInTheDocument();
  });

  it("shows forbidden when Trust & Safety overview is denied", async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = urlOf(input);
      if (url.includes("/api/v1/me")) return meOk();
      if (url.includes("/api/v1/hq/operator")) return operatorOk();
      if (url.includes("/api/v1/hq/trust_safety/overview")) {
        return json(403, { error: "forbidden" });
      }
      return json(404, { error: "not_found" });
    });

    renderAt("/hq/trust-safety");
    expect(await screen.findByRole("heading", { name: /^Forbidden$/i })).toBeInTheDocument();
    expect(screen.getByText(/not authorized for this action/i)).toBeInTheDocument();
  });

  it("shows report unavailable for unknown or cross-brand report ids", async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = urlOf(input);
      if (url.includes("/api/v1/me")) return meOk();
      if (url.includes("/api/v1/hq/operator")) return operatorOk();
      if (isReportDetail(url)) return json(404, { error: "report_unavailable" });
      return json(404, { error: "not_found" });
    });

    renderAt("/hq/trust-safety/reports/999");
    expect(await screen.findByText(/report unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/unavailable for this brand/i)).toBeInTheDocument();
  });

  it("links Command Centre attention rail to Trust & Safety without fake overdue counts", async () => {
    window.localStorage.setItem("hq:experience-mode:v1", "ops");
    vi.mocked(fetch).mockImplementation((input) => {
      const url = urlOf(input);
      if (url.includes("/api/v1/me")) return meOk();
      if (url.includes("/api/v1/hq/operator")) return operatorOk();
      if (url.includes("/api/v1/hq/command_centre/health")) {
        return commandCentreHealthOk({
          attention_signals: [
            {
              signal: "old_unresolved_report",
              severity: "warning",
              title: "Oldest open report is aging",
              reason: "4 report(s) awaiting decision need operator review.",
              value: 97200,
              unit: "seconds",
            },
          ],
        });
      }
      if (url.includes("/api/v1/hq/command_centre/brands")) {
        return json(200, {
          generated_at: "2026-08-30T12:00:00Z",
          time_zone: "Africa/Johannesburg",
          brands: [],
        });
      }
      if (url.includes("/api/v1/version")) {
        return json(200, {
          app: "d8n",
          git_sha: "abc",
          release: "test",
          image_version: null,
          environment: "test",
          rails_environment: "test",
          build_timestamp: null,
          booted_at: "2026-08-30T01:00:00Z",
        });
      }
      if (url.includes("/api/v1/hq/security_alerts")) {
        return json(200, { alerts: [] });
      }
      return json(404, { error: "not_found" });
    });

    renderAt("/hq");
    expect(await screen.findByRole("heading", { name: "Command Centre" })).toBeInTheDocument();
    const attention = screen.getByLabelText(/what needs my attention/i);
    const link = within(attention).getByRole("link", { name: /open report queue/i });
    expect(link).toHaveAttribute("href", "/hq/trust-safety?tab=queue");
    expect(within(attention).getByText(/Oldest open report is aging/i)).toBeInTheDocument();
    expect(screen.queryByText(/0 overdue/i)).not.toBeInTheDocument();
  });
});
