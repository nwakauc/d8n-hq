import { afterEach, describe, expect, it, vi } from "vitest";
import { restoreHqSession } from "./auth.ts";

describe("HQ session restoration", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("treats a successful 204 session probe as authenticated without parsing JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    await expect(restoreHqSession("dateza")).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledWith(
      "https://dateza.test/api/v1/hq/auth/session",
      expect.objectContaining({ credentials: "include" }),
    );
  });
});
