import { describe, expect, it } from "vitest";
import {
  providerHref,
  providersFromEvidence,
  serviceProviderHref,
  thirdPartyProviderName,
} from "./systemHealthProviders.ts";
import type { HqSystemHealthService } from "../../../lib/hq/types.ts";

const service = (evidence: Record<string, unknown>): HqSystemHealthService => ({
  status: "unknown",
  checked_at: "2026-09-24T12:00:00Z",
  latency_ms: null,
  message: "probe",
  evidence,
});

describe("system health provider links", () => {
  it("maps known production providers to their consoles", () => {
    expect(providerHref("resend")).toBe("https://resend.com/emails");
    expect(providerHref("Twilio")).toBe("https://console.twilio.com/");
    expect(providerHref("expo")).toBe("https://expo.dev/");
    expect(providerHref("mystery")).toBeNull();
  });

  it("opens Cloudflare for media storage", () => {
    expect(serviceProviderHref("media_storage", service({}))).toBe("https://dash.cloudflare.com/");
  });

  it("does not invent a host for the self-hosted API", () => {
    expect(serviceProviderHref("api", service({ request: "current_hq_request" }))).toBeNull();
  });

  it("reads third-party provider names from evidence", () => {
    const row = service({ provider: "resend" });
    expect(thirdPartyProviderName(row, 0)).toBe("resend");
    expect(providersFromEvidence({ push: { provider: ["expo"] }, email: { provider: ["resend"] } })).toEqual([
      "expo",
      "resend",
    ]);
  });
});
