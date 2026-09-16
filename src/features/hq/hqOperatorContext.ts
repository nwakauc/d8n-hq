import { createContext } from "react";
import type { HqOperatorContextValue } from "./hqOperatorContextValue.ts";

export const HqOperatorContext = createContext<HqOperatorContextValue | null>(null);
