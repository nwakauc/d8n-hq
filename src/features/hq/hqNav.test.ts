import { describe, expect, it } from "vitest";
import {
  findHqNavGroupIdForPath,
  findHqNavItem,
  navItemSearchTab,
} from "./navConfig.ts";

describe("hq nav config", () => {
  it("marks command centre only on /hq index", () => {
    expect(findHqNavItem("/hq", "")?.id).toBe("command-centre");
    expect(findHqNavItem("/hq/members", "")?.id).toBe("members");
    expect(findHqNavItem("/hq/members", "")?.id).not.toBe("command-centre");
  });

  it("resolves trust & safety tabs from search params", () => {
    expect(findHqNavItem("/hq/trust-safety", "")?.id).toBe("trust-overview");
    expect(findHqNavItem("/hq/trust-safety", "?tab=queue")?.id).toBe("trust-reports");
    expect(findHqNavItem("/hq/trust-safety", "?tab=enforcements")?.id).toBe(
      "trust-enforcements",
    );
    expect(navItemSearchTab("/hq/trust-safety?tab=queue")).toBe("queue");
  });

  it("highlights reports when viewing a report detail route", () => {
    expect(findHqNavItem("/hq/trust-safety/reports/42", "")?.id).toBe("trust-reports");
    expect(findHqNavGroupIdForPath("/hq/trust-safety/reports/42", "")).toBe("trust");
  });

  it("resolves member directory and member 360 under members", () => {
    expect(findHqNavItem("/hq/members", "")?.id).toBe("members");
    expect(findHqNavItem("/hq/members/abc-123", "")?.id).toBe("members");
  });
});
