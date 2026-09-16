export type HqExperienceMode = "founder" | "ops";

const STORAGE_KEY = "hq:experience-mode:v1";

function readSystemPrefersLight(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) {
    return true;
  }
  return window.matchMedia("(prefers-color-scheme: light)").matches;
}

export function readHqExperienceMode(): HqExperienceMode {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "founder" || stored === "ops") {
      return stored;
    }
  } catch {
    // Private browsing or disabled storage — fall through to system default.
  }
  return readSystemPrefersLight() ? "founder" : "ops";
}

export function writeHqExperienceMode(mode: HqExperienceMode): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Ignore quota / private browsing failures.
  }
}
