import { ApiError } from "../../lib/api/errors.ts";
import { UnconfiguredBrandError } from "../../lib/api/client.ts";

const GENERIC = "Something went wrong. Please try again in a moment.";
const NETWORK = "We could not reach D8N. Check your connection and try again.";
const RATE_LIMITED = "Too many attempts. Wait a moment and try again.";

export function signInErrorMessage(error: unknown): string {
  if (error instanceof UnconfiguredBrandError) {
    return error.message;
  }
  if (error instanceof ApiError) {
    if (error.status === 401 || error.code === "invalid_credentials") {
      return "That email, phone, or password did not match this brand's account. Try again.";
    }
    if (error.status === 429 || error.code === "rate_limited") {
      return RATE_LIMITED;
    }
    if (error.status >= 500) {
      return GENERIC;
    }
  }
  if (error instanceof TypeError) {
    return NETWORK;
  }
  if (error instanceof DOMException && error.name === "TimeoutError") {
    return NETWORK;
  }
  if (error instanceof Error && error.name === "AbortError") {
    return NETWORK;
  }
  return GENERIC;
}
