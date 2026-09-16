import { fetchHqOperator } from "./api.ts";
import { ApiError } from "../api/errors.ts";

export type HqOperatorAccess = "unknown" | "allowed" | "forbidden" | "unavailable";

// Cache key is the active brand slug rather than a user id: this app can
// hold sign-ins for multiple brands in one tab (one Bearer token each —
// see tokenStore.ts), so "the" user id isn't a stable cache key the way it
// is for a single-brand session.
let cached: { brandSlug: string; access: Exclude<HqOperatorAccess, "unknown"> } | null = null;

/**
 * Whether the active brand's signed-in operator has an active assignment on
 * that brand. Uses GET /api/v1/hq/operator — MFA step-up is not required for
 * this probe.
 */
export async function probeHqOperatorAccess(
  brandSlug: string,
): Promise<Exclude<HqOperatorAccess, "unknown">> {
  if (cached?.brandSlug === brandSlug) {
    return cached.access;
  }

  try {
    await fetchHqOperator();
    cached = { brandSlug, access: "allowed" };
    return "allowed";
  } catch (error: unknown) {
    if (error instanceof ApiError && (error.status === 403 || error.status === 401)) {
      cached = { brandSlug, access: "forbidden" };
      return "forbidden";
    }
    return "unavailable";
  }
}

export function clearHqOperatorAccessCache(): void {
  cached = null;
}

export type BrandAdminAccess = HqOperatorAccess;
