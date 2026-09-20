import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../App.tsx";
import { setBrandToken, setActiveBrand } from "../../lib/api/tokenStore.ts";
import { clearHqOperatorAccessCache } from "../../lib/hq/adminAccess.ts";
import { AuthProvider } from "../auth/AuthProvider.tsx";
import { json, meOk, operatorOk, urlOf } from "./testFixtures.ts";

function liveEventsOk(overrides: Record<string, unknown> = {}) {
  return json(200, {
    generated_at: "2026-09-20T14:30:00.000000Z",
    events: [
      {
        id: "security:1",
        event_type: "auth.password_registration.errored",
        category: "member",
        severity: "critical",
        occurred_at: "2026-09-20T14:29:00.000000Z",
        brand: "dateza",
        title: "Auth password registration errored",
        description: "RuntimeError: boom",
        subject: null,
        metadata: { error_class: "RuntimeError", error_message: "boom" },
      },
      {
        id: "match:9",
        event_type: "match.created",
        category: "marketplace",
        severity: "info",
        occurred_at: "2026-09-20T14:28:00.000000Z",
        brand: "dateza",
        title: "New match",
        description: "Two members matched.",
        subject: { type: "match", id: "m-public-9" },
        metadata: { match_id: "m-public-9" },
      },
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

describe("D8N HQ Live / Events", () => {
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

  it("shows the event stream with a registration crash's exception detail, and opens its detail on click", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation((input) => {
      const url = urlOf(input);
      if (url.includes("/api/v1/me")) return meOk();
      if (url.includes("/api/v1/hq/operator")) return operatorOk();
      if (url.includes("/api/v1/hq/live_events")) return liveEventsOk();
      return json(404, { error: "not_found" });
    });

    renderAt("/hq/live");

    expect(await screen.findByText("New match")).toBeInTheDocument();
    expect(screen.getByText("RuntimeError: boom")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /new match/i }));
    expect(await screen.findByText("match.created")).toBeInTheDocument();
    expect(screen.getByText(/match #m-public-9/i)).toBeInTheDocument();
    expect(screen.queryByText("Open Member 360 →")).not.toBeInTheDocument();
  });

  it("filters the stream by category tab", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation((input) => {
      const url = urlOf(input);
      if (url.includes("/api/v1/me")) return meOk();
      if (url.includes("/api/v1/hq/operator")) return operatorOk();
      if (url.includes("/api/v1/hq/live_events")) return liveEventsOk();
      return json(404, { error: "not_found" });
    });

    renderAt("/hq/live");
    expect(await screen.findByText("New match")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Member/i }));
    expect(screen.queryByText("New match")).not.toBeInTheDocument();
    expect(screen.getByText("RuntimeError: boom")).toBeInTheDocument();
  });

  it("hides the feed and explains the missing capability when the operator lacks it", async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = urlOf(input);
      if (url.includes("/api/v1/me")) return meOk();
      if (url.includes("/api/v1/hq/operator")) {
        return operatorOk(true, { effective_capabilities: [] });
      }
      return json(404, { error: "not_found" });
    });

    renderAt("/hq/live");
    expect(await screen.findByText("Live / Events not enabled")).toBeInTheDocument();
  });
});
