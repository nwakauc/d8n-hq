import { afterEach, describe, expect, it } from "vitest";
import {
  readHqExperienceMode,
  writeHqExperienceMode,
  type HqExperienceMode,
} from "./hqModePreference.ts";

describe("HQ experience mode preference", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("defaults to founder when system prefers light", () => {
    expect(readHqExperienceMode()).toBe("founder");
  });

  it("persists explicit user selection", () => {
    writeHqExperienceMode("ops");
    expect(readHqExperienceMode()).toBe("ops");
    writeHqExperienceMode("founder");
    expect(readHqExperienceMode()).toBe("founder");
  });

  it("ignores invalid stored values", () => {
    window.localStorage.setItem("hq:experience-mode:v1", "invalid" as HqExperienceMode);
    expect(readHqExperienceMode()).toBe("founder");
  });
});
