import { createContext } from "react";
import type { HqExperienceMode } from "./hqModePreference.ts";

export type HqModeContextValue = {
  mode: HqExperienceMode;
  setMode: (mode: HqExperienceMode) => void;
  toggleMode: () => void;
};

export const HqModeContext = createContext<HqModeContextValue | null>(null);
