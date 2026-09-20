/**
 * In-memory HQ session metadata, one marker/CSRF token per API host.
 *
 * HQ uses a brand-pinned HttpOnly cookie session. The browser keeps only a
 * non-secret marker and CSRF token in memory; reloads recover both from the
 * server bootstrap endpoint when it returns session metadata.
 *
 * The actual operator credential is an HttpOnly cookie. This module deliberately
 * retains only the non-secret session marker and CSRF token in memory; reloads
 * call the server bootstrap endpoint to recover them.
 */

export type BrandToken = {
  token: string;
  expiresAt: string;
};

const tokensByBrand = new Map<string, BrandToken>();
const hqSessionsByBrand = new Set<string>();
const csrfByBrand = new Map<string, string>();

export function markHqSession(brandSlug: string, csrfToken?: string): void {
  hqSessionsByBrand.add(brandSlug);
  if (csrfToken) csrfByBrand.set(brandSlug, csrfToken);
}
export function clearHqSession(brandSlug: string): void {
  hqSessionsByBrand.delete(brandSlug);
  csrfByBrand.delete(brandSlug);
}
export function hasHqSession(brandSlug: string): boolean { return hqSessionsByBrand.has(brandSlug); }
export function getHqCsrfToken(brandSlug: string): string | undefined { return csrfByBrand.get(brandSlug); }

export function getBrandToken(brandSlug: string): string | undefined {
  return tokensByBrand.get(brandSlug)?.token;
}

export function getBrandTokenExpiry(brandSlug: string): string | undefined {
  return tokensByBrand.get(brandSlug)?.expiresAt;
}

export function setBrandToken(brandSlug: string, token: BrandToken | undefined): void {
  if (token === undefined || token.token === "") {
    tokensByBrand.delete(brandSlug);
    clearHqSession(brandSlug);
    return;
  }
  tokensByBrand.set(brandSlug, token);
  // Compatibility for existing tests/consumers that seed an authenticated
  // marker. No request ever reads or sends this value as a credential.
  hqSessionsByBrand.add(brandSlug);
}

export function hasBrandToken(brandSlug: string): boolean {
  return tokensByBrand.has(brandSlug);
}

export function brandsWithTokens(): string[] {
  return Array.from(tokensByBrand.keys());
}

export function clearAllBrandTokens(): void {
  tokensByBrand.clear();
  hqSessionsByBrand.clear();
  csrfByBrand.clear();
}

/**
 * Which brand's host+token `apiRequest` targets when a call site doesn't
 * pass an explicit `brand` option — i.e. the brand currently selected in
 * the UI (BrandSwitcher). Kept alongside the tokens themselves since the two
 * are set together on sign-in and on brand switch.
 */
let activeBrand: string | undefined;

export function getActiveBrand(): string | undefined {
  return activeBrand;
}

export function setActiveBrand(brandSlug: string | undefined): void {
  activeBrand = brandSlug;
}
