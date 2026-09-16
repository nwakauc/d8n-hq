import { createContext } from "react";
import type { BrandConfig } from "../../lib/brands.ts";

export type AuthContextValue = {
  /** All brands this app is configured to reach (VITE_HQ_BRANDS). */
  brands: readonly BrandConfig[];
  /** The brand currently selected in the UI; requests default to this brand. */
  activeBrand: string | undefined;
  /** Brands with a cached, not-yet-expired-looking token (signed in this session). */
  signedInBrands: string[];
  /** Switch which brand is active. Does not sign in — call signIn first if needed. */
  setActiveBrand: (brandSlug: string) => void;
  signIn: (brandSlug: string, identifier: string, password: string) => Promise<void>;
  signOut: (brandSlug: string) => Promise<void>;
  /** Bumped whenever tokens change, so consumers keyed on it re-render. */
  version: number;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
