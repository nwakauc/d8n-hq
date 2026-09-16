import { useContext } from "react";
import { HqModeContext } from "./hqModeContextValue.ts";

export function useHqMode() {
  const value = useContext(HqModeContext);
  if (!value) {
    throw new Error("useHqMode must be used within HqModeProvider");
  }
  return value;
}
