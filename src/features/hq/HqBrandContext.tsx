import type { ReactNode } from "react";
import { HqOperatorProvider } from "./HqOperatorProvider.tsx";

/** @deprecated HqBrandProvider is now a thin alias over HqOperatorProvider. */
export function HqBrandProvider({ children }: { children: ReactNode }) {
  return <HqOperatorProvider>{children}</HqOperatorProvider>;
}
