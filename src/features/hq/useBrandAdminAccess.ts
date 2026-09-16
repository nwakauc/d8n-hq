import { useEffect, useState } from "react";
import {
  clearHqOperatorAccessCache,
  probeHqOperatorAccess,
  type HqOperatorAccess,
} from "../../lib/hq/adminAccess.ts";
import { useAuth } from "../auth/useAuth.ts";

/** Resolves brand-admin access for the active brand's signed-in operator (/hq gate). */
export function useBrandAdminAccess(): HqOperatorAccess {
  const { activeBrand, signedInBrands } = useAuth();
  const hasToken = activeBrand !== undefined && signedInBrands.includes(activeBrand);
  const [probe, setProbe] = useState<{
    brand: string;
    access: Exclude<HqOperatorAccess, "unknown">;
  } | null>(null);

  useEffect(() => {
    if (!activeBrand || !hasToken) {
      clearHqOperatorAccessCache();
      return;
    }

    let cancelled = false;
    void probeHqOperatorAccess(activeBrand).then((access) => {
      if (!cancelled) {
        setProbe({ brand: activeBrand, access });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeBrand, hasToken]);

  if (!activeBrand || !hasToken) {
    return "forbidden";
  }
  if (probe?.brand !== activeBrand) {
    return "unknown";
  }
  return probe.access;
}
