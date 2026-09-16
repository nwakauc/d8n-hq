import { operatorHasCapability } from "../../lib/hq/capabilities.ts";
import type { HqCapability, HqCurrentOperator } from "../../lib/hq/types.ts";

export function opsCan(
  operator: HqCurrentOperator | null | undefined,
  capability: HqCapability,
): boolean {
  return operatorHasCapability(operator, capability);
}
