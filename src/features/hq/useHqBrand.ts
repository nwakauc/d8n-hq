import { useHqOperator } from "./useHqOperator.ts";

/** Brand display context backed by the loaded HQ operator session. */
export function useHqBrand() {
  return useHqOperator();
}
