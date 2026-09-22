import { apiRequest } from "../api/client.ts";
import { ApiError } from "../api/errors.ts";
import {
  parseAdminEnforcementResponse,
  parseAdminReport,
  parseAdminReportList,
  parseAnalyticsOverview,
  parseCommandCentreBrands,
  parseCommandCentreHealth,
  parseCommunityQueue,
  parseDatabaseBackups,
  parseHqDevices,
  parseHqNotificationHealth,
  parseHqNotificationDeliveries,
  parseHqSystemHealth,
  parseHqAttention,
  parseAuthAttemptList,
  parseCurrentOperatorResponse,
  parseDiscoveryDiagnostic,
  parseDiscoveryHealth,
  parseEnforcementList,
  parseMember360,
  parseMemberDirectoryList,
  parseMfaChallengeResponse,
  parseMfaConfirmationResponse,
  parseMfaEnrollmentResponse,
  parseIdentityCorrectionResponse,
  parseLiveEventsResult,
  parseProfilePhotoModerationResult,
  parseProfilePhotoQueue,
  parseProductFunnel,
  parseProductTrends,
  parseManagedOperatorList,
  parseManagedOperatorResponse,
  parseRealmeModerationResult,
  parseRealmeQueue,
  parseRegistrationTrendResponse,
  parseRepeatOffenderList,
  parseSecurityAlertList,
  parseSecurityEventList,
  parseTrustSafetyOverview,
  parseVersionInfo,
} from "./parse.ts";
import type {
  HqAdminEnforcement,
  HqAdminReport,
  HqAdminReportList,
  HqAdminReportListParams,
  HqAnalyticsOverview,
  HqCommandCentreBrandsResponse,
  HqCommandCentreHealth,
  HqCommunitySubmission,
  HqCommunityType,
  HqDatabaseBackupsResponse,
  HqDevicesResponse,
  HqAuthAttemptList,
  HqBanProfileBody,
  HqCurrentOperator,
  HqOperatorSession,
  HqTimelineEvent,
  HqDiscoveryDiagnostic,
  HqDiscoveryHealth,
  HqEnforcementList,
  HqHistoryParams,
  HqIdentityCorrection,
  HqIdentityCorrectionField,
  HqMember360,
  HqPrivateAlbumSummary,
  HqPrivateMediaAccess,
  HqMfaChallengeResult,
  HqMfaConfirmation,
  HqMfaEnrollmentResponse,
  HqNotificationHealthResponse,
  HqNotificationDeliveriesResponse,
  HqCreateOperatorBody,
  HqManagedOperator,
  HqMemberDirectoryList,
  HqMemberDirectoryParams,
  HqProfilePhotoModerationResult,
  HqProfilePhotoQueue,
  HqProductFunnel,
  HqProductTrends,
  HqRealmeDecision,
  HqRealmeModerationResult,
  HqRealmeQueue,
  HqUpdateOperatorBody,
  HqRepeatOffenderList,
  HqRegistrationTrendResponse,
  HqSecurityAlertList,
  HqSecurityEventList,
  HqSuspendProfileBody,
  HqTrustSafetyEnforcementParams,
  HqTrustSafetyOverview,
  HqSystemHealthResponse,
  HqAttention,
  HqUpdateReportBody,
} from "./types.ts";

/**
 * HQ + reused admin moderation client.
 * Brand is host-derived by D8N; never send a client brand parameter.
 */

export async function fetchHqOperator(): Promise<HqCurrentOperator> {
  const data = await apiRequest("/api/v1/hq/operator");
  return parseCurrentOperatorResponse(data).operator;
}

export async function fetchHqOperatorSessions(): Promise<HqOperatorSession[]> {
  const data = await apiRequest("/api/v1/hq/auth/sessions");
  if (typeof data !== "object" || data === null || !("sessions" in data) || !Array.isArray(data.sessions)) return [];
  return data.sessions as HqOperatorSession[];
}

export async function revokeHqOperatorSession(id: number): Promise<void> {
  await apiRequest(`/api/v1/hq/auth/sessions/${id}`, { method: "DELETE" });
}

export async function startHqMfaEnrollment(): Promise<HqMfaEnrollmentResponse> {
  const data = await apiRequest("/api/v1/hq/mfa/enrollment", { method: "POST" });
  return parseMfaEnrollmentResponse(data);
}

export async function confirmHqMfaEnrollment(code: string): Promise<HqMfaConfirmation> {
  const data = await apiRequest("/api/v1/hq/mfa/enrollment", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: code.trim() }),
  });
  return parseMfaConfirmationResponse(data);
}

export async function challengeHqMfa(code: string): Promise<HqMfaChallengeResult> {
  const data = await apiRequest("/api/v1/hq/mfa/challenge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: code.trim() }),
  });
  return parseMfaChallengeResponse(data);
}

function memberPath(lookup: string, suffix = ""): string {
  const trimmed = lookup.trim();
  if (!trimmed) {
    throw new ApiError(400, "invalid_lookup", "invalid_lookup");
  }
  return `/api/v1/hq/members/${encodeURIComponent(trimmed)}${suffix}`;
}

function historyQuery(params: HqHistoryParams | undefined): string {
  const query = new URLSearchParams();
  if (params?.cursor) {
    query.set("cursor", params.cursor);
  }
  if (params?.limit !== undefined) {
    query.set("limit", String(params.limit));
  }
  const encoded = query.toString();
  return encoded ? `?${encoded}` : "";
}

export async function fetchHqMember360(lookup: string): Promise<HqMember360> {
  const data = await apiRequest(memberPath(lookup));
  return parseMember360(data);
}

export async function fetchHqPrivateAlbums(lookup: string): Promise<HqPrivateAlbumSummary[]> {
  const data = (await apiRequest(memberPath(lookup, "/private_albums"))) as { albums: HqPrivateAlbumSummary[] };
  return data.albums;
}

export async function fetchHqMemberDirectory(
  params?: HqMemberDirectoryParams,
): Promise<HqMemberDirectoryList> {
  const query = new URLSearchParams();
  if (params?.search) {
    query.set("search", params.search);
  }
  if (params?.status) {
    query.set("status", params.status);
  }
  if (params?.profile_status) {
    query.set("profile_status", params.profile_status);
  }
  if (params?.profile_visibility) {
    query.set("visibility", params.profile_visibility);
  }
  if (params?.contact_verification && params.contact_verification !== "any") {
    query.set("contact_verification", params.contact_verification);
  }
  if (params?.enforcement && params.enforcement !== "any") {
    query.set("enforcement", params.enforcement);
  }
  if (params?.created_from) {
    query.set("created_from", params.created_from);
  }
  if (params?.created_to) {
    query.set("created_to", params.created_to);
  }
  if (params?.last_active_from) {
    query.set("last_active_from", params.last_active_from);
  }
  if (params?.last_active_to) {
    query.set("last_active_to", params.last_active_to);
  }
  if (params?.sort) {
    query.set("sort", params.sort);
  }
  if (params?.gender) {
    query.set("gender", params.gender);
  }
  if (params?.country_code) {
    query.set("country_code", params.country_code);
  }
  if (params?.cursor) {
    query.set("cursor", params.cursor);
  }
  if (params?.limit !== undefined) {
    query.set("limit", String(params.limit));
  }
  const data = await apiRequest(appendQuery("/api/v1/hq/members", query));
  return parseMemberDirectoryList(data);
}

/** Lookup = Member 360 GET. 404 `member_unavailable` means not found on this brand. */
export async function lookupHqMember(
  lookup: string,
): Promise<{ found: true; member: HqMember360 } | { found: false }> {
  try {
    const member = await fetchHqMember360(lookup);
    return { found: true, member };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return { found: false };
    }
    throw error;
  }
}

export async function fetchHqSecurityEvents(
  lookup: string,
  params?: HqHistoryParams,
): Promise<HqSecurityEventList> {
  const data = await apiRequest(memberPath(lookup, `/security_events${historyQuery(params)}`));
  return parseSecurityEventList(data);
}

export async function fetchHqAuthAttempts(
  lookup: string,
  params?: HqHistoryParams,
): Promise<HqAuthAttemptList> {
  const data = await apiRequest(memberPath(lookup, `/auth_attempts${historyQuery(params)}`));
  return parseAuthAttemptList(data);
}

export async function fetchHqEnforcements(
  lookup: string,
  params?: HqHistoryParams,
): Promise<HqEnforcementList> {
  const data = await apiRequest(memberPath(lookup, `/enforcements${historyQuery(params)}`));
  return parseEnforcementList(data);
}

export async function fetchHqMemberTimeline(lookup: string): Promise<HqTimelineEvent[]> {
  const data = await apiRequest(memberPath(lookup, "/timeline"));
  if (typeof data !== "object" || data === null || !("events" in data) || !Array.isArray(data.events)) return [];
  return data.events as HqTimelineEvent[];
}

export async function fetchHqDiscoveryDiagnostic(lookup: string): Promise<HqDiscoveryDiagnostic> {
  const data = await apiRequest(memberPath(lookup, "/discovery_diagnostic"));
  return parseDiscoveryDiagnostic(data);
}

export async function publishHqMemberProfile(lookup: string, reason: string): Promise<void> {
  await apiRequest(memberPath(lookup, "/publication"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason: reason.trim() }),
  });
}

function appendQuery(base: string, params: URLSearchParams): string {
  const encoded = params.toString();
  return encoded ? `${base}?${encoded}` : base;
}

export async function fetchTrustSafetyOverview(): Promise<HqTrustSafetyOverview> {
  const data = await apiRequest("/api/v1/hq/trust_safety/overview");
  return parseTrustSafetyOverview(data);
}

export async function fetchHqAnalyticsOverview(): Promise<HqAnalyticsOverview> {
  const data = await apiRequest("/api/v1/hq/analytics/overview");
  return parseAnalyticsOverview(data);
}

export async function fetchCommandCentreHealth(): Promise<HqCommandCentreHealth> {
  const data = await apiRequest("/api/v1/hq/command_centre/health");
  return parseCommandCentreHealth(data);
}

export async function fetchHqDatabaseBackups(): Promise<HqDatabaseBackupsResponse> {
  const data = await apiRequest("/api/v1/hq/backups");
  return parseDatabaseBackups(data);
}

export async function fetchHqDevices(window = "24h"): Promise<HqDevicesResponse> {
  const data = await apiRequest(`/api/v1/hq/devices?window=${encodeURIComponent(window)}`);
  return parseHqDevices(data);
}

export async function fetchHqNotificationHealth(window = "24h"): Promise<HqNotificationHealthResponse> {
  const data = await apiRequest(`/api/v1/hq/notification_health?window=${encodeURIComponent(window)}`);
  return parseHqNotificationHealth(data);
}

export async function fetchHqNotificationDeliveries(window = "24h"): Promise<HqNotificationDeliveriesResponse> {
  const data = await apiRequest(`/api/v1/hq/notification_deliveries?window=${encodeURIComponent(window)}`);
  return parseHqNotificationDeliveries(data);
}

export async function fetchHqSystemHealth(): Promise<HqSystemHealthResponse> {
  const data = await apiRequest("/api/v1/hq/system_health");
  return parseHqSystemHealth(data);
}

export async function fetchHqAttention(): Promise<HqAttention> {
  const data = await apiRequest("/api/v1/hq/attention");
  return parseHqAttention(data);
}

export async function fetchHqDiscoveryHealth(): Promise<HqDiscoveryHealth> {
  const data = await apiRequest("/api/v1/hq/discovery_health");
  return parseDiscoveryHealth(data);
}

export async function triggerHqDatabaseBackup(): Promise<HqDatabaseBackupsResponse> {
  const data = await apiRequest("/api/v1/hq/backups", { method: "POST" });
  return parseDatabaseBackups(data);
}

export async function fetchCommandCentreBrands(): Promise<HqCommandCentreBrandsResponse> {
  const data = await apiRequest("/api/v1/hq/command_centre/brands");
  return parseCommandCentreBrands(data);
}

export async function fetchCommandCentreRegistrationTrends(
  window: string,
): Promise<HqRegistrationTrendResponse> {
  const query = new URLSearchParams({ window });
  try {
    const data = await apiRequest(`/api/v1/hq/command_centre/registration_trends?${query}`);
    return parseRegistrationTrendResponse(data);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      throw new ApiError(404, "registration_trends_unavailable", error.message);
    }
    throw error;
  }
}

export async function fetchHqProductFunnel(window: string): Promise<HqProductFunnel> {
  const query = new URLSearchParams({ window });
  try {
    const data = await apiRequest(`/api/v1/hq/product_intelligence/funnel?${query}`);
    return parseProductFunnel(data);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      throw new ApiError(404, "product_funnel_unavailable", error.message);
    }
    throw error;
  }
}

export async function fetchHqProductTrends(window: string): Promise<HqProductTrends> {
  const query = new URLSearchParams({ window });
  try {
    const data = await apiRequest(`/api/v1/hq/product_intelligence/trends?${query}`);
    return parseProductTrends(data);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      throw new ApiError(404, "product_trends_unavailable", error.message);
    }
    throw error;
  }
}

export async function fetchRepeatOffenders(limit?: number): Promise<HqRepeatOffenderList> {
  const query = new URLSearchParams();
  if (limit !== undefined) {
    query.set("limit", String(limit));
  }
  const data = await apiRequest(appendQuery("/api/v1/hq/trust_safety/repeat_offenders", query));
  return parseRepeatOffenderList(data);
}

export async function fetchTrustSafetyEnforcements(
  params?: HqTrustSafetyEnforcementParams,
): Promise<HqEnforcementList> {
  const query = new URLSearchParams();
  if (params?.state) {
    query.set("state", params.state);
  }
  if (params?.cursor) {
    query.set("cursor", params.cursor);
  }
  if (params?.limit !== undefined) {
    query.set("limit", String(params.limit));
  }
  const data = await apiRequest(appendQuery("/api/v1/hq/trust_safety/enforcements", query));
  return parseEnforcementList(data);
}

export async function fetchAdminReports(
  params?: HqAdminReportListParams,
): Promise<HqAdminReportList> {
  const query = new URLSearchParams();
  if (params?.status) {
    query.set("status", params.status);
  }
  if (params?.cursor) {
    query.set("cursor", params.cursor);
  }
  if (params?.limit !== undefined) {
    query.set("limit", String(params.limit));
  }
  const data = await apiRequest(appendQuery("/api/v1/admin/reports", query));
  return parseAdminReportList(data);
}

export async function fetchAdminReport(id: number): Promise<HqAdminReport> {
  const data = await apiRequest(`/api/v1/admin/reports/${id}`);
  return parseAdminReport(data);
}

export async function accessPrivateAlbumItem(
  itemId: string,
  body: { report_id?: number; reason: string },
): Promise<HqPrivateMediaAccess> {
  return (await apiRequest(`/api/v1/hq/private_media/items/${encodeURIComponent(itemId)}/access`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })) as HqPrivateMediaAccess;
}

export async function updateAdminReport(
  id: number,
  body: HqUpdateReportBody,
): Promise<HqAdminReport> {
  const data = await apiRequest(`/api/v1/admin/reports/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseAdminReport(data);
}

export async function suspendAdminProfile(
  profileId: string,
  body?: HqSuspendProfileBody,
): Promise<HqAdminEnforcement> {
  const trimmed = profileId.trim();
  if (!trimmed) {
    throw new ApiError(400, "invalid_lookup", "invalid_lookup");
  }
  const data = await apiRequest(`/api/v1/admin/profiles/${encodeURIComponent(trimmed)}/suspension`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  return parseAdminEnforcementResponse(data);
}

export async function reinstateAdminProfile(profileId: string): Promise<HqAdminEnforcement> {
  const trimmed = profileId.trim();
  if (!trimmed) {
    throw new ApiError(400, "invalid_lookup", "invalid_lookup");
  }
  const data = await apiRequest(`/api/v1/admin/profiles/${encodeURIComponent(trimmed)}/suspension`, {
    method: "DELETE",
  });
  return parseAdminEnforcementResponse(data);
}

export async function banAdminProfile(
  profileId: string,
  body: HqBanProfileBody,
): Promise<HqAdminEnforcement> {
  const trimmed = profileId.trim();
  if (!trimmed) {
    throw new ApiError(400, "invalid_lookup", "invalid_lookup");
  }
  const reason = body.reason.trim();
  if (!reason) {
    throw new ApiError(400, "invalid_reason", "invalid_reason");
  }
  const data = await apiRequest(`/api/v1/admin/profiles/${encodeURIComponent(trimmed)}/ban`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reason,
      note: body.note ?? null,
      report_id: body.report_id ?? null,
    }),
  });
  return parseAdminEnforcementResponse(data);
}

export async function unbanAdminProfile(profileId: string): Promise<HqAdminEnforcement> {
  const trimmed = profileId.trim();
  if (!trimmed) {
    throw new ApiError(400, "invalid_lookup", "invalid_lookup");
  }
  const data = await apiRequest(`/api/v1/admin/profiles/${encodeURIComponent(trimmed)}/ban`, {
    method: "DELETE",
  });
  return parseAdminEnforcementResponse(data);
}

export async function fetchHqSecurityAlerts(params?: {
  limit?: number;
}): Promise<HqSecurityAlertList> {
  const search = new URLSearchParams();
  if (params?.limit !== undefined) search.set("limit", String(params.limit));
  const query = search.toString();
  const data = await apiRequest(`/api/v1/hq/security_alerts${query ? `?${query}` : ""}`);
  return parseSecurityAlertList(data);
}

export async function fetchHqLiveEvents(params?: {
  brand?: "all";
  since?: string;
  limit?: number;
}): Promise<import("./types.ts").HqLiveEventsResult> {
  const search = new URLSearchParams();
  if (params?.brand) search.set("brand", params.brand);
  if (params?.since) search.set("since", params.since);
  if (params?.limit !== undefined) search.set("limit", String(params.limit));
  const query = search.toString();
  const data = await apiRequest(`/api/v1/hq/live_events${query ? `?${query}` : ""}`);
  return parseLiveEventsResult(data);
}

export async function fetchD8nVersion(): Promise<import("./types.ts").HqVersionInfo> {
  const data = await apiRequest("/api/v1/version");
  return parseVersionInfo(data);
}

export async function fetchProfilePhotoQueue(): Promise<HqProfilePhotoQueue> {
  const data = await apiRequest("/api/v1/admin/profile_photos");
  return parseProfilePhotoQueue(data);
}

export async function moderateProfilePhoto(
  photoId: string,
  status: "approved" | "rejected",
): Promise<HqProfilePhotoModerationResult> {
  const data = await apiRequest(`/api/v1/admin/profile_photos/${encodeURIComponent(photoId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return parseProfilePhotoModerationResult(data);
}

export async function fetchCommunityQueue(type: HqCommunityType): Promise<HqCommunitySubmission[]> {
  const data = await apiRequest(`/api/v1/admin/community/${type}`);
  return parseCommunityQueue(data);
}

export async function moderateCommunitySubmission(
  type: HqCommunityType,
  id: string,
  status: "approved" | "rejected" | "hidden",
  note?: string,
): Promise<void> {
  await apiRequest(`/api/v1/admin/community/${type}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, moderation_note: note }),
  });
}

export async function removeCommunityContent(
  type: "posts" | "comments",
  id: string,
  note?: string,
): Promise<void> {
  await apiRequest(`/api/v1/admin/community/${type}/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ moderation_note: note }),
  });
}

export async function fetchRealmeQueue(): Promise<HqRealmeQueue> {
  const data = await apiRequest("/api/v1/admin/realme_verifications");
  return parseRealmeQueue(data);
}

export async function moderateRealmeVerification(
  assertionId: number,
  decision: HqRealmeDecision,
  note?: string,
): Promise<HqRealmeModerationResult> {
  const data = await apiRequest(`/api/v1/admin/realme_verifications/${encodeURIComponent(assertionId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: decision, ...(note ? { note } : {}) }),
  });
  return parseRealmeModerationResult(data);
}

export async function correctProfileIdentity(
  profileId: string,
  field: HqIdentityCorrectionField,
  value: string | string[],
  reason: string,
  note?: string,
): Promise<HqIdentityCorrection> {
  const data = await apiRequest(`/api/v1/admin/profiles/${encodeURIComponent(profileId)}/identity_corrections`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ field, value, reason, ...(note ? { note } : {}) }),
  });
  return parseIdentityCorrectionResponse(data);
}

export async function restrictProfileDiscovery(profileId: string, reason: string, note?: string): Promise<void> {
  await apiRequest(`/api/v1/admin/profiles/${encodeURIComponent(profileId)}/discovery_restriction`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason, note: note ?? null }),
  });
}

export async function restoreProfileDiscovery(profileId: string): Promise<void> {
  await apiRequest(`/api/v1/admin/profiles/${encodeURIComponent(profileId)}/discovery_restriction`, { method: "DELETE" });
}

export async function recordTrustAdjustment(profileId: string, points: number, reasonCode: string, note?: string): Promise<void> {
  await apiRequest(`/api/v1/admin/profiles/${encodeURIComponent(profileId)}/trust_adjustments`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ points, reason_code: reasonCode, note: note ?? null, idempotency_key: crypto.randomUUID() }),
  });
}

export async function fetchManagedOperators(): Promise<HqManagedOperator[]> {
  const data = await apiRequest("/api/v1/hq/operators");
  return parseManagedOperatorList(data);
}

export async function createManagedOperator(body: HqCreateOperatorBody): Promise<HqManagedOperator> {
  const data = await apiRequest("/api/v1/hq/operators", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseManagedOperatorResponse(data);
}

export async function updateManagedOperator(
  adminUserId: number,
  body: HqUpdateOperatorBody,
): Promise<HqManagedOperator> {
  const data = await apiRequest(`/api/v1/hq/operators/${adminUserId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseManagedOperatorResponse(data);
}

export function hqErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "Something went wrong talking to D8N. Try again.";
  }
  if (error.status === 401) {
    return "Your session expired. Sign in again to continue.";
  }
  if (error.status === 403) {
    if (error.code === "admin_mfa_required") {
      return "Complete multi-factor authentication to continue.";
    }
    return "You are signed in, but you are not authorized for this action on this brand.";
  }
  if (error.status === 404) {
    if (error.code === "registration_trends_unavailable") {
      return "Registration history is not available on this deployment yet.";
    }
    if (error.code === "product_funnel_unavailable") {
      return "The product funnel is not available on this deployment yet.";
    }
    if (error.code === "product_trends_unavailable") {
      return "Marketplace trend history is not available on this deployment yet.";
    }
    if (error.code === "report_unavailable") {
      return "That report is unavailable for this brand.";
    }
    if (error.code === "profile_unavailable") {
      return "This member has no profile on this brand yet.";
    }
    return "No matching member was found for this brand.";
  }
  if (error.status === 409) {
    if (error.code === "already_suspended") {
      return "That profile is already suspended on this brand.";
    }
    if (error.code === "not_suspended") {
      return "That profile is not currently suspended.";
    }
    if (error.code === "report_conflict") {
      return "Another moderator already resolved this report. Refresh and review the current status.";
    }
    if (error.code === "enforced") {
      return "This profile has an active enforcement and cannot be made discoverable from this control.";
    }
    if (error.code === "discovery_restricted") {
      return "This profile has an explicit discovery restriction. Resolve that restriction first.";
    }
    if (error.code === "already_visible") {
      return "This profile is already visible. Refresh Member 360 for the current state.";
    }
    return "This action conflicts with the current state. Refresh and try again.";
  }
  if (error.status === 422) {
    if (error.code === "backup_not_configured") {
      return "Database backup storage is not configured for the brand buckets yet.";
    }
    if (error.code === "backup_failed") {
      return "The database backup could not be completed. Check the backup service logs and try again.";
    }
    if (error.code === "admin_mfa_code_invalid") {
      return "That code was not accepted. Check your authenticator app or recovery code.";
    }
    if (error.code === "invalid_cursor") {
      return "That page cursor is no longer valid. Start again from the first page.";
    }
    if (error.code === "invalid_limit") {
      return "That page size is not allowed.";
    }
    if (error.code === "invalid_filter") {
      return "That filter is not valid for this request.";
    }
    if (error.code === "invalid_search") {
      return "Search text is too long or not valid.";
    }
    if (error.code === "invalid_transition") {
      return "That status change is not allowed from the report's current state.";
    }
    if (error.code === "profile_incomplete") {
      return "This profile is still incomplete under the current brand publication requirements.";
    }
    if (error.code === "invalid_reason") {
      return "A publication reason is required and must be 500 characters or fewer.";
    }
    return "The request was rejected. Check the lookup or paging parameters.";
  }
  if (error.status === 429 && error.code === "admin_mfa_rate_limited") {
    const wait = error.retryAfterSeconds;
    return wait
      ? `Too many MFA attempts. Wait ${wait} seconds and try again.`
      : "Too many MFA attempts. Wait a moment and try again.";
  }
  if (error.status >= 500 || error.message.startsWith("invalid_hq_")) {
    return "The HQ API returned an unexpected response.";
  }
  return "The HQ request failed. Try again.";
}
