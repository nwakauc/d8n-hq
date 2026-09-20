import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { loginWithPassword, restoreHqSession, revokeCurrentSession } from "../../lib/api/auth.ts";
import { setUnauthorizedListener } from "../../lib/api/client.ts";
import {
  hasHqSession,
  markHqSession,
  clearHqSession,
  setActiveBrand as storeSetActiveBrand,
} from "../../lib/api/tokenStore.ts";
import { BRANDS } from "../../lib/brands.ts";
import { AuthContext } from "./AuthContext.ts";
import type { AuthContextValue } from "./AuthContext.ts";

const ACTIVE_BRAND_STORAGE_KEY = "hq:active-brand:v1";

function readStoredActiveBrand(): string | undefined {
  try {
    const stored = window.localStorage.getItem(ACTIVE_BRAND_STORAGE_KEY);
    // Only the *selection* is remembered across reloads — never the token
    // (tokens are memory-only, ADR-0002-style; see tokenStore.ts). Reload
    // always re-lands on sign-in for whichever brand was last selected.
    return stored && BRANDS.some((brand) => brand.slug === stored) ? stored : undefined;
  } catch {
    return undefined;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [activeBrand, setActiveBrandState] = useState<string | undefined>(() => {
    const stored = readStoredActiveBrand() ?? BRANDS[0]?.slug;
    storeSetActiveBrand(stored);
    return stored;
  });
  const [version, setVersion] = useState(0);
  const [authReady, setAuthReady] = useState(() => {
    const initialBrand = readStoredActiveBrand() ?? BRANDS[0]?.slug;
    return initialBrand ? hasHqSession(initialBrand) : true;
  });

  useEffect(() => {
    if (!activeBrand || hasHqSession(activeBrand)) return;
    void restoreHqSession(activeBrand)
      .then((session) => {
        markHqSession(activeBrand, session?.csrf_token);
        setVersion((v) => v + 1);
      })
      .catch(() => undefined)
      .finally(() => setAuthReady(true));
  }, [activeBrand]);

  const setActiveBrand = useCallback((brandSlug: string) => {
    setAuthReady(false);
    storeSetActiveBrand(brandSlug);
    setActiveBrandState(brandSlug);
    if (hasHqSession(brandSlug)) setAuthReady(true);
    try {
      window.localStorage.setItem(ACTIVE_BRAND_STORAGE_KEY, brandSlug);
    } catch {
      // Private browsing / disabled storage — brand selection just won't
      // survive a reload; not worth failing sign-in over.
    }
  }, []);

  const signIn = useCallback(
    async (brandSlug: string, identifier: string, password: string) => {
      const session = await loginWithPassword(brandSlug, identifier, password);
      markHqSession(brandSlug, session.csrf_token);
      setVersion((v) => v + 1);
      setActiveBrand(brandSlug);
    },
    [setActiveBrand],
  );

  const signOut = useCallback(async (brandSlug: string) => {
    try {
      await revokeCurrentSession(brandSlug);
    } catch {
      // Best-effort server-side revoke; clear the local token regardless so
      // the operator is signed out of this app either way.
    }
    clearHqSession(brandSlug);
    setVersion((v) => v + 1);
  }, []);

  useMemo(() => {
    // Re-registering this listener on every render would be harmless but
    // wasteful; it only needs the latest setVersion, which is stable.
    setUnauthorizedListener(() => setVersion((v) => v + 1));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      brands: BRANDS,
      activeBrand,
      signedInBrands: BRANDS.filter((brand) => hasHqSession(brand.slug)).map((brand) => brand.slug),
      setActiveBrand,
      signIn,
      signOut,
      version,
      authReady,
    }),
    // `version` re-renders after bootstrap/login/logout because session state is
    // held in a small in-memory marker while the credential remains HttpOnly.
    [activeBrand, setActiveBrand, signIn, signOut, version, authReady],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
