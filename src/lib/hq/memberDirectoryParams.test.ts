import { describe, expect, it } from "vitest";
import {
  directoryParamsFromSearchParams,
  writeDirectoryParamsToSearchParams,
} from "../../lib/hq/memberDirectoryParams.ts";

describe("memberDirectoryParams", () => {
  it("reads search and filters from URL", () => {
    const params = new URLSearchParams(
      "search=lebo&status=active&profile_status=active&visibility=visible&contact_verification=verified&enforcement=active&sort=recently_active",
    );
    expect(directoryParamsFromSearchParams(params)).toEqual({
      search: "lebo",
      status: "active",
      profile_status: "active",
      profile_visibility: "visible",
      contact_verification: "verified",
      enforcement: "active",
      created_from: null,
      created_to: null,
      last_active_from: null,
      last_active_to: null,
      sort: "recently_active",
    });
  });

  it("writes filters to URL and clears cursor", () => {
    const current = new URLSearchParams("cursor=abc&sort=oldest");
    const next = writeDirectoryParamsToSearchParams(current, {
      search: "sam",
      status: null,
      profile_status: "draft",
      profile_visibility: null,
      contact_verification: "any",
      enforcement: "none",
      created_from: null,
      created_to: null,
      last_active_from: null,
      last_active_to: null,
      sort: "newest",
    });
    expect(next.get("search")).toBe("sam");
    expect(next.get("profile_status")).toBe("draft");
    expect(next.get("enforcement")).toBe("none");
    expect(next.get("cursor")).toBeNull();
    expect(next.get("sort")).toBeNull();
  });
});
