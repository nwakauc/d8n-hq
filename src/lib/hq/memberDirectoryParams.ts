import type {
  HqMemberDirectoryContactVerification,
  HqMemberDirectoryEnforcementFilter,
  HqMemberDirectoryParams,
  HqMemberDirectorySort,
  HqMembershipStatus,
  HqProfileStatus,
  HqProfileVisibility,
} from "./types.ts";

const MEMBERSHIP_STATUSES: readonly HqMembershipStatus[] = [
  "active",
  "suspended",
  "left",
  "deactivated",
];
const PROFILE_STATUSES: readonly HqProfileStatus[] = ["draft", "active", "suspended"];
const VISIBILITIES: readonly HqProfileVisibility[] = ["hidden", "visible"];
const CONTACT_VERIFICATION: readonly HqMemberDirectoryContactVerification[] = [
  "any",
  "verified",
  "unverified",
];
const ENFORCEMENT: readonly HqMemberDirectoryEnforcementFilter[] = ["any", "active", "none"];
const SORTS: readonly HqMemberDirectorySort[] = ["newest", "oldest", "recently_active"];

function readEnum<T extends string>(
  value: string | null,
  allowed: readonly T[],
): T | null {
  if (!value) return null;
  return allowed.includes(value as T) ? (value as T) : null;
}

/** Parse URL search params into directory API params (excludes cursor). */
export function directoryParamsFromSearchParams(
  params: URLSearchParams,
): Omit<HqMemberDirectoryParams, "cursor" | "limit"> {
  const search = params.get("search")?.trim() || params.get("q")?.trim() || null;
  return {
    search: search || null,
    status: readEnum(params.get("status"), MEMBERSHIP_STATUSES),
    profile_status: readEnum(params.get("profile_status"), PROFILE_STATUSES),
    profile_visibility: readEnum(params.get("visibility"), VISIBILITIES),
    contact_verification: readEnum(params.get("contact_verification"), CONTACT_VERIFICATION),
    enforcement: readEnum(params.get("enforcement"), ENFORCEMENT),
    created_from: params.get("created_from") || null,
    created_to: params.get("created_to") || null,
    last_active_from: params.get("last_active_from") || null,
    last_active_to: params.get("last_active_to") || null,
    sort: readEnum(params.get("sort"), SORTS) ?? "newest",
  };
}

/** Write directory filters to URL (clears cursor on filter change). */
export function writeDirectoryParamsToSearchParams(
  current: URLSearchParams,
  filters: Omit<HqMemberDirectoryParams, "cursor" | "limit">,
): URLSearchParams {
  const next = new URLSearchParams(current);
  next.delete("cursor");

  const setOrDelete = (key: string, value: string | null | undefined, omitWhen?: string) => {
    if (!value || value === omitWhen) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
  };

  setOrDelete("search", filters.search);
  next.delete("q");
  setOrDelete("status", filters.status);
  setOrDelete("profile_status", filters.profile_status);
  setOrDelete("visibility", filters.profile_visibility);
  setOrDelete("contact_verification", filters.contact_verification, "any");
  setOrDelete("enforcement", filters.enforcement, "any");
  setOrDelete("created_from", filters.created_from);
  setOrDelete("created_to", filters.created_to);
  setOrDelete("last_active_from", filters.last_active_from);
  setOrDelete("last_active_to", filters.last_active_to);
  setOrDelete("sort", filters.sort, "newest");

  return next;
}

export function directoryParamsKey(
  filters: Omit<HqMemberDirectoryParams, "cursor" | "limit">,
): string {
  return JSON.stringify(filters);
}

export const DIRECTORY_SORT_OPTIONS: Array<{ value: HqMemberDirectorySort; label: string }> = [
  { value: "newest", label: "Newest signup" },
  { value: "oldest", label: "Oldest signup" },
  { value: "recently_active", label: "Recently active" },
];

export const DIRECTORY_MEMBERSHIP_FILTERS: Array<{ value: "" | HqMembershipStatus; label: string }> =
  [
    { value: "", label: "All memberships" },
    { value: "active", label: "Active" },
    { value: "suspended", label: "Suspended" },
    { value: "left", label: "Left" },
    { value: "deactivated", label: "Deactivated" },
  ];

export const DIRECTORY_PROFILE_STATUS_FILTERS: Array<{ value: "" | HqProfileStatus; label: string }> =
  [
    { value: "", label: "Any profile" },
    { value: "draft", label: "Draft" },
    { value: "active", label: "Active" },
    { value: "suspended", label: "Suspended" },
  ];

export const DIRECTORY_VISIBILITY_FILTERS: Array<{ value: "" | HqProfileVisibility; label: string }> =
  [
    { value: "", label: "Any visibility" },
    { value: "visible", label: "Visible" },
    { value: "hidden", label: "Hidden" },
  ];

export const DIRECTORY_CONTACT_FILTERS: Array<{
  value: HqMemberDirectoryContactVerification;
  label: string;
}> = [
  { value: "any", label: "Any contact" },
  { value: "verified", label: "Verified contact" },
  { value: "unverified", label: "Unverified contact" },
];

export const DIRECTORY_ENFORCEMENT_FILTERS: Array<{
  value: HqMemberDirectoryEnforcementFilter;
  label: string;
}> = [
  { value: "any", label: "Any enforcement" },
  { value: "active", label: "Enforced" },
  { value: "none", label: "Not enforced" },
];
