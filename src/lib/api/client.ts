import { ApiError } from "./errors.ts";
import { getActiveBrand, getHqCsrfToken, clearHqSession } from "./tokenStore.ts";
import { findBrand } from "../brands.ts";

const REQUEST_TIMEOUT_MS = 15_000;

type UnauthorizedListener = (brandSlug: string) => void;

let unauthorizedListener: UnauthorizedListener | undefined;

export function setUnauthorizedListener(listener: UnauthorizedListener | undefined): void {
  unauthorizedListener = listener;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseErrorDetails(data: unknown): Record<string, string[]> | undefined {
  if (!isRecord(data) || !isRecord(data.details)) {
    return undefined;
  }
  const details: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(data.details)) {
    if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
      details[key] = value;
    } else if (typeof value === "string") {
      details[key] = [value];
    }
  }
  return Object.keys(details).length > 0 ? details : undefined;
}

function parseErrorCode(data: unknown): string | undefined {
  if (!isRecord(data)) {
    return undefined;
  }
  const code = data.error;
  return typeof code === "string" ? code : undefined;
}

function parseRetryAfter(headers: Headers): number | undefined {
  const value = headers.get("Retry-After");
  if (!value) {
    return undefined;
  }
  const seconds = Number.parseInt(value, 10);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined;
}

export type ApiRequestOptions = {
  /** Which brand's host + token to use. Defaults to the active brand
   * (BrandSwitcher selection) — pass explicitly for e.g. sign-in, which
   * targets a brand before it's necessarily the active one yet. */
  brand?: string;
  /**
   * When false, a 401 does not clear the brand's cached token or notify the
   * unauthorized listener. Required for signed-out auth so invalid
   * credentials cannot wipe an existing token for that brand.
   */
  invalidateOnUnauthorized?: boolean;
};

export class UnconfiguredBrandError extends Error {
  constructor(brandSlug: string | undefined) {
    super(
      brandSlug
        ? `No API host configured for brand "${brandSlug}" (see VITE_HQ_BRANDS).`
        : "No brand selected and no API host configured.",
    );
    this.name = "UnconfiguredBrandError";
  }
}

export async function apiRequest(
  path: string,
  init: RequestInit = {},
  options: ApiRequestOptions = {},
): Promise<unknown> {
  const brandSlug = options.brand ?? getActiveBrand();
  const brand = brandSlug ? findBrand(brandSlug) : undefined;
  if (!brand) {
    throw new UnconfiguredBrandError(brandSlug);
  }

  const invalidateOnUnauthorized = options.invalidateOnUnauthorized ?? true;
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");

  const method = (init.method ?? "GET").toUpperCase();
  const csrf = getHqCsrfToken(brand.slug);
  if (csrf && !["GET", "HEAD", "OPTIONS"].includes(method)) headers.set("X-CSRF-Token", csrf);

  const response = await fetch(`${brand.apiBase}${path}`, {
    ...init,
    credentials: "include",
    // HQ/admin JSON must never be served from a conditional cache entry. A 304
    // has no body; our parsers expect JSON and will fail with "Safety data
    // unavailable" even though auth succeeded.
    cache: "no-store",
    headers,
    signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const rawText = await response.text();
  let parsed: unknown;
  if (rawText.length > 0) {
    try {
      parsed = JSON.parse(rawText) as unknown;
    } catch {
      parsed = undefined;
    }
  }

  if (response.status === 401) {
    if (invalidateOnUnauthorized) {
      clearHqSession(brand.slug);
      unauthorizedListener?.(brand.slug);
    }
    const code = parseErrorCode(parsed);
    throw new ApiError(401, code, code ?? "unauthorized");
  }

  if (!response.ok) {
    const code = parseErrorCode(parsed);
    throw new ApiError(
      response.status,
      code,
      typeof code === "string" ? code : "request_failed",
      parseErrorDetails(parsed),
      response.status === 429 ? parseRetryAfter(response.headers) : undefined,
    );
  }

  if (rawText.length === 0) {
    return undefined;
  }

  if (parsed === undefined) {
    throw new ApiError(502, undefined, "invalid_json_response");
  }

  return parsed;
}
