import { operatorHasAnyCapability, operatorHasCapability } from "./capabilities.ts";
import type { HqCapability, HqCurrentOperator } from "./types.ts";

const CREATE_CAPABILITIES: readonly HqCapability[] = [
  "admin.enforcements.create",
  /** @deprecated legacy umbrella capability — remove after D8N RBAC migration */
  "admin.enforcements.manage",
];

const REINSTATE_CAPABILITIES: readonly HqCapability[] = [
  "admin.enforcements.reinstate",
  "admin.enforcements.override",
  /** @deprecated legacy umbrella capability — remove after D8N RBAC migration */
  "admin.enforcements.manage",
];

export function canCreateEnforcement(
  operator: HqCurrentOperator | null | undefined,
): boolean {
  return operatorHasAnyCapability(operator, CREATE_CAPABILITIES);
}

export function canReinstateEnforcement(
  operator: HqCurrentOperator | null | undefined,
): boolean {
  return operatorHasAnyCapability(operator, REINSTATE_CAPABILITIES);
}

export function canReadSecurityAlerts(
  operator: HqCurrentOperator | null | undefined,
): boolean {
  return operatorHasCapability(operator, "hq.security_alerts.read");
}
