import { describe, expect, it } from "vitest";
import { operationalWindow, UNSUPPORTED_OPERATIONAL_WINDOW } from "./commandCentreWindows.ts";

describe("operationalWindow", () => {
  it("maps supported toolbar ranges onto rolling device windows", () => {
    expect(operationalWindow("today")).toBe("24h");
    expect(operationalWindow("last_7d")).toBe("7d");
    expect(operationalWindow("last_30d")).toBe("30d");
  });

  it("does not substitute 24h for yesterday or 90 days", () => {
    expect(operationalWindow("yesterday")).toBeNull();
    expect(operationalWindow("last_90d")).toBeNull();
    expect(operationalWindow("unknown")).toBeNull();
    expect(UNSUPPORTED_OPERATIONAL_WINDOW).toMatch(/will not substitute/i);
  });
});
