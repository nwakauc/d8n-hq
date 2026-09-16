import type { HqCapability, HqCurrentOperator, HqOperatorRole } from "./types.ts";

const ROLE_LABELS: Record<HqOperatorRole, string> = {
  founder: "Founder",
  super_admin: "Super Admin",
  operations: "Operations",
  trust_safety: "Trust & Safety",
  support: "Support",
  engineering: "Engineering",
  marketing: "Marketing",
  analyst: "Analyst",
  moderator: "Moderator",
};

/** Nav items that require at least one listed capability; null means any operator. */
export const HQ_NAV_CAPABILITIES: Record<string, readonly HqCapability[] | null> = {
  "command-centre": null,
  alerts: ["hq.security_alerts.read"],
  members: ["hq.member.sensitive_read"],
  "trust-safety": ["hq.trust_safety.read", "admin.reports.read"],
};

export function formatOperatorRole(role: HqOperatorRole): string {
  return ROLE_LABELS[role] ?? role;
}

export function operatorHasCapability(
  operator: HqCurrentOperator | null | undefined,
  capability: HqCapability,
): boolean {
  return operator?.effective_capabilities.includes(capability) ?? false;
}

export function operatorHasAnyCapability(
  operator: HqCurrentOperator | null | undefined,
  capabilities: readonly HqCapability[],
): boolean {
  return capabilities.some((capability) => operatorHasCapability(operator, capability));
}

export function canAccessNavItem(
  operator: HqCurrentOperator | null | undefined,
  navItemId: string,
): boolean {
  const required = HQ_NAV_CAPABILITIES[navItemId];
  if (!required) {
    return Boolean(operator);
  }
  return operatorHasAnyCapability(operator, required);
}
