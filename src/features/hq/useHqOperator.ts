import { useContext } from "react";
import { HqOperatorContext } from "./hqOperatorContext.ts";

export function useHqOperator() {
  const value = useContext(HqOperatorContext);
  if (!value) {
    throw new Error("useHqOperator must be used within HqOperatorProvider");
  }
  return value;
}
