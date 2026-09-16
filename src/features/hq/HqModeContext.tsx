import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  readHqExperienceMode,
  writeHqExperienceMode,
  type HqExperienceMode,
} from "./hqModePreference.ts";
import { HqModeContext } from "./hqModeContextValue.ts";

export function HqModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<HqExperienceMode>(() => readHqExperienceMode());

  const setMode = useCallback((next: HqExperienceMode) => {
    setModeState(next);
    writeHqExperienceMode(next);
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === "founder" ? "ops" : "founder");
  }, [mode, setMode]);

  useEffect(() => {
    document.documentElement.dataset.hqExperience = mode;
    return () => {
      delete document.documentElement.dataset.hqExperience;
    };
  }, [mode]);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      toggleMode,
    }),
    [mode, setMode, toggleMode],
  );

  return <HqModeContext.Provider value={value}>{children}</HqModeContext.Provider>;
}
