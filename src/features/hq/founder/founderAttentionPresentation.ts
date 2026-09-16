import type { HqAttentionSignal } from "../../../lib/hq/types.ts";

const ACTIONABLE_SIGNALS = new Set([
  "old_unresolved_report",
  "pending_photo_reviews",
  "active_enforcements",
  "zero_discovery_allocations",
]);

const MARKETPLACE_TIMING_PATTERN =
  /time_to_first_(like|match|conversation)_median|marketplace timing/i;

function isMarketplaceTimingUnavailable(signal: HqAttentionSignal): boolean {
  if (signal.signal === "metric_unavailable") {
    const blob = `${signal.title} ${signal.reason}`;
    return MARKETPLACE_TIMING_PATTERN.test(blob);
  }
  if (MARKETPLACE_TIMING_PATTERN.test(signal.signal)) return true;
  const blob = `${signal.title} ${signal.reason} ${signal.signal}`;
  return MARKETPLACE_TIMING_PATTERN.test(blob);
}

function isHiddenMetricUnavailable(signal: HqAttentionSignal): boolean {
  return signal.signal === "metric_unavailable";
}

function isActionable(signal: HqAttentionSignal): boolean {
  return ACTIONABLE_SIGNALS.has(signal.signal);
}

export type FounderAttentionItem =
  | { kind: "actionable"; signal: HqAttentionSignal }
  | { kind: "marketplace_timing_unavailable" };

export function presentFounderAttentionSignals(
  signals: HqAttentionSignal[],
): FounderAttentionItem[] {
  const items: FounderAttentionItem[] = [];
  let marketplaceTimingUnavailable = false;

  for (const signal of signals) {
    if (isMarketplaceTimingUnavailable(signal)) {
      marketplaceTimingUnavailable = true;
      continue;
    }
    if (isHiddenMetricUnavailable(signal)) {
      continue;
    }
    if (isActionable(signal)) {
      items.push({ kind: "actionable", signal });
    }
  }

  if (marketplaceTimingUnavailable) {
    items.push({ kind: "marketplace_timing_unavailable" });
  }

  return items;
}
