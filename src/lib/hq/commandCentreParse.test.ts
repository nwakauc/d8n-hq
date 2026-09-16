import { describe, expect, it } from "vitest";
import { parseCommandCentreHealth } from "./parse.ts";
import { commandCentreHealthFixture } from "../../features/hq/testFixtures.ts";

describe("Command Centre parse", () => {
  it("parses available, unavailable, and insufficient_data metrics", () => {
    const payload = commandCentreHealthFixture({
      trust_safety: {
        open_reports: {
          metric_id: "trust.open_reports",
          version: 1,
          definition: "Open reports.",
          status: "available",
          value: 0,
          unit: "count",
          limitations: [],
        },
        awaiting_decision: {
          metric_id: "trust.awaiting_decision",
          version: 1,
          definition: "Awaiting.",
          status: "unavailable",
          unit: null,
          limitations: ["Not computed."],
        },
        active_enforcements: {
          metric_id: "trust.active_enforcements",
          version: 1,
          definition: "Enforcements.",
          status: "insufficient_data",
          unit: null,
          limitations: ["No data."],
        },
        pending_photo_reviews: commandCentreHealthFixture().brand_health.trust_safety.pending_photo_reviews,
        oldest_open_report_age_seconds:
          commandCentreHealthFixture().brand_health.trust_safety.oldest_open_report_age_seconds,
      },
    });

    const health = parseCommandCentreHealth(payload);
    expect(health.trust_safety.open_reports.status).toBe("available");
    expect(health.trust_safety.open_reports.value).toBe(0);
    expect(health.trust_safety.awaiting_decision.status).toBe("unavailable");
    expect(health.trust_safety.awaiting_decision.value).toBeUndefined();
    expect(health.trust_safety.active_enforcements.status).toBe("insufficient_data");
  });
});
