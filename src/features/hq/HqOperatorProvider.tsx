import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchHqOperator } from "../../lib/hq/api.ts";
import { ApiError } from "../../lib/api/errors.ts";
import type { HqCurrentOperator } from "../../lib/hq/types.ts";
import { useAuth } from "../auth/useAuth.ts";
import { HqOperatorContext } from "./hqOperatorContext.ts";
import type { HqOperatorContextValue } from "./hqOperatorContextValue.ts";

/**
 * Loads the operator record for whichever brand is currently active
 * (see AuthProvider/tokenStore — this app holds one token per brand, and
 * `apiRequest` defaults to the active one). Re-probes whenever the active
 * brand or its signed-in-ness changes, mirroring dateza's original
 * per-userId probe but keyed on brand instead of a single global user id,
 * since a single browser tab here can hold sign-ins for multiple brands.
 */
export function HqOperatorProvider({ children }: { children: ReactNode }) {
  const { activeBrand, signedInBrands, brands } = useAuth();
  const hasToken = activeBrand !== undefined && signedInBrands.includes(activeBrand);
  const [probe, setProbe] = useState<{ brand: string; operator: HqCurrentOperator } | null>(null);
  const [failedBrand, setFailedBrand] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!activeBrand || !hasToken) {
      return;
    }

    let cancelled = false;
    void fetchHqOperator()
      .then((operator) => {
        if (!cancelled) {
          setProbe({ brand: activeBrand, operator });
          setFailedBrand(null);
          setErrorMessage(null);
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        setProbe(null);
        setFailedBrand(activeBrand);
        if (error instanceof ApiError && error.status === 403) {
          setErrorMessage("This account is not authorized for HQ on this brand.");
        } else {
          setErrorMessage("Could not load your operator session. Try again.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeBrand, hasToken]);

  const refresh = useCallback(async () => {
    if (!activeBrand) {
      return;
    }
    try {
      const operator = await fetchHqOperator();
      setProbe({ brand: activeBrand, operator });
      setFailedBrand(null);
      setErrorMessage(null);
    } catch (error) {
      setProbe(null);
      setFailedBrand(activeBrand);
      if (error instanceof ApiError && error.status === 403) {
        setErrorMessage("This account is not authorized for HQ on this brand.");
      } else {
        setErrorMessage("Could not load your operator session. Try again.");
      }
    }
  }, [activeBrand]);

  const value = useMemo<HqOperatorContextValue>(() => {
    const brandName = brands.find((brand) => brand.slug === activeBrand)?.label ?? null;

    if (!activeBrand) {
      return {
        status: "unavailable",
        brandSlug: null,
        brandName: null,
        operatorLabel: "Operator",
        operator: null,
        errorMessage: "No brand selected.",
        refresh,
      };
    }

    if (!hasToken) {
      return {
        status: "unavailable",
        brandSlug: activeBrand,
        brandName,
        operatorLabel: "Operator",
        operator: null,
        errorMessage: "Sign in to continue.",
        refresh,
      };
    }

    if (probe?.brand === activeBrand) {
      return {
        status: "ready",
        brandSlug: probe.operator.current_brand,
        brandName,
        operatorLabel: `Operator ${probe.operator.admin_user_id}`,
        operator: probe.operator,
        errorMessage: null,
        refresh,
      };
    }

    if (failedBrand === activeBrand) {
      return {
        status: "unavailable",
        brandSlug: activeBrand,
        brandName,
        operatorLabel: "Operator",
        operator: null,
        errorMessage: errorMessage ?? "Could not load your operator session.",
        refresh,
      };
    }

    return {
      status: "loading",
      brandSlug: activeBrand,
      brandName,
      operatorLabel: "Operator",
      operator: null,
      errorMessage: null,
      refresh,
    };
  }, [activeBrand, brands, errorMessage, failedBrand, hasToken, probe, refresh]);

  return <HqOperatorContext.Provider value={value}>{children}</HqOperatorContext.Provider>;
}
