import { describe, expect, it } from "vitest";
import { DATE9JA_PLAY_CONSOLE_URL, playConsoleUrlForBrand } from "./playConsole.ts";

describe("playConsoleUrlForBrand", () => {
  it("links Date9ja to the founder Play Console app dashboard", () => {
    expect(playConsoleUrlForBrand("date9ja")).toBe(DATE9JA_PLAY_CONSOLE_URL);
  });

  it("does not attach Date9ja Play installs to other brands", () => {
    expect(playConsoleUrlForBrand("dateza")).toBeNull();
    expect(playConsoleUrlForBrand("hookus")).toBeNull();
    expect(playConsoleUrlForBrand(null)).toBeNull();
  });
});
