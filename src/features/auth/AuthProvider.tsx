import { useCallback, useMemo, useState, type ReactNode } from "react";
import { loginWithPassword, revokeCurrentSession } from "../../lib/api/auth.ts";
import { setUnauthorizedListener } from "../../lib/api/client.ts";
import {
  brandsWithTokens,
  setActiveBrand as storeSetActiveBrand,
  setBrandToken,
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

  const setActiveBrand = useCallback((brandSlug: string) => {
    storeSetActiveBrand(brandSlug);
    setActiveBrandState(brandSlug);
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
      setBrandToken(brandSlug, { token: session.token, expiresAt: session.expires_at });
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
    setBrandToken(brandSlug, undefined);
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
      signedInBrands: brandsWithTokens(),
      setActiveBrand,
      signIn,
      signOut,
      version,
    }),
    // `version` is the deliberate re-render trigger for signedInBrands
    // (tokenStore is a plain module singleton, not itself reactive).
    [activeBrand, setActiveBrand, signIn, signOut, version],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
