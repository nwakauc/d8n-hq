import type { HqAttentionSignal } from "../../lib/hq/types.ts";

export type AttentionDrillDown = {
  label: string;
  to: string;
};

/** Map backend attention signals to existing HQ routes only. */
export function attentionSignalDrillDown(signal: HqAttentionSignal): AttentionDrillDown | null {
  switch (signal.signal) {
    case "old_unresolved_report":
      return { label: "Open report queue", to: "/hq/trust-safety?tab=queue" };
    case "pending_photo_reviews":
      return { label: "Trust & Safety", to: "/hq/trust-safety" };
    case "active_enforcements":
      return { label: "Enforcements", to: "/hq/trust-safety?tab=enforcements" };
    case "zero_discovery_allocations":
      return { label: "Member directory", to: "/hq/members" };
    default:
      return null;
  }
}
