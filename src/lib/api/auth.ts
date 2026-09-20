import { ApiError } from "./errors.ts";
import { apiRequest } from "./client.ts";
import type { IdentifierKind, PasswordAuthRequest, PasswordAuthSessionResponse } from "./types.ts";

const DEVICE_NAME = "D8N HQ";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseIdentifierKind(value: unknown): IdentifierKind {
  if (value === "phone" || value === "email") {
    return value;
  }
  throw new ApiError(502, undefined, "invalid_auth_response");
}

/**
 * Deliberately lenient: D8N's login response carries fields this app has no
 * use for (verification_required, onboarding, ...) — those come along for
 * the ride and are ignored rather than re-validated here. HQ receives an
 * HttpOnly operator cookie; only the CSRF value is retained in memory.
 */
function parseSessionResponse(data: unknown): PasswordAuthSessionResponse {
  if (isRecord(data) && isRecord(data.session) && typeof data.session.expires_at === "string") {
    const operator = isRecord(data.operator) ? data.operator : {};
    return {
      expires_at: data.session.expires_at,
      user_id: typeof operator.user_id === "number" ? operator.user_id : 0,
      brand: { slug: typeof operator.brand === "string" ? operator.brand : "", name: "" },
      csrf_token: typeof data.session.csrf_token === "string" ? data.session.csrf_token : undefined,
    };
  }
  if (
    !isRecord(data) ||
    typeof data.expires_at !== "string" ||
    typeof data.user_id !== "number" ||
    !isRecord(data.brand) ||
    typeof data.brand.slug !== "string" ||
    typeof data.brand.name !== "string" ||
    !isRecord(data.identifier) || typeof data.identifier.verified !== "boolean" || typeof data.identifier.masked_destination !== "string"
  ) {
    throw new ApiError(502, undefined, "invalid_auth_response");
  }

  return {
    expires_at: data.expires_at,
    user_id: data.user_id,
    brand: { slug: data.brand.slug, name: data.brand.name },
    identifier: {
      kind: parseIdentifierKind(data.identifier.kind),
      verified: data.identifier.verified,
      masked_destination: data.identifier.masked_destination,
    },
    csrf_token: typeof data.csrf_token === "string" ? data.csrf_token : undefined,
  };
}

function jsonInit(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export function loginWithPassword(
  brandSlug: string,
  identifier: string,
  password: string,
): Promise<PasswordAuthSessionResponse> {
  const body: PasswordAuthRequest = {
    identifier,
    password,
    device_name: DEVICE_NAME,
    session_mode: "hq_cookie",
  };
  return apiRequest("/api/v1/hq/auth/login", jsonInit("POST", body), {
    brand: brandSlug,
    invalidateOnUnauthorized: false,
  }).then(parseSessionResponse);
}

export function revokeCurrentSession(brandSlug: string): Promise<void> {
  return apiRequest("/api/v1/hq/auth/session", { method: "DELETE" }, { brand: brandSlug }).then(
    () => undefined,
  );
}

export function restoreHqSession(brandSlug: string): Promise<{ expires_at: string; csrf_token: string } | undefined> {
  return apiRequest("/api/v1/hq/auth/session", { method: "GET" }, { brand: brandSlug }).then((data) => {
    // A deployed session probe may use 204 as a successful existence check.
    // apiRequest returns undefined for an empty 2xx body; preserve that success.
    if (data === undefined) return undefined;
    if (typeof data !== "object" || data === null || !("session" in data)) throw new ApiError(502, undefined, "invalid_auth_response");
    const session = (data as { session: { expires_at?: unknown; csrf_token?: unknown } }).session;
    if (typeof session.expires_at !== "string" || typeof session.csrf_token !== "string") throw new ApiError(502, undefined, "invalid_auth_response");
    return { expires_at: session.expires_at, csrf_token: session.csrf_token };
  });
}
