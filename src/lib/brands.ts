/**
 * Registry of D8N brands this HQ app can reach, keyed by their D8N brand
 * slug (must match `Brand#slug` on the Rails backend exactly — see
 * `~/pro/d8n/app/models/brand.rb`; not enforced client-side, just needs to
 * agree so `/api/v1/hq/operator`'s `current_brand` matches an entry here).
 *
 * Unlike the per-brand consumer apps (dateza, hookus, date9ja frontends),
 * this app is not same-origin with any one brand's API — D8N resolves
 * `Current.brand` purely from the request's Host header
 * (`domains/brands/resolver.rb`), so switching brands here means issuing
 * requests to a *different* API host entirely, each with its own
 * brand-pinned session/token (see tokenStore.ts). Configure the hosts via
 * VITE_HQ_BRANDS; see .env.example.
 */

export type BrandConfig = {
  slug: string;
  label: string;
  apiBase: string;
};

function parseBrandConfig(value: unknown): BrandConfig | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.slug !== "string" ||
    record.slug === "" ||
    typeof record.label !== "string" ||
    record.label === "" ||
    typeof record.apiBase !== "string" ||
    record.apiBase === ""
  ) {
    return null;
  }
  return { slug: record.slug, label: record.label, apiBase: record.apiBase.replace(/\/+$/, "") };
}

function loadBrands(): BrandConfig[] {
  const raw = import.meta.env.VITE_HQ_BRANDS;
  if (typeof raw !== "string" || raw.trim() === "") {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map(parseBrandConfig)
      .filter((entry): entry is BrandConfig => entry !== null);
  } catch {
    console.error("VITE_HQ_BRANDS is not valid JSON; no brands configured.");
    return [];
  }
}

export const BRANDS: readonly BrandConfig[] = loadBrands();

export function findBrand(slug: string): BrandConfig | undefined {
  return BRANDS.find((brand) => brand.slug === slug);
}
