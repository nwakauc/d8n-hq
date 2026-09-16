/**
 * In-memory holder for D8N opaque Bearer tokens, one per brand.
 *
 * D8N issues Bearer sessions (OpenAPI securitySchemes.bearerAuth) as an
 * alternative to its HttpOnly-cookie browser session mode; this app always
 * requests `session_mode: "token"` (see lib/api/auth.ts) specifically so it
 * never depends on cookies — a session established while signed in on
 * DateZA's host must not silently try to ride along to Date9ja's host, and
 * D8N's own session model would reject that anyway (`Session belongs_to
 * :brand`; `Identity::SessionAuthenticator` hard-fails `wrong_brand` if the
 * token's brand doesn't match the request's Host-resolved brand — see
 * ~/pro/dateza/HQ-STANDALONE-PLAN.md). One token per brand, kept separately,
 * is the correct shape for that constraint, not a workaround for it.
 *
 * Persistence is intentionally not implemented (mirrors dateza's ADR-0002):
 * tokens live only in memory and are lost on reload, so every operator
 * re-authenticates per brand once per browser session. Revisit only with
 * the same security sign-off ADR-0002 required.
 */

export type BrandToken = {
  token: string;
  expiresAt: string;
};

const tokensByBrand = new Map<string, BrandToken>();

export function getBrandToken(brandSlug: string): string | undefined {
  return tokensByBrand.get(brandSlug)?.token;
}

export function getBrandTokenExpiry(brandSlug: string): string | undefined {
  return tokensByBrand.get(brandSlug)?.expiresAt;
}

export function setBrandToken(brandSlug: string, token: BrandToken | undefined): void {
  if (token === undefined || token.token === "") {
    tokensByBrand.delete(brandSlug);
    return;
  }
  tokensByBrand.set(brandSlug, token);
}

export function hasBrandToken(brandSlug: string): boolean {
  return tokensByBrand.has(brandSlug);
}

export function brandsWithTokens(): string[] {
  return Array.from(tokensByBrand.keys());
}

export function clearAllBrandTokens(): void {
  tokensByBrand.clear();
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
