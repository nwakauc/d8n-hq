import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { clearAllBrandTokens } from "../lib/api/tokenStore.ts";
import { setUnauthorizedListener } from "../lib/api/client.ts";

function unauthorizedResponse(): Response {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  clearAllBrandTokens();
  setUnauthorizedListener(undefined);
  window.localStorage.clear();
  if (typeof URL.createObjectURL !== "function") {
    URL.createObjectURL = () => "blob:d8n-hq-test";
  }
  if (typeof URL.revokeObjectURL !== "function") {
    URL.revokeObjectURL = () => undefined;
  }
  if (typeof ResizeObserver === "undefined") {
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  }
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(unauthorizedResponse())),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  clearAllBrandTokens();
  setUnauthorizedListener(undefined);
  window.localStorage.clear();
  document.title = "D8N HQ";
});
