import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { HqCommandCentreHealth, HqMetricValue } from "../../../lib/hq/types.ts";
import { commandCentreHealthFixture } from "../testFixtures.ts";
import { FounderCompanyPulse } from "./FounderCompanyPulse.tsx";

function unavailable(metric: HqMetricValue): HqMetricValue {
  return {
    ...metric,
    status: "unavailable",
    value: undefined,
    limitations: ["Not instrumented in this fixture."],
  };
}

describe("FounderCompanyPulse", () => {
  it("does not draw unavailable pulse metrics as zero", () => {
    const health = commandCentreHealthFixture().brand_health as HqCommandCentreHealth;
    health.marketplace.matches_created.today = unavailable(health.marketplace.matches_created.today);

    render(<FounderCompanyPulse health={health} />);

    expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0);
    const caption = document.querySelector(".founder-chart--pulse-bars figcaption");
    expect(caption?.textContent).toMatch(/Matches unavailable/i);
    expect(caption?.textContent).not.toMatch(/Matches 0/);
  });
});
