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
 * the ride and are ignored rather than re-validated here. This app only
 * ever requests `session_mode: "token"`, so a response without a token is
 * itself an invalid-response condition, not the cookie-mode branch DateZA's
 * client has to handle.
 */
function parseSessionResponse(data: unknown): PasswordAuthSessionResponse {
  if (
    !isRecord(data) ||
    typeof data.token !== "string" ||
    data.token === "" ||
    data.token_type !== "Bearer" ||
    typeof data.expires_at !== "string" ||
    typeof data.user_id !== "number" ||
    !isRecord(data.brand) ||
    typeof data.brand.slug !== "string" ||
    typeof data.brand.name !== "string" ||
    !isRecord(data.identifier) ||
    typeof data.identifier.verified !== "boolean" ||
    typeof data.identifier.masked_destination !== "string"
  ) {
    throw new ApiError(502, undefined, "invalid_auth_response");
  }

  return {
    token: data.token,
    token_type: "Bearer",
    expires_at: data.expires_at,
    user_id: data.user_id,
    brand: { slug: data.brand.slug, name: data.brand.name },
    identifier: {
      kind: parseIdentifierKind(data.identifier.kind),
      verified: data.identifier.verified,
      masked_destination: data.identifier.masked_destination,
    },
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
    session_mode: "token",
  };
  return apiRequest("/api/v1/auth/password/login", jsonInit("POST", body), {
    brand: brandSlug,
    attachBearer: false,
    invalidateOnUnauthorized: false,
  }).then(parseSessionResponse);
}

export function revokeCurrentSession(brandSlug: string): Promise<void> {
  return apiRequest("/api/v1/auth/session", { method: "DELETE" }, { brand: brandSlug }).then(
    () => undefined,
  );
}
