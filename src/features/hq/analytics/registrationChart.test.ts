import { describe, expect, it } from "vitest";
import { splitRegistrationAxes } from "./registrationChart.ts";

describe("splitRegistrationAxes", () => {
  it("puts an 8× dominant brand on the right axis", () => {
    const rows = [
      { date9ja: 40, dateza: 2, hookus: 3 },
      { date9ja: 9000, dateza: 1, hookus: 4 },
    ];
    expect(splitRegistrationAxes(["date9ja", "dateza", "hookus"], rows)).toEqual({
      date9ja: "right",
      dateza: "left",
      hookus: "left",
    });
  });

  it("keeps comparable brands on one axis", () => {
    const rows = [
      { likes: 80, matches: 20, conversations: 12 },
      { likes: 120, matches: 30, conversations: 18 },
    ];
    expect(splitRegistrationAxes(["likes", "matches", "conversations"], rows)).toEqual({
      likes: "left",
      matches: "left",
      conversations: "left",
    });
  });
});
