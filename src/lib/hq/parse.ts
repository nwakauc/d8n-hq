import { ApiError } from "../api/errors.ts";
import type {
  HqAccountClosure,
  HqDiscoveryRestriction,
  HqAccountType,
  HqAdminEnforcement,
  HqAdminReport,
  HqAdminReportList,
  HqAnalyticsOverview,
  HqAttention,
  HqAttentionBucket,
  HqAttentionSignal,
  HqCommandCentreBrandEntry,
  HqCommandCentreBrandsResponse,
  HqCommandCentreHealth,
  HqDatabaseBackup,
  HqDatabaseBackupsResponse,
  HqRegistrationTrendBrand,
  HqRegistrationTrendResponse,
  HqProductFunnel,
  HqProductFunnelStage,
  HqProductTrendSeries,
  HqProductTrends,
  HqMetricStatus,
  HqMetricUnit,
  HqMetricValue,
  HqMetricWindow,
  HqAdminReportParty,
  HqAuthAttempt,
  HqAuthAttemptKind,
  HqAuthAttemptList,
  HqAuthAttemptResult,
  HqCommsSection,
  HqDelivery,
  HqDiscoveryDeletedReason,
  HqDiscoveryDiagnostic,
  HqDiscoveryExclusionBreakdown,
  HqDiscoveryHealth,
  HqDiscoveryHealthBuckets,
  HqDiscoveryHealthLikelyEmptyMember,
  HqDiscoveryHealthMarketSummary,
  HqDiscoveryInteractionEntry,
  HqDiscoveryStage,
  HqDiscoveryStageName,
  HqDiscoveryToday,
  HqEnforcementList,
  HqGenderSplit,
  HqIdentitySection,
  HqIdentifier,
  HqMember360,
  HqMemberDirectoryEntry,
  HqMemberDirectoryList,
  HqMemberSummary,
  HqMembershipStatus,
  HqProductSection,
  HqIdentityCorrection,
  HqIdentityCorrectionField,
  HqProfilePhoto,
  HqProfilePreference,
  HqProfileSection,
  HqProfileVideo,
  HqRealmeCheckType,
  HqRealmeEvidence,
  HqRealmeModeration,
  HqRealmeModerationResult,
  HqRealmeQueue,
  HqRealmeQueueEntry,
  HqRealmeReviewContext,
  HqRecentAuthAttempt,
  HqRecentReport,
  HqRecentSecurityEvent,
  HqRepeatOffender,
  HqRepeatOffenderList,
  HqReportReason,
  HqReportStatus,
  HqReportTargetType,
  HqSafetySection,
  HqSecurityAlertList,
  HqSecurityEvent,
  HqSecurityEventList,
  HqSecuritySeverity,
  HqSession,
  HqTrustSafetyOverview,
  HqUserStatus,
  HqActivitySection,
  HqCapability,
  HqCurrentOperator,
  HqCurrentOperatorResponse,
  HqMfaChallengeResult,
  HqMfaConfirmation,
  HqMfaEnrollment,
  HqMfaEnrollmentResponse,
  HqMfaLifecycleState,
  HqMfaState,
  HqCommunitySubmission,
  HqManagedOperator,
  HqOperatorAssignment,
  HqOperatorRole,
  HqOperatorStatus,
  HqProfilePhotoDerivative,
  HqProfilePhotoModeration,
  HqProfilePhotoModerationResult,
  HqProfilePhotoQueue,
  HqProfilePhotoQueueEntry,
  HqProfileStatus,
  HqProfileVisibility,
} from "./types.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new ApiError(502, undefined, `invalid_hq_${label}`);
  }
  return value;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new ApiError(502, undefined, `invalid_hq_${label}`);
  }
  return value;
}

function requireNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ApiError(502, undefined, `invalid_hq_${label}`);
  }
  return value;
}

function requireBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    throw new ApiError(502, undefined, `invalid_hq_${label}`);
  }
  return value;
}

function nullableString(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value === "string") return value;
  throw new ApiError(502, undefined, "invalid_hq_nullable_string");
}

function parseMembershipStatus(value: unknown): HqMembershipStatus {
  if (value === "active" || value === "suspended" || value === "left" || value === "deactivated") {
    return value;
  }
  throw new ApiError(502, undefined, "invalid_hq_membership_status");
}

function parseUserStatus(value: unknown): HqUserStatus {
  if (value === "active" || value === "suspended" || value === "closed") {
    return value;
  }
  throw new ApiError(502, undefined, "invalid_hq_user_status");
}

function parseSeverity(value: unknown): HqSecuritySeverity {
  if (value === "info" || value === "warning" || value === "high" || value === "critical") {
    return value;
  }
  throw new ApiError(502, undefined, "invalid_hq_severity");
}

function parseAuthKind(value: unknown): HqAuthAttemptKind {
  if (
    value === "password" ||
    value === "email_otp" ||
    value === "phone_otp" ||
    value === "oauth" ||
    value === "webauthn" ||
    value === "recovery_code"
  ) {
    return value;
  }
  throw new ApiError(502, undefined, "invalid_hq_auth_kind");
}

function parseAuthResult(value: unknown): HqAuthAttemptResult {
  if (value === "succeeded" || value === "failed" || value === "throttled" || value === "locked") {
    return value;
  }
  throw new ApiError(502, undefined, "invalid_hq_auth_result");
}

function parseCountMap(value: unknown, label: string): Record<string, number> {
  const record = requireRecord(value, label);
  const out: Record<string, number> = {};
  for (const [key, entry] of Object.entries(record)) {
    out[key] = requireNumber(entry, `${label}_entry`);
  }
  return out;
}

function parseIdentifier(value: unknown): HqIdentifier {
  const row = requireRecord(value, "identifier");
  const kind = row.kind;
  if (kind !== "email" && kind !== "phone") {
    throw new ApiError(502, undefined, "invalid_hq_identifier_kind");
  }
  return {
    kind,
    value: requireString(row.value, "identifier_value"),
    verified_at: nullableString(row.verified_at),
    last_seen_at: nullableString(row.last_seen_at),
  };
}

function parseSession(value: unknown): HqSession {
  const row = requireRecord(value, "session");
  return {
    device_name: nullableString(row.device_name),
    ip_address: nullableString(row.ip_address),
    last_used_at: requireString(row.last_used_at, "session_last_used"),
    expires_at: requireString(row.expires_at, "session_expires"),
    revoked_at: nullableString(row.revoked_at),
  };
}

function parseAccountType(value: unknown): HqAccountType {
  const row = requireRecord(value, "account_type");
  return {
    label: requireString(row.label, "account_type_label"),
    founding_member: requireBoolean(row.founding_member, "account_type_founding_member"),
    subscription_status: nullableString(row.subscription_status),
    premium_expires_at: nullableString(row.premium_expires_at),
  };
}

function parseIdentity(value: unknown): HqIdentitySection {
  const row = requireRecord(value, "identity");
  if (!Array.isArray(row.identifiers) || !Array.isArray(row.recent_sessions)) {
    throw new ApiError(502, undefined, "invalid_hq_identity");
  }
  return {
    user_id: requireNumber(row.user_id, "identity_user_id"),
    user_status: parseUserStatus(row.user_status),
    first_name: nullableString(row.first_name),
    last_name: nullableString(row.last_name),
    user_created_at: requireString(row.user_created_at, "user_created_at"),
    membership_status: parseMembershipStatus(row.membership_status),
    member_since: requireString(row.member_since, "member_since"),
    account_type: parseAccountType(row.account_type),
    identifiers: row.identifiers.map(parseIdentifier),
    recent_sessions: row.recent_sessions.map(parseSession),
  };
}

function parsePhoto(value: unknown): HqProfilePhoto {
  const row = requireRecord(value, "photo");
  const status = row.status;
  const visibility = row.visibility;
  const processing = row.processing_state;
  if (status !== "pending_review" && status !== "approved" && status !== "rejected") {
    throw new ApiError(502, undefined, "invalid_hq_photo_status");
  }
  if (visibility !== "hidden" && visibility !== "visible") {
    throw new ApiError(502, undefined, "invalid_hq_photo_visibility");
  }
  if (
    processing !== "pending" &&
    processing !== "processing" &&
    processing !== "ready" &&
    processing !== "failed"
  ) {
    throw new ApiError(502, undefined, "invalid_hq_photo_processing");
  }
  return {
    id: requireString(row.id, "photo_id"),
    position: requireNumber(row.position, "photo_position"),
    status,
    visibility,
    processing_state: processing,
    image_url: nullableString(row.image_url),
  };
}

function parseVideo(value: unknown): HqProfileVideo | null {
  if (value === null || value === undefined) return null;
  const row = requireRecord(value, "video");
  const status = row.status;
  const visibility = row.visibility;
  const processing = row.processing_state;
  if (status !== "pending_review" && status !== "approved" && status !== "rejected") {
    throw new ApiError(502, undefined, "invalid_hq_video_status");
  }
  if (visibility !== "hidden" && visibility !== "visible") {
    throw new ApiError(502, undefined, "invalid_hq_video_visibility");
  }
  if (
    processing !== "pending" &&
    processing !== "processing" &&
    processing !== "ready" &&
    processing !== "failed"
  ) {
    throw new ApiError(502, undefined, "invalid_hq_video_processing");
  }
  return {
    id: requireString(row.id, "video_id"),
    status,
    visibility,
    processing_state: processing,
    playback_url: nullableString(row.playback_url),
    poster_url: nullableString(row.poster_url),
  };
}

function parsePreference(value: unknown): HqProfilePreference | null {
  if (value === null) return null;
  const row = requireRecord(value, "preference");
  const interested = Array.isArray(row.interested_in)
    ? row.interested_in.filter((item): item is string => typeof item === "string")
    : [];
  return {
    min_age: row.min_age === null || row.min_age === undefined ? null : requireNumber(row.min_age, "min_age"),
    max_age: row.max_age === null || row.max_age === undefined ? null : requireNumber(row.max_age, "max_age"),
    max_distance_km:
      row.max_distance_km === null || row.max_distance_km === undefined
        ? null
        : requireNumber(row.max_distance_km, "max_distance_km"),
    relationship_intent: nullableString(row.relationship_intent),
    interested_in: interested,
    country: nullableString(row.country),
  };
}

function parseProfile(value: unknown): HqProfileSection {
  const row = requireRecord(value, "profile");
  const exists = requireBoolean(row.exists, "profile_exists");
  if (!exists) {
    return { exists: false };
  }
  const status = row.status;
  const visibility = row.visibility;
  const onboarding = row.onboarding_state;
  if (status !== "draft" && status !== "active" && status !== "suspended") {
    throw new ApiError(502, undefined, "invalid_hq_profile_status");
  }
  if (visibility !== "hidden" && visibility !== "visible") {
    throw new ApiError(502, undefined, "invalid_hq_profile_visibility");
  }
  if (
    onboarding !== "profile_required" &&
    onboarding !== "profile_incomplete" &&
    onboarding !== "ready_to_publish" &&
    onboarding !== "complete" &&
    onboarding !== "profile_suspended"
  ) {
    throw new ApiError(502, undefined, "invalid_hq_onboarding_state");
  }
  if (!Array.isArray(row.photos)) {
    throw new ApiError(502, undefined, "invalid_hq_photos");
  }
  return {
    exists: true,
    public_id: requireString(row.public_id, "profile_public_id"),
    display_name: nullableString(row.display_name),
    status,
    visibility,
    gender: nullableString(row.gender),
    birthdate: nullableString(row.birthdate),
    country_code: nullableString(row.country_code),
    city: nullableString(row.city),
    created_at: requireString(row.created_at, "profile_created_at"),
    onboarding_state: onboarding,
    onboarding_next_step: nullableString(row.onboarding_next_step),
    onboarding_completion_percent: requireNumber(row.onboarding_completion_percent, "completion_percent"),
    photo_count: requireNumber(row.photo_count, "photo_count"),
    photos: row.photos.map(parsePhoto),
    video: parseVideo(row.video ?? null),
    preference: parsePreference(row.preference ?? null),
    configured_fields: isRecord(row.configured_fields) ? row.configured_fields : undefined,
    discovery_state: typeof row.discovery_state === "string" ? row.discovery_state : "unknown",
  };
}

function parseProduct(value: unknown): HqProductSection {
  const row = requireRecord(value, "product");
  const privateMedia = requireRecord(row.private_media, "private_media");
  if (!Array.isArray(row.recent_conversations)) {
    throw new ApiError(502, undefined, "invalid_hq_conversations");
  }
  return {
    likes_given: requireNumber(row.likes_given, "likes_given"),
    likes_received: requireNumber(row.likes_received, "likes_received"),
    matches_active: requireNumber(row.matches_active, "matches_active"),
    hooks_sent: requireNumber(row.hooks_sent, "hooks_sent"),
    hooks_received: requireNumber(row.hooks_received, "hooks_received"),
    hooks_live_sent: requireNumber(row.hooks_live_sent, "hooks_live_sent"),
    hooks_live_received: requireNumber(row.hooks_live_received, "hooks_live_received"),
    hook_tonight_live: requireBoolean(row.hook_tonight_live, "hook_tonight_live"),
    conversations_count: requireNumber(row.conversations_count, "conversations_count"),
    recent_conversations: row.recent_conversations.map((item) => {
      const conv = requireRecord(item, "conversation");
      const status = conv.status;
      if (status !== "active" && status !== "closed") {
        throw new ApiError(502, undefined, "invalid_hq_conversation_status");
      }
      return {
        id: requireString(conv.id, "conversation_id"),
        status,
        created_at: requireString(conv.created_at, "conversation_created_at"),
        match_id: typeof conv.match_id === "string" ? conv.match_id : undefined,
        other_member: isRecord(conv.other_member) ? { profile_id: nullableString(conv.other_member.profile_id), display_name: nullableString(conv.other_member.display_name) } : undefined,
        messages: Array.isArray(conv.messages) ? conv.messages.map((raw) => {
          const message = requireRecord(raw, "message");
          return { id: requireString(message.id, "message_id"), sender_profile_id: requireString(message.sender_profile_id, "message_sender"), kind: requireString(message.kind, "message_kind"), body: nullableString(message.body), deleted: message.deleted === true, created_at: requireString(message.created_at, "message_created"), attachments: Array.isArray(message.attachments) ? message.attachments.map((rawAttachment) => { const attachment = requireRecord(rawAttachment, "message_attachment"); return { id: requireString(attachment.id, "attachment_id"), kind: requireString(attachment.kind, "attachment_kind"), processing_state: requireString(attachment.processing_state, "attachment_processing"), deleted: attachment.deleted === true }; }) : [] };
        }) : undefined,
      };
    }),
    blocks_given: requireNumber(row.blocks_given, "blocks_given"),
    blocks_received: requireNumber(row.blocks_received, "blocks_received"),
    passes_given: typeof row.passes_given === "number" ? row.passes_given : undefined,
    passes_received: typeof row.passes_received === "number" ? row.passes_received : undefined,
    private_media: {
      albums: requireNumber(privateMedia.albums, "private_media_albums"),
      active_grants: requireNumber(privateMedia.active_grants, "private_media_active_grants"),
      photos: requireNumber(privateMedia.photos, "private_media_photos"),
      videos: requireNumber(privateMedia.videos, "private_media_videos"),
      reports: requireNumber(privateMedia.reports, "private_media_reports"),
    },
    pass_history: Array.isArray(row.pass_history) ? row.pass_history.map((raw) => { const item = requireRecord(raw, "pass_history"); return { direction: requireString(item.direction, "pass_direction"), counterpart_profile_id: nullableString(item.counterpart_profile_id), counterpart_display_name: nullableString(item.counterpart_display_name), created_at: requireString(item.created_at, "pass_created") }; }) : undefined,
    match_history: Array.isArray(row.match_history) ? row.match_history.map((raw) => { const item = requireRecord(raw, "match_history"); return { id: typeof item.id === "string" ? item.id : undefined, direction: requireString(item.direction, "match_direction"), counterpart_profile_id: nullableString(item.counterpart_profile_id), counterpart_display_name: nullableString(item.counterpart_display_name), created_at: requireString(item.created_at, "match_created") }; }) : undefined,
  };
}

function parseDelivery(value: unknown): HqDelivery {
  const row = requireRecord(value, "delivery");
  const channel = row.channel;
  const status = row.status;
  if (
    channel !== "sms" &&
    channel !== "email" &&
    channel !== "push" &&
    channel !== "whatsapp" &&
    channel !== "in_app"
  ) {
    throw new ApiError(502, undefined, "invalid_hq_delivery_channel");
  }
  if (
    status !== "pending" &&
    status !== "sent" &&
    status !== "failed" &&
    status !== "skipped" &&
    status !== "processing"
  ) {
    throw new ApiError(502, undefined, "invalid_hq_delivery_status");
  }
  return {
    channel,
    status,
    provider: requireString(row.provider, "delivery_provider"),
    sent_at: nullableString(row.sent_at),
    failed_at: nullableString(row.failed_at),
    error_code: nullableString(row.error_code),
    created_at: requireString(row.created_at, "delivery_created_at"),
  };
}

function parseComms(value: unknown): HqCommsSection {
  const row = requireRecord(value, "comms");
  if (!Array.isArray(row.recent_deliveries)) {
    throw new ApiError(502, undefined, "invalid_hq_recent_deliveries");
  }
  return {
    delivery_counts_by_status: parseCountMap(row.delivery_counts_by_status, "delivery_counts_by_status"),
    delivery_counts_by_channel: parseCountMap(row.delivery_counts_by_channel, "delivery_counts_by_channel"),
    recent_deliveries: row.recent_deliveries.map(parseDelivery),
  };
}

export function parseAdminEnforcement(value: unknown): HqAdminEnforcement {
  const row = requireRecord(value, "enforcement");
  const state = row.state;
  if (state !== "active" && state !== "reverted") {
    throw new ApiError(502, undefined, "invalid_hq_enforcement_state");
  }
  const kind = row.kind;
  if (kind !== "suspension" && kind !== "ban") {
    throw new ApiError(502, undefined, "invalid_hq_enforcement_kind");
  }
  return {
    id: requireNumber(row.id, "enforcement_id"),
    kind,
    state,
    profile_id: nullableString(row.profile_id),
    reason: nullableString(row.reason),
    note: nullableString(row.note),
    report_id: row.report_id === null ? null : requireNumber(row.report_id, "report_id"),
    admin_user_id: requireNumber(row.admin_user_id, "admin_user_id"),
    reverted_by_admin_user_id:
      row.reverted_by_admin_user_id === null
        ? null
        : requireNumber(row.reverted_by_admin_user_id, "reverted_by"),
    created_at: requireString(row.created_at, "enforcement_created_at"),
    reverted_at: nullableString(row.reverted_at),
  };
}

export function parseAdminEnforcementResponse(data: unknown): HqAdminEnforcement {
  const root = requireRecord(data, "enforcement_response");
  return parseAdminEnforcement(root.enforcement);
}

function parseReport(value: unknown): HqRecentReport {
  const row = requireRecord(value, "report");
  const status = row.status;
  const target = row.target_type;
  const direction = row.direction;
  if (status !== "open" && status !== "reviewing" && status !== "actioned" && status !== "dismissed") {
    throw new ApiError(502, undefined, "invalid_hq_report_status");
  }
  if (
    target !== "profile" &&
    target !== "message" &&
    target !== "profile_media" &&
    target !== "hook" &&
    target !== "conversation" &&
    target !== "private_album" &&
    target !== "private_album_item"
  ) {
    throw new ApiError(502, undefined, "invalid_hq_report_target");
  }
  if (direction !== "filed" && direction !== "received") {
    throw new ApiError(502, undefined, "invalid_hq_report_direction");
  }
  return {
    id: requireNumber(row.id, "report_id"),
    status,
    reason: requireString(row.reason, "report_reason"),
    target_type: target,
    direction,
    created_at: requireString(row.created_at, "report_created_at"),
  };
}

function parseSafety(value: unknown): HqSafetySection {
  const row = requireRecord(value, "safety");
  if (!Array.isArray(row.recent_reports)) {
    throw new ApiError(502, undefined, "invalid_hq_recent_reports");
  }
  let discoveryRestriction: HqDiscoveryRestriction | null = null;
  if (row.discovery_restriction !== null && row.discovery_restriction !== undefined) {
    const restrictionRow = requireRecord(row.discovery_restriction, "discovery_restriction");
    discoveryRestriction = {
      restricted_at: requireString(restrictionRow.restricted_at, "discovery_restricted_at"),
      reason: nullableString(restrictionRow.reason),
      note: nullableString(restrictionRow.note),
      restricted_by_admin_user_id:
        restrictionRow.restricted_by_admin_user_id === null ||
        restrictionRow.restricted_by_admin_user_id === undefined
          ? null
          : requireNumber(restrictionRow.restricted_by_admin_user_id, "restricted_by_admin_user_id"),
    };
  }
  let closure: HqAccountClosure | null = null;
  if (row.account_closure !== null && row.account_closure !== undefined) {
    const closureRow = requireRecord(row.account_closure, "account_closure");
    const purge = closureRow.media_purge_state;
    if (purge !== "pending" && purge !== "completed" && purge !== "failed") {
      throw new ApiError(502, undefined, "invalid_hq_media_purge_state");
    }
    closure = {
      media_purge_state: purge,
      created_at: requireString(closureRow.created_at, "closure_created_at"),
    };
  }
  return {
    trust_score: typeof row.trust_score === "number" ? row.trust_score : undefined,
    trust_breakdown: Array.isArray(row.trust_breakdown) ? row.trust_breakdown.map((entry) => {
      const item = requireRecord(entry, "trust_breakdown");
      return { kind: requireString(item.kind, "trust_kind"), type: requireString(item.type, "trust_type"), label: requireString(item.label, "trust_label"), points: requireNumber(item.points, "trust_points"), applies: item.applies === true, occurred_at: requireString(item.occurred_at, "trust_occurred_at") };
    }) : undefined,
    realme: Array.isArray(row.realme) ? row.realme.map((entry) => {
      const item = requireRecord(entry, "realme_entry");
      return { check_type: requireString(item.check_type, "realme_check_type") as "selfie" | "video" | "government_id", status: requireString(item.status, "realme_status"), submitted_at: nullableString(item.submitted_at), reviewed_at: nullableString(item.reviewed_at) };
    }) : undefined,
    reports_filed_count: requireNumber(row.reports_filed_count, "reports_filed"),
    reports_received_count: requireNumber(row.reports_received_count, "reports_received"),
    recent_reports: row.recent_reports.map(parseReport),
    active_enforcement:
      row.active_enforcement === null ? null : parseAdminEnforcement(row.active_enforcement),
    enforcement_count: requireNumber(row.enforcement_count, "enforcement_count"),
    discovery_restriction: discoveryRestriction,
    account_closure: closure,
  };
}

function parseRecentAuth(value: unknown): HqRecentAuthAttempt {
  const row = requireRecord(value, "recent_auth");
  return {
    kind: parseAuthKind(row.kind),
    result: parseAuthResult(row.result),
    ip_address: nullableString(row.ip_address),
    created_at: requireString(row.created_at, "auth_created_at"),
  };
}

function parseRecentSecurity(value: unknown): HqRecentSecurityEvent {
  const row = requireRecord(value, "recent_security");
  return {
    event_type: requireString(row.event_type, "event_type"),
    severity: parseSeverity(row.severity),
    created_at: requireString(row.created_at, "security_created_at"),
  };
}

function parseActivity(value: unknown): HqActivitySection {
  const row = requireRecord(value, "activity");
  if (!Array.isArray(row.recent_auth_attempts) || !Array.isArray(row.recent_security_events)) {
    throw new ApiError(502, undefined, "invalid_hq_activity");
  }
  return {
    last_login_at: nullableString(row.last_login_at),
    recent_auth_attempts: row.recent_auth_attempts.map(parseRecentAuth),
    recent_security_events: row.recent_security_events.map(parseRecentSecurity),
  };
}

function parseMemberSummary(value: unknown): HqMemberSummary {
  const row = requireRecord(value, "member");
  return {
    user_id: requireNumber(row.user_id, "member_user_id"),
    profile_id: nullableString(row.profile_id),
    brand: requireString(row.brand, "member_brand"),
    membership_status: parseMembershipStatus(row.membership_status),
  };
}

export function parseMember360(data: unknown): HqMember360 {
  const root = requireRecord(data, "member_360");
  const sections = requireRecord(root.sections, "sections");
  return {
    member: parseMemberSummary(root.member),
    sections: {
      identity: parseIdentity(sections.identity),
      profile: parseProfile(sections.profile),
      product: parseProduct(sections.product),
      comms: parseComms(sections.comms),
      safety: parseSafety(sections.safety),
      activity: parseActivity(sections.activity),
    },
  };
}

function parseMetadata(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new ApiError(502, undefined, "invalid_hq_metadata");
  }
  return value;
}

function parseSecurityEvent(value: unknown): HqSecurityEvent {
  const row = requireRecord(value, "security_event");
  return {
    id: requireNumber(row.id, "security_event_id"),
    event_type: requireString(row.event_type, "security_event_type"),
    severity: parseSeverity(row.severity),
    metadata: parseMetadata(row.metadata),
    ip_address: nullableString(row.ip_address),
    created_at: requireString(row.created_at, "security_event_created_at"),
  };
}

export function parseSecurityEventList(data: unknown): HqSecurityEventList {
  const root = requireRecord(data, "security_event_list");
  if (!Array.isArray(root.security_events)) {
    throw new ApiError(502, undefined, "invalid_hq_security_events");
  }
  return {
    security_events: root.security_events.map(parseSecurityEvent),
    next_cursor: nullableString(root.next_cursor),
  };
}

function parseAuthAttempt(value: unknown): HqAuthAttempt {
  const row = requireRecord(value, "auth_attempt");
  return {
    id: requireNumber(row.id, "auth_attempt_id"),
    kind: parseAuthKind(row.kind),
    result: parseAuthResult(row.result),
    identifier: requireString(row.identifier, "auth_identifier"),
    ip_address: nullableString(row.ip_address),
    created_at: requireString(row.created_at, "auth_attempt_created_at"),
  };
}

export function parseAuthAttemptList(data: unknown): HqAuthAttemptList {
  const root = requireRecord(data, "auth_attempt_list");
  if (!Array.isArray(root.auth_attempts)) {
    throw new ApiError(502, undefined, "invalid_hq_auth_attempts");
  }
  return {
    auth_attempts: root.auth_attempts.map(parseAuthAttempt),
    next_cursor: nullableString(root.next_cursor),
  };
}

export function parseEnforcementList(data: unknown): HqEnforcementList {
  const root = requireRecord(data, "enforcement_list");
  if (!Array.isArray(root.enforcements)) {
    throw new ApiError(502, undefined, "invalid_hq_enforcements");
  }
  return {
    enforcements: root.enforcements.map(parseAdminEnforcement),
    next_cursor: nullableString(root.next_cursor),
  };
}

export function parseSecurityAlertList(data: unknown): HqSecurityAlertList {
  const root = requireRecord(data, "security_alert_list_response");
  const rows = root.alerts;
  if (!Array.isArray(rows)) {
    throw new ApiError(502, undefined, "invalid_hq_security_alert_list");
  }
  return {
    alerts: rows.map(parseSecurityEvent),
  };
}

function parseLiveEventSeverity(value: unknown): import("./types.ts").HqLiveEventSeverity {
  if (value === "info" || value === "attention" || value === "warning" || value === "critical") {
    return value;
  }
  throw new ApiError(502, undefined, "invalid_hq_live_event_severity");
}

function parseLiveEventCategory(value: unknown): import("./types.ts").HqLiveEventCategory {
  if (
    value === "member" ||
    value === "profile" ||
    value === "marketplace" ||
    value === "conversation" ||
    value === "trust_safety" ||
    value === "security" ||
    value === "operator" ||
    value === "system"
  ) {
    return value;
  }
  throw new ApiError(502, undefined, "invalid_hq_live_event_category");
}

function parseLiveEventSubject(value: unknown): import("./types.ts").HqLiveEventSubject | null {
  if (value === null || value === undefined) return null;
  const row = requireRecord(value, "live_event_subject");
  const id = row.id;
  return {
    type: requireString(row.type, "live_event_subject_type"),
    id: typeof id === "number" || typeof id === "string" ? id : null,
  };
}

function parseLiveEvent(value: unknown): import("./types.ts").HqLiveEvent {
  const row = requireRecord(value, "live_event");
  return {
    id: requireString(row.id, "live_event_id"),
    event_type: requireString(row.event_type, "live_event_type"),
    category: parseLiveEventCategory(row.category),
    severity: parseLiveEventSeverity(row.severity),
    occurred_at: requireString(row.occurred_at, "live_event_occurred_at"),
    brand: requireString(row.brand, "live_event_brand"),
    title: requireString(row.title, "live_event_title"),
    description: requireString(row.description, "live_event_description"),
    subject: parseLiveEventSubject(row.subject),
    metadata: parseMetadata(row.metadata),
  };
}

export function parseLiveEventsResult(data: unknown): import("./types.ts").HqLiveEventsResult {
  const root = requireRecord(data, "live_events_result");
  if (!Array.isArray(root.events)) {
    throw new ApiError(502, undefined, "invalid_hq_live_events");
  }
  return {
    generated_at: requireString(root.generated_at, "live_events_generated_at"),
    events: root.events.map(parseLiveEvent),
  };
}

export function parseVersionInfo(data: unknown): import("./types.ts").HqVersionInfo {
  const row = requireRecord(data, "version");
  if (row.app !== "d8n") {
    throw new ApiError(502, undefined, "invalid_hq_version_app");
  }
  return {
    app: "d8n",
    git_sha: nullableString(row.git_sha),
    release: nullableString(row.release),
    image_version: nullableString(row.image_version),
    environment: requireString(row.environment, "version_environment"),
    rails_environment: requireString(row.rails_environment, "version_rails_environment"),
    build_timestamp: nullableString(row.build_timestamp),
    booted_at: requireString(row.booted_at, "version_booted_at"),
  };
}

function parseHqHealthStatus(value: unknown): import("./types.ts").HqHealthStatus {
  if (value === "healthy" || value === "degraded" || value === "down" || value === "unknown" || value === "not_configured") {
    return value;
  }
  throw new ApiError(502, undefined, "invalid_hq_health_status");
}

function parseDeviceVersion(value: unknown): import("./types.ts").HqDeviceVersion {
  const row = requireRecord(value, "device_version");
  return {
    version: nullableString(row.version),
    active_users: requireNumber(row.active_users, "device_version_active_users"),
    active_devices: requireNumber(row.active_devices, "device_version_active_devices"),
    last_seen_at: nullableString(row.last_seen_at),
  };
}

function parseDeviceBrowser(value: unknown): import("./types.ts").HqDeviceBrowser {
  const row = requireRecord(value, "device_browser");
  return {
    browser: requireString(row.browser, "device_browser_name"),
    active_users: requireNumber(row.active_users, "device_browser_active_users"),
    active_devices: requireNumber(row.active_devices, "device_browser_active_devices"),
    last_seen_at: nullableString(row.last_seen_at),
  };
}

export function parseHqDevices(data: unknown): import("./types.ts").HqDevicesResponse {
  const root = requireRecord(data, "devices");
  const platforms = requireRecord(root.platforms, "device_platforms");
  const names = ["android", "ios", "web", "other"] as const;
  const parsedPlatforms = Object.fromEntries(
    names.map((name) => {
      const row = requireRecord(platforms[name], `device_platform_${name}`);
      if (!Array.isArray(row.versions)) throw new ApiError(502, undefined, "invalid_hq_device_versions");
      return [name, {
        active_users: requireNumber(row.active_users, "device_active_users"),
        active_devices: requireNumber(row.active_devices, "device_active_devices"),
        versions: row.versions.map(parseDeviceVersion),
        browsers: Array.isArray(row.browsers) ? row.browsers.map(parseDeviceBrowser) : undefined,
        first_seen_devices:
          row.first_seen_devices === undefined
            ? undefined
            : requireNumber(row.first_seen_devices, "device_first_seen"),
        push_capable_devices:
          row.push_capable_devices === undefined
            ? undefined
            : requireNumber(row.push_capable_devices, "device_push_capable"),
      }];
    }),
  ) as import("./types.ts").HqDevicesResponse["platforms"];
  if (!Array.isArray(root.rows)) throw new ApiError(502, undefined, "invalid_hq_device_rows");
  return {
    window: requireString(root.window, "device_window"),
    brand: requireString(root.brand, "device_brand"),
    generated_at: requireString(root.generated_at, "device_generated_at"),
    time_zone: requireString(root.time_zone, "device_time_zone"),
    platforms: parsedPlatforms,
    rows: root.rows.map((value) => {
      const row = parseDeviceVersion(value);
      const record = requireRecord(value, "device_row");
      return { ...row, platform: requireString(record.platform, "device_row_platform"), brand: requireString(record.brand, "device_row_brand") };
    }),
  };
}

function parseNotificationChannel(value: unknown): import("./types.ts").HqNotificationChannel {
  const row = requireRecord(value, "notification_channel");
  const channel = row.channel;
  if (channel !== "push" && channel !== "email" && channel !== "sms") {
    throw new ApiError(502, undefined, "invalid_hq_notification_channel");
  }
  if (!Array.isArray(row.provider) || !row.provider.every((entry) => typeof entry === "string")) {
    throw new ApiError(502, undefined, "invalid_hq_notification_providers");
  }
  if (row.delivery_receipts !== "not_captured") {
    throw new ApiError(502, undefined, "invalid_hq_notification_receipts");
  }
  return {
    channel,
    configured: requireBoolean(row.configured, "notification_configured"),
    status: parseHqHealthStatus(row.status),
    provider: row.provider,
    attempted: requireNumber(row.attempted, "notification_attempted"),
    queued: requireNumber(row.queued, "notification_queued"),
    processing: requireNumber(row.processing, "notification_processing"),
    provider_accepted: requireNumber(row.provider_accepted, "notification_provider_accepted"),
    failed: requireNumber(row.failed, "notification_failed"),
    skipped: requireNumber(row.skipped, "notification_skipped"),
    delivery_receipts: "not_captured",
    delivery_rate: nullableNumber(row.delivery_rate, "notification_delivery_rate"),
    failure_rate: nullableNumber(row.failure_rate, "notification_failure_rate"),
    failure_reasons: parseCountMap(row.failure_reasons, "notification_failure_reasons"),
    last_failure_at: nullableString(row.last_failure_at),
    message: requireString(row.message, "notification_message"),
  };
}

export function parseHqNotificationHealth(data: unknown): import("./types.ts").HqNotificationHealthResponse {
  const root = requireRecord(data, "notification_health");
  const channels = requireRecord(root.channels, "notification_channels");
  const names = ["push", "email", "sms"] as const;
  const parsedChannels = Object.fromEntries(names.map((name) => [name, parseNotificationChannel(channels[name])])) as import("./types.ts").HqNotificationHealthResponse["channels"];
  return {
    window: requireString(root.window, "notification_window"),
    brand: requireString(root.brand, "notification_brand"),
    generated_at: requireString(root.generated_at, "notification_generated_at"),
    time_zone: requireString(root.time_zone, "notification_time_zone"),
    channels: parsedChannels,
  };
}

export function parseHqNotificationDeliveries(data: unknown): import("./types.ts").HqNotificationDeliveriesResponse {
  const root = requireRecord(data, "notification_deliveries");
  if (!Array.isArray(root.deliveries)) throw new ApiError(502, undefined, "invalid_hq_notification_deliveries");
  return {
    window: requireString(root.window, "notification_delivery_window"),
    brand: requireString(root.brand, "notification_delivery_brand"),
    generated_at: requireString(root.generated_at, "notification_delivery_generated_at"),
    time_zone: requireString(root.time_zone, "notification_delivery_time_zone"),
    deliveries: root.deliveries.map((value) => {
      const row = requireRecord(value, "notification_delivery");
      return {
        id: requireNumber(row.id, "notification_delivery_id"),
        brand: requireString(row.brand, "notification_delivery_row_brand"),
        created_at: requireString(row.created_at, "notification_delivery_created_at"),
        channel: requireString(row.channel, "notification_delivery_channel"),
        provider: requireString(row.provider, "notification_delivery_provider"),
        status: requireString(row.status, "notification_delivery_status"),
        notification_type: nullableString(row.notification_type),
        attempt_count: requireNumber(row.attempt_count, "notification_delivery_attempts"),
        latency_ms: nullableNumber(row.latency_ms, "notification_delivery_latency"),
        failure_reason: nullableString(row.failure_reason),
        provider_message_id: nullableString(row.provider_message_id),
      };
    }),
  };
}

function parseSystemHealthService(value: unknown): import("./types.ts").HqSystemHealthService {
  const row = requireRecord(value, "system_health_service");
  return {
    status: parseHqHealthStatus(row.status),
    checked_at: requireString(row.checked_at, "system_health_checked_at"),
    latency_ms: nullableNumber(row.latency_ms, "system_health_latency"),
    message: requireString(row.message, "system_health_message"),
    evidence: requireRecord(row.evidence, "system_health_evidence"),
  };
}

export function parseHqSystemHealth(data: unknown): import("./types.ts").HqSystemHealthResponse {
  const root = requireRecord(data, "system_health");
  const services = requireRecord(root.services, "system_health_services");
  const thirdParty = services.third_party;
  if (!Array.isArray(thirdParty)) throw new ApiError(502, undefined, "invalid_hq_third_party_services");
  const releases = requireRecord(root.releases, "system_health_releases");
  return {
    generated_at: requireString(root.generated_at, "system_health_generated_at"),
    brand: requireString(root.brand, "system_health_brand"),
    overall: parseHqHealthStatus(root.overall),
    services: {
      api: parseSystemHealthService(services.api),
      database: parseSystemHealthService(services.database),
      jobs: parseSystemHealthService(services.jobs),
      media_storage: parseSystemHealthService(services.media_storage),
      notifications: parseSystemHealthService(services.notifications),
      third_party: thirdParty.map(parseSystemHealthService),
    },
    releases: {
      hq: releases.hq === null ? null : parseVersionInfo(releases.hq),
      d8n_api: parseVersionInfo(releases.d8n_api),
    },
  };
}

function parseDatabaseBackup(value: unknown): HqDatabaseBackup {
  const row = requireRecord(value, "database_backup");
  if (row.database !== "primary" && row.database !== "queue") {
    throw new ApiError(502, undefined, "invalid_hq_database_backup_database");
  }
  return {
    key: requireString(row.key, "database_backup_key"),
    database: row.database,
    brand: requireString(row.brand, "database_backup_brand"),
    schedule: row.schedule === undefined ? undefined : requireString(row.schedule, "database_backup_schedule"),
    uploaded_at: requireString(row.uploaded_at, "database_backup_uploaded_at"),
    size_bytes: nullableNumber(row.size_bytes, "database_backup_size_bytes"),
    checksum: nullableString(row.checksum),
  };
}

export function parseDatabaseBackups(data: unknown): HqDatabaseBackupsResponse {
  const root = requireRecord(data, "database_backups_response");
  const statuses = ["available", "stale", "partial", "not_configured", "error"] as const;
  if (!statuses.includes(root.status as HqDatabaseBackupsResponse["status"])) {
    throw new ApiError(502, undefined, "invalid_hq_database_backup_status");
  }
  const latest = requireRecord(root.latest, "database_backups_latest");
  const parseNullableBackup = (value: unknown, label: string) => {
    if (value === null) return null;
    if (value === undefined) throw new ApiError(502, undefined, label);
    return parseDatabaseBackup(value);
  };
  if (!Array.isArray(root.recent)) {
    throw new ApiError(502, undefined, "invalid_hq_database_backups_recent");
  }
  return {
    status: root.status as HqDatabaseBackupsResponse["status"],
    generated_at: requireString(root.generated_at, "database_backups_generated_at"),
    bucket: nullableString(root.bucket),
    retention_count: nullableNumber(root.retention_count, "database_backups_retention_count"),
    latest: {
      primary: parseNullableBackup(latest.primary, "invalid_hq_database_backups_primary"),
      queue: parseNullableBackup(latest.queue, "invalid_hq_database_backups_queue"),
    },
    recent: root.recent.map(parseDatabaseBackup),
    last_successful_at: nullableString(root.last_successful_at),
    stale: root.stale === null ? null : requireBoolean(root.stale, "database_backups_stale"),
    message: nullableString(root.message),
  };
}

function parseStageName(value: unknown): HqDiscoveryStageName {
  if (
    value === "visible_active_profiles" ||
    value === "reciprocal_gender_age_distance" ||
    value === "final_eligible_candidates"
  ) {
    return value;
  }
  throw new ApiError(502, undefined, "invalid_hq_discovery_stage");
}

function parseDiscoveryStage(value: unknown): HqDiscoveryStage {
  const row = requireRecord(value, "discovery_stage");
  return {
    stage: parseStageName(row.stage),
    description: requireString(row.description, "stage_description"),
    candidate_count: requireNumber(row.candidate_count, "candidate_count"),
  };
}

function parseDiscoveryDeletedReason(value: unknown): HqDiscoveryDeletedReason {
  if (
    value === null ||
    value === "user_withdrew" ||
    value === "user_undid" ||
    value === "superseded" ||
    value === "unmatched"
  ) {
    return value;
  }
  throw new ApiError(502, undefined, "invalid_hq_discovery_deleted_reason");
}

function parseDiscoveryInteractionEntry(value: unknown): HqDiscoveryInteractionEntry {
  const row = requireRecord(value, "discovery_interaction_entry");
  const profile = requireRecord(row.profile, "discovery_interaction_profile");
  return {
    profile: {
      id: requireString(profile.id, "discovery_interaction_profile_id"),
      display_name: nullableString(profile.display_name),
    },
    active: requireBoolean(row.active, "discovery_interaction_active"),
    interacted_at: nullableString(row.interacted_at),
    deleted_reason: parseDiscoveryDeletedReason(row.deleted_reason ?? null),
  };
}

function parseDiscoveryExclusionBreakdown(value: unknown): Partial<HqDiscoveryExclusionBreakdown> {
  if (value === undefined) return {};
  const row = requireRecord(value, "discovery_exclusion_breakdown");
  const parseList = (entries: unknown): HqDiscoveryInteractionEntry[] | undefined => {
    if (entries === undefined) return undefined;
    if (!Array.isArray(entries)) {
      throw new ApiError(502, undefined, "invalid_hq_discovery_exclusion_list");
    }
    return entries.map(parseDiscoveryInteractionEntry);
  };
  const breakdown: Partial<HqDiscoveryExclusionBreakdown> = {};
  const youLiked = parseList(row.you_liked);
  const passed = parseList(row.passed);
  const matched = parseList(row.matched);
  const blocked = parseList(row.blocked);
  if (youLiked) breakdown.you_liked = youLiked;
  if (passed) breakdown.passed = passed;
  if (matched) breakdown.matched = matched;
  if (blocked) breakdown.blocked = blocked;
  return breakdown;
}

function parseDiscoveryToday(value: unknown): HqDiscoveryToday | null {
  if (value === undefined || value === null) return null;
  const row = requireRecord(value, "discovery_today");
  const introduction = requireRecord(row.introduction, "discovery_today_introduction");
  const explore = requireRecord(row.explore, "discovery_today_explore");
  return {
    introduction: {
      configured: requireBoolean(introduction.configured, "discovery_today_introduction_configured"),
      allocated_count: nullableNumber(introduction.allocated_count, "discovery_today_allocated_count"),
      daily_limit: nullableNumber(introduction.daily_limit, "discovery_today_daily_limit"),
      finalized_at: nullableString(introduction.finalized_at),
    },
    explore: {
      configured: requireBoolean(explore.configured, "discovery_today_explore_configured"),
      available_count: nullableNumber(explore.available_count, "discovery_today_available_count"),
    },
  };
}

export function parseDiscoveryDiagnostic(data: unknown): HqDiscoveryDiagnostic {
  const root = requireRecord(data, "discovery_diagnostic");
  if (!Array.isArray(root.stages)) {
    throw new ApiError(502, undefined, "invalid_hq_discovery_stages");
  }
  return {
    eligible: requireBoolean(root.eligible, "eligible"),
    ineligibility_reason: nullableString(root.ineligibility_reason),
    stages: root.stages.map(parseDiscoveryStage),
    exclusion_breakdown: parseDiscoveryExclusionBreakdown(root.exclusion_breakdown),
    today: parseDiscoveryToday(root.today),
  };
}

function parseDiscoveryHealthBuckets(value: unknown, label: string): HqDiscoveryHealthBuckets {
  const row = requireRecord(value, label);
  const bucketNumber = (key: string) => requireNumber(row[key], `${label}_${key}`);
  return {
    "0": bucketNumber("0"),
    "1-3": bucketNumber("1-3"),
    "4-9": bucketNumber("4-9"),
    "10+": bucketNumber("10+"),
  };
}

function parseDiscoveryHealthMarketSummary(value: unknown): HqDiscoveryHealthMarketSummary {
  const row = requireRecord(value, "discovery_health_market_summary");
  return {
    member_count: requireNumber(row.member_count, "discovery_health_market_member_count"),
    median_reciprocal_pool: nullableNumber(row.median_reciprocal_pool, "discovery_health_market_median_reciprocal_pool"),
    median_available_pool: nullableNumber(row.median_available_pool, "discovery_health_market_median_available_pool"),
    exhausted_member_count: requireNumber(row.exhausted_member_count, "discovery_health_market_exhausted_member_count"),
  };
}

function parseDiscoveryHealthLikelyEmptyMember(value: unknown): HqDiscoveryHealthLikelyEmptyMember {
  const row = requireRecord(value, "discovery_health_likely_empty_member");
  return {
    profile_id: requireString(row.profile_id, "discovery_health_likely_empty_profile_id"),
    market: requireString(row.market, "discovery_health_likely_empty_market"),
    reciprocal_pool: requireNumber(row.reciprocal_pool, "discovery_health_likely_empty_reciprocal_pool"),
  };
}

export function parseDiscoveryHealth(data: unknown): HqDiscoveryHealth {
  const root = requireRecord(data, "discovery_health");
  if (!Array.isArray(root.likely_empty_discovery)) {
    throw new ApiError(502, undefined, "invalid_hq_discovery_health_likely_empty_discovery");
  }
  const byMarket = requireRecord(root.by_market, "discovery_health_by_market");
  return {
    brand: requireString(root.brand, "discovery_health_brand"),
    member_count: requireNumber(root.member_count, "discovery_health_member_count"),
    introduction_configured: requireBoolean(root.introduction_configured, "discovery_health_introduction_configured"),
    explore_configured: requireBoolean(root.explore_configured, "discovery_health_explore_configured"),
    introduction_delivery_buckets: parseDiscoveryHealthBuckets(
      root.introduction_delivery_buckets,
      "discovery_health_introduction_delivery_buckets",
    ),
    explore_availability_buckets: parseDiscoveryHealthBuckets(
      root.explore_availability_buckets,
      "discovery_health_explore_availability_buckets",
    ),
    exhausted_member_count: requireNumber(root.exhausted_member_count, "discovery_health_exhausted_member_count"),
    near_exhausted_member_count: requireNumber(root.near_exhausted_member_count, "discovery_health_near_exhausted_member_count"),
    median_reciprocal_pool: nullableNumber(root.median_reciprocal_pool, "discovery_health_median_reciprocal_pool"),
    median_available_pool: nullableNumber(root.median_available_pool, "discovery_health_median_available_pool"),
    by_market: Object.fromEntries(
      Object.entries(byMarket).map(([market, summary]) => [market, parseDiscoveryHealthMarketSummary(summary)]),
    ),
    likely_empty_discovery: root.likely_empty_discovery.map(parseDiscoveryHealthLikelyEmptyMember),
  };
}

function parseReportStatus(value: unknown): HqReportStatus {
  if (value === "open" || value === "reviewing" || value === "actioned" || value === "dismissed") {
    return value;
  }
  throw new ApiError(502, undefined, "invalid_hq_report_status");
}

function parseReportReason(value: unknown): HqReportReason {
  if (
    value === "inappropriate_content" ||
    value === "harassment" ||
    value === "spam" ||
    value === "fake_profile" ||
    value === "underage" ||
    value === "other" ||
    value === "violence_or_threat" ||
    value === "non_consensual_content" ||
    value === "impersonation"
  ) {
    return value;
  }
  throw new ApiError(502, undefined, "invalid_hq_report_reason");
}

function parseReportTargetType(value: unknown): HqReportTargetType {
  if (
    value === "profile" ||
    value === "message" ||
    value === "profile_media" ||
    value === "hook" ||
    value === "conversation" ||
    value === "private_album" ||
    value === "private_album_item"
  ) {
    return value;
  }
  throw new ApiError(502, undefined, "invalid_hq_report_target");
}

function parseAdminReportParty(value: unknown): HqAdminReportParty {
  if (value === null) return null;
  const row = requireRecord(value, "report_party");
  return {
    id: requireString(row.id, "report_party_id"),
    display_name: nullableString(row.display_name),
  };
}

function parseEvidence(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new ApiError(502, undefined, "invalid_hq_report_evidence");
  }
  return value;
}

function parseAdminReportBody(value: unknown): HqAdminReport {
  const row = requireRecord(value, "admin_report");
  return {
    id: requireNumber(row.id, "admin_report_id"),
    status: parseReportStatus(row.status),
    reason: parseReportReason(row.reason),
    target_type: parseReportTargetType(row.target_type),
    evidence: parseEvidence(row.evidence),
    reporter: parseAdminReportParty(row.reporter),
    reported: parseAdminReportParty(row.reported),
    note: nullableString(row.note),
    resolution_note: nullableString(row.resolution_note),
    reviewed_by_admin_user_id:
      row.reviewed_by_admin_user_id === null
        ? null
        : requireNumber(row.reviewed_by_admin_user_id, "reviewed_by"),
    reviewed_at: nullableString(row.reviewed_at),
    created_at: requireString(row.created_at, "admin_report_created_at"),
    updated_at: requireString(row.updated_at, "admin_report_updated_at"),
  };
}

/** Accepts either a bare AdminReport or `{ report: AdminReport }`. */
export function parseAdminReport(data: unknown): HqAdminReport {
  const root = requireRecord(data, "admin_report_response");
  if ("report" in root) {
    return parseAdminReportBody(root.report);
  }
  return parseAdminReportBody(root);
}

export function parseAdminReportList(data: unknown): HqAdminReportList {
  const root = requireRecord(data, "admin_report_list");
  if (!Array.isArray(root.reports)) {
    throw new ApiError(502, undefined, "invalid_hq_admin_reports");
  }
  return {
    reports: root.reports.map(parseAdminReportBody),
    next_cursor: nullableString(root.next_cursor),
  };
}

function nullableNumber(value: unknown, label: string): number | null {
  if (value === null) return null;
  return requireNumber(value, label);
}

function parseGenderSplit(value: unknown): HqGenderSplit {
  const row = requireRecord(value, "gender_split");
  return {
    woman: requireNumber(row.woman, "gender_woman"),
    man: requireNumber(row.man, "gender_man"),
    other: requireNumber(row.other, "gender_other"),
    unknown: requireNumber(row.unknown, "gender_unknown"),
  };
}

export function parseAnalyticsOverview(data: unknown): HqAnalyticsOverview {
  const root = requireRecord(data, "analytics_overview_response");
  const overview = requireRecord(root.overview, "analytics_overview");
  return {
    brand: requireString(overview.brand, "analytics_brand"),
    generated_at: requireString(overview.generated_at, "analytics_generated_at"),
    time_zone: requireString(overview.time_zone, "analytics_time_zone"),
    signups_today: requireNumber(overview.signups_today, "signups_today"),
    signups_this_week: requireNumber(overview.signups_this_week, "signups_this_week"),
    signups_this_month: requireNumber(overview.signups_this_month, "signups_this_month"),
    active_today: requireNumber(overview.active_today, "active_today"),
    active_7d: requireNumber(overview.active_7d, "active_7d"),
    active_30d: requireNumber(overview.active_30d, "active_30d"),
    gender_split: parseGenderSplit(overview.gender_split),
    total_registered_members: requireNumber(
      overview.total_registered_members,
      "total_registered_members",
    ),
  };
}

export function parseTrustSafetyOverview(data: unknown): HqTrustSafetyOverview {
  const root = requireRecord(data, "trust_safety_overview_response");
  const overview = requireRecord(root.overview, "trust_safety_overview");
  const reports = requireRecord(overview.reports, "trust_safety_reports");
  const enforcements = requireRecord(overview.enforcements, "trust_safety_enforcements");
  if (reports.sla_status !== "not_configured") {
    throw new ApiError(502, undefined, "invalid_hq_sla_status");
  }
  // overdue must stay null when null — never coerce to 0
  const overdue = nullableNumber(reports.overdue, "overdue");
  return {
    brand: requireString(overview.brand, "overview_brand"),
    generated_at: requireString(overview.generated_at, "overview_generated_at"),
    reports: {
      total: requireNumber(reports.total, "reports_total"),
      by_status: parseCountMap(reports.by_status, "by_status"),
      awaiting_decision: requireNumber(reports.awaiting_decision, "awaiting_decision"),
      oldest_open_report_at: nullableString(reports.oldest_open_report_at),
      oldest_open_report_age_seconds: nullableNumber(
        reports.oldest_open_report_age_seconds,
        "oldest_open_age",
      ),
      by_reason: parseCountMap(reports.by_reason, "by_reason"),
      by_target_type: parseCountMap(reports.by_target_type, "by_target_type"),
      sla_status: "not_configured",
      overdue,
    },
    enforcements: {
      total: requireNumber(enforcements.total, "enforcements_total"),
      active: requireNumber(enforcements.active, "enforcements_active"),
    },
  };
}

function parseRepeatOffender(value: unknown): HqRepeatOffender {
  const row = requireRecord(value, "repeat_offender");
  return {
    profile_id: requireString(row.profile_id, "repeat_profile_id"),
    display_name: nullableString(row.display_name),
    member_360_lookup: nullableString(row.member_360_lookup),
    report_count: requireNumber(row.report_count, "report_count"),
    awaiting_decision_count: requireNumber(row.awaiting_decision_count, "awaiting_decision_count"),
    latest_report_at: requireString(row.latest_report_at, "latest_report_at"),
  };
}

export function parseRepeatOffenderList(data: unknown): HqRepeatOffenderList {
  const root = requireRecord(data, "repeat_offender_list");
  if (!Array.isArray(root.repeat_offenders)) {
    throw new ApiError(502, undefined, "invalid_hq_repeat_offenders");
  }
  if (root.minimum_reports !== 2) {
    throw new ApiError(502, undefined, "invalid_hq_minimum_reports");
  }
  return {
    repeat_offenders: root.repeat_offenders.map(parseRepeatOffender),
    minimum_reports: 2,
    truncated: requireBoolean(root.truncated, "truncated"),
  };
}

/** Prefer profile public_id for persistent Member 360 URLs; fall back to original lookup. */
export function memberRouteKey(member: HqMemberSummary, originalLookup: string): string {
  if (member.profile_id) {
    return member.profile_id;
  }
  return originalLookup.trim();
}

export function displayNameForMember(member: HqMember360): string {
  const profile = member.sections.profile;
  if (profile.exists && profile.display_name) {
    return profile.display_name;
  }
  const identity = member.sections.identity;
  const parts = [identity.first_name, identity.last_name].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(" ");
  }
  return member.member.profile_id ?? `User ${member.member.user_id}`;
}

// Kept in lockstep with domains/admin/capabilities.rb (ALL) -- the backend
// is the single authorization vocabulary; this is a mirror, not a second
// source of truth. A capability missing here makes a legitimately
// authorized operator response fail to parse (thrown as invalid_hq_*),
// which the caller cannot distinguish from a real 403 -- so this list must
// stay a superset-safe copy of every string the backend can ever send.
const HQ_CAPABILITIES = new Set<string>([
  "hq.member.sensitive_read",
  "hq.member.security_read",
  "hq.discovery_diagnostics.read",
  "hq.trust_safety.read",
  "hq.private_media.sensitive_read",
  "admin.reports.read",
  "admin.reports.moderate",
  "admin.enforcements.read",
  "admin.enforcements.create",
  "admin.enforcements.reinstate",
  "admin.enforcements.override",
  "admin.enforcements.manage",
  "admin.profile_photos.moderate",
  "admin.realme_verifications.moderate",
  "admin.marketplace.read",
  "admin.marketplace.moderate",
  "admin.trust_adjustments.manage",
  "admin.trust_adjustments.reverse",
  "admin.discovery_restrictions.manage",
  "admin.identity_correction.manage",
  "admin.community.read",
  "admin.community.moderate",
  "admin.operators.read",
  "admin.operators.manage",
  "admin.brand_operations.manage",
  "admin.profile_publication.manage",
  "hq.system.read",
  "hq.analytics.read",
  "hq.security_alerts.read",
  "hq.backups.manage",
]);

const HQ_OPERATOR_ROLES = new Set<string>([
  "founder",
  "super_admin",
  "operations",
  "trust_safety",
  "support",
  "engineering",
  "marketing",
  "analyst",
  "moderator",
]);

const HQ_OPERATOR_STATUSES = new Set<string>(["active", "suspended", "disabled"]);
const HQ_MFA_STATES = new Set<string>(["not_enrolled", "pending", "active"]);

function parseCapabilityList(value: unknown, label: string): HqCapability[] {
  if (!Array.isArray(value)) {
    throw new ApiError(502, undefined, `invalid_hq_${label}`);
  }
  const capabilities: HqCapability[] = [];
  for (const item of value) {
    if (typeof item !== "string") {
      throw new ApiError(502, undefined, `invalid_hq_${label}`);
    }
    // The backend is authoritative and may add a capability before this
    // frontend has a route or control that uses it. Unknown capability names
    // must not make an otherwise valid /operator response unreadable. They
    // are deliberately omitted from the typed set, so the frontend cannot
    // accidentally grant itself access to a new surface; backend endpoints
    // remain the authorization boundary.
    if (!HQ_CAPABILITIES.has(item)) continue;
    if (!capabilities.includes(item as HqCapability)) {
      capabilities.push(item as HqCapability);
    }
  }
  return capabilities;
}

function parseOperatorRole(value: unknown): HqOperatorRole {
  const role = requireString(value, "operator_role");
  if (!HQ_OPERATOR_ROLES.has(role)) {
    throw new ApiError(502, undefined, "invalid_hq_operator_role");
  }
  return role as HqOperatorRole;
}

function parseOperatorStatus(value: unknown): HqOperatorStatus {
  const status = requireString(value, "operator_status");
  if (!HQ_OPERATOR_STATUSES.has(status)) {
    throw new ApiError(502, undefined, "invalid_hq_operator_status");
  }
  return status as HqOperatorStatus;
}

function parseMfaLifecycleState(value: unknown): HqMfaLifecycleState {
  const state = requireString(value, "mfa_state");
  if (!HQ_MFA_STATES.has(state)) {
    throw new ApiError(502, undefined, "invalid_hq_mfa_state");
  }
  return state as HqMfaLifecycleState;
}

function parseMfaState(value: unknown): HqMfaState {
  const row = requireRecord(value, "mfa");
  if (row.required !== true) {
    throw new ApiError(502, undefined, "invalid_hq_mfa_required");
  }
  const recovery = row.recovery_codes_remaining;
  if (recovery !== null && (typeof recovery !== "number" || recovery < 0)) {
    throw new ApiError(502, undefined, "invalid_hq_recovery_codes_remaining");
  }
  return {
    state: parseMfaLifecycleState(row.state),
    required: true,
    verified: requireBoolean(row.verified, "mfa_verified"),
    recovery_codes_remaining: recovery === null ? null : recovery,
  };
}

function parseOperatorAssignment(value: unknown): HqOperatorAssignment {
  const row = requireRecord(value, "operator_assignment");
  return {
    brand: requireString(row.brand, "assignment_brand"),
    role: parseOperatorRole(row.role),
    effective_capabilities: parseCapabilityList(row.effective_capabilities, "assignment_capabilities"),
  };
}

function parseCurrentOperator(value: unknown): HqCurrentOperator {
  const row = requireRecord(value, "operator");
  return {
    admin_user_id: requireNumber(row.admin_user_id, "admin_user_id"),
    user_id: requireNumber(row.user_id, "user_id"),
    status: parseOperatorStatus(row.status),
    current_brand: requireString(row.current_brand, "current_brand"),
    role: parseOperatorRole(row.role),
    effective_capabilities: parseCapabilityList(row.effective_capabilities, "effective_capabilities"),
    grantable_roles: Array.isArray(row.grantable_roles)
      ? row.grantable_roles.map(parseOperatorRole)
      : [],
    brand_assignments: Array.isArray(row.brand_assignments)
      ? row.brand_assignments.map(parseOperatorAssignment)
      : [],
    mfa: parseMfaState(row.mfa),
  };
}

export function parseCurrentOperatorResponse(data: unknown): HqCurrentOperatorResponse {
  const root = requireRecord(data, "current_operator");
  return { operator: parseCurrentOperator(root.operator) };
}

function parseMfaEnrollment(value: unknown): HqMfaEnrollment {
  const row = requireRecord(value, "mfa_enrollment");
  if (row.state !== "pending") {
    throw new ApiError(502, undefined, "invalid_hq_mfa_enrollment_state");
  }
  return {
    state: "pending",
    secret: requireString(row.secret, "mfa_secret"),
    provisioning_uri: requireString(row.provisioning_uri, "mfa_provisioning_uri"),
  };
}

export function parseMfaEnrollmentResponse(data: unknown): HqMfaEnrollmentResponse {
  const root = requireRecord(data, "mfa_enrollment_response");
  return { mfa: parseMfaEnrollment(root.mfa) };
}

export function parseMfaConfirmationResponse(data: unknown): HqMfaConfirmation {
  const root = requireRecord(data, "mfa_confirmation");
  if (!Array.isArray(root.recovery_codes) || root.recovery_codes.length < 8) {
    throw new ApiError(502, undefined, "invalid_hq_recovery_codes");
  }
  const mfa = requireRecord(root.mfa, "mfa_confirmation_state");
  if (mfa.state !== "active" || mfa.verified !== true) {
    throw new ApiError(502, undefined, "invalid_hq_mfa_confirmation_state");
  }
  return {
    mfa: { state: "active", verified: true },
    recovery_codes: root.recovery_codes.map((code) => requireString(code, "recovery_code")),
  };
}

export function parseMfaChallengeResponse(data: unknown): HqMfaChallengeResult {
  const root = requireRecord(data, "mfa_challenge");
  const mfa = requireRecord(root.mfa, "mfa_challenge_state");
  if (mfa.state !== "active" || mfa.verified !== true) {
    throw new ApiError(502, undefined, "invalid_hq_mfa_challenge_state");
  }
  const method = requireString(mfa.method, "mfa_method");
  if (method !== "totp" && method !== "recovery_code") {
    throw new ApiError(502, undefined, "invalid_hq_mfa_method");
  }
  return {
    mfa: {
      state: "active",
      verified: true,
      method,
      recovery_codes_remaining: requireNumber(mfa.recovery_codes_remaining, "recovery_codes_remaining"),
    },
  };
}

function parseProfilePhotoDerivative(value: unknown): HqProfilePhotoDerivative | null {
  if (value === null) return null;
  const row = requireRecord(value, "photo_derivative");
  return {
    content_type: requireString(row.content_type, "photo_content_type"),
    url: requireString(row.url, "photo_url"),
    url_expires_in: requireNumber(row.url_expires_in, "photo_url_expires_in"),
  };
}

function parseProfilePhotoQueueEntry(value: unknown): HqProfilePhotoQueueEntry {
  const row = requireRecord(value, "photo_queue_entry");
  return {
    id: requireString(row.id, "photo_id"),
    profile_id: requireString(row.profile_id, "photo_profile_id"),
    position: requireNumber(row.position, "photo_position"),
    created_at: requireString(row.created_at, "photo_created_at"),
    image: parseProfilePhotoDerivative(row.image),
  };
}

export function parseProfilePhotoQueue(data: unknown): HqProfilePhotoQueue {
  const root = requireRecord(data, "photo_queue");
  if (!Array.isArray(root.photos)) {
    throw new ApiError(502, undefined, "invalid_hq_photo_queue");
  }
  return { photos: root.photos.map(parseProfilePhotoQueueEntry) };
}

function parseProfilePhotoModeration(value: unknown): HqProfilePhotoModeration {
  const row = requireRecord(value, "photo_moderation");
  const status = requireString(row.status, "photo_status");
  if (status !== "approved" && status !== "rejected") {
    throw new ApiError(502, undefined, "invalid_hq_photo_status");
  }
  const visibility = requireString(row.visibility, "photo_visibility");
  if (visibility !== "hidden" && visibility !== "visible") {
    throw new ApiError(502, undefined, "invalid_hq_photo_visibility");
  }
  const processing = requireString(row.processing_state, "photo_processing_state");
  if (
    processing !== "pending" &&
    processing !== "processing" &&
    processing !== "ready" &&
    processing !== "failed"
  ) {
    throw new ApiError(502, undefined, "invalid_hq_photo_processing_state");
  }
  return {
    id: requireString(row.id, "photo_id"),
    profile_id: requireString(row.profile_id, "photo_profile_id"),
    position: requireNumber(row.position, "photo_position"),
    status,
    visibility,
    processing_state: processing,
  };
}

export function parseProfilePhotoModerationResult(data: unknown): HqProfilePhotoModerationResult {
  const root = requireRecord(data, "photo_moderation_result");
  return {
    transitioned: requireBoolean(root.transitioned, "photo_transitioned"),
    photo: parseProfilePhotoModeration(root.photo),
  };
}

function parseCommunitySubmission(value: unknown): HqCommunitySubmission {
  const row = requireRecord(value, "community_submission");
  return {
    id: requireString(row.id, "community_submission_id"),
    type: requireString(row.type, "community_submission_type"),
    status: requireString(row.status, "community_submission_status"),
    submitted_at: requireString(row.submitted_at, "community_submission_submitted_at"),
    content: requireRecord(row.content, "community_submission_content"),
  };
}

export function parseCommunityQueue(data: unknown): HqCommunitySubmission[] {
  const root = requireRecord(data, "community_queue");
  if (!Array.isArray(root.submissions)) {
    throw new ApiError(502, undefined, "invalid_hq_community_queue");
  }
  return root.submissions.map(parseCommunitySubmission);
}

function parseRealmeCheckType(value: unknown): HqRealmeCheckType {
  if (value !== "selfie" && value !== "video" && value !== "government_id") {
    throw new ApiError(502, undefined, "invalid_hq_realme_check_type");
  }
  return value;
}

function parseRealmeEvidence(value: unknown): HqRealmeEvidence | null {
  if (value === null || value === undefined) return null;
  const row = requireRecord(value, "realme_evidence");
  return {
    content_type: requireString(row.content_type, "realme_evidence_content_type"),
    url: requireString(row.url, "realme_evidence_url"),
    url_expires_in: requireNumber(row.url_expires_in, "realme_evidence_url_expires_in"),
  };
}

function parseRealmeReviewContext(value: unknown): HqRealmeReviewContext | null {
  if (value === null || value === undefined) return null;
  const root = requireRecord(value, "realme_review_context");
  const member = requireRecord(root.member, "realme_review_member");
  const photos = Array.isArray(root.profile_photos) ? root.profile_photos : [];
  const history = Array.isArray(root.history) ? root.history : [];
  return {
    member: {
      user_id: requireNumber(member.user_id, "realme_member_user_id"),
      public_id: member.public_id === undefined ? undefined : requireString(member.public_id, "realme_member_public_id"),
      display_name: member.display_name === undefined ? undefined : nullableString(member.display_name),
      first_name: member.first_name === undefined ? undefined : nullableString(member.first_name),
      last_name: member.last_name === undefined ? undefined : nullableString(member.last_name),
      age: member.age === undefined ? undefined : nullableNumber(member.age, "realme_member_age"),
      gender: member.gender === undefined ? undefined : nullableString(member.gender),
      looking_for: Array.isArray(member.looking_for) ? member.looking_for.map((item) => requireString(item, "realme_member_looking_for")) : null,
      location: member.location === undefined ? undefined : nullableString(member.location),
      country_code: member.country_code === undefined ? undefined : nullableString(member.country_code),
      city: member.city === undefined ? undefined : nullableString(member.city),
      brand: member.brand === undefined ? undefined : requireString(member.brand, "realme_member_brand"),
      account_status: requireString(member.account_status, "realme_member_account_status"),
      membership_status: member.membership_status === undefined ? undefined : nullableString(member.membership_status),
      membership_since: member.membership_since === undefined ? undefined : nullableString(member.membership_since),
      joined_at: member.joined_at === undefined ? undefined : nullableString(member.joined_at),
      last_active_at: member.last_active_at === undefined ? undefined : nullableString(member.last_active_at),
      profile_status: member.profile_status === undefined ? undefined : nullableString(member.profile_status),
      profile_visibility: member.profile_visibility === undefined ? undefined : nullableString(member.profile_visibility),
      profile_completeness: member.profile_completeness === undefined ? undefined : nullableNumber(member.profile_completeness, "realme_member_profile_completeness"),
      email_verified: member.email_verified === undefined ? undefined : requireBoolean(member.email_verified, "realme_member_email_verified"),
      realme_status: Array.isArray(member.realme_status) ? member.realme_status.map((entry) => {
        const row = requireRecord(entry, "realme_member_status");
        return { check_type: parseRealmeCheckType(row.check_type), status: requireString(row.status, "realme_member_status_value"), submitted_at: nullableString(row.submitted_at), reviewed_at: nullableString(row.reviewed_at) };
      }) : undefined,
      trust_score: member.trust_score === undefined ? undefined : nullableNumber(member.trust_score, "realme_member_trust_score"),
    },
    profile_photos: photos.map((photo) => {
      const row = requireRecord(photo, "realme_review_photo");
      const status = requireString(row.status, "realme_review_photo_status");
      if (status !== "approved") throw new ApiError(502, undefined, "invalid_hq_realme_review_photo_status");
      const processing = requireString(row.processing_state, "realme_review_photo_processing_state");
      if (!["pending", "processing", "ready", "failed"].includes(processing)) throw new ApiError(502, undefined, "invalid_hq_realme_review_photo_processing_state");
      return { id: requireString(row.id, "realme_review_photo_id"), position: requireNumber(row.position, "realme_review_photo_position"), status: "approved", visibility: requireString(row.visibility, "realme_review_photo_visibility") as "hidden" | "visible", processing_state: processing as "pending" | "processing" | "ready" | "failed", url: row.url === null ? null : requireString(row.url, "realme_review_photo_url"), url_expires_in: requireNumber(row.url_expires_in, "realme_review_photo_expiry") };
    }),
    evidence: parseRealmeEvidence(root.evidence),
    history: history.map((entry) => {
      const row = requireRecord(entry, "realme_review_history");
      return { id: requireNumber(row.id, "realme_history_id"), check_type: parseRealmeCheckType(row.check_type), status: requireString(row.status, "realme_history_status"), submitted_at: nullableString(row.submitted_at), reviewed_at: nullableString(row.reviewed_at), review_note: nullableString(row.review_note), evidence: parseRealmeEvidence(row.evidence) };
    }),
    member_360_lookup: root.member_360_lookup === null ? null : requireString(root.member_360_lookup, "realme_member_360_lookup"),
  };
}

function parseRealmeQueueEntry(value: unknown): HqRealmeQueueEntry {
  const row = requireRecord(value, "realme_queue_entry");
  return {
    id: requireNumber(row.id, "realme_id"),
    user_id: requireNumber(row.user_id, "realme_user_id"),
    check_type: parseRealmeCheckType(row.check_type),
    submitted_at: nullableString(row.submitted_at),
    evidence: parseRealmeEvidence(row.evidence),
    review_context: parseRealmeReviewContext(row.review_context),
  };
}

function parseAttentionBucket(value: unknown, label: string): HqAttentionBucket {
  const row = requireRecord(value, label);
  const result: HqAttentionBucket = { total: requireNumber(row.total, `${label}_total`) };
  for (const [key, item] of Object.entries(row)) {
    if (key !== "total") result[key] = requireNumber(item, `${label}_${key}`);
  }
  return result;
}

export function parseHqAttention(data: unknown): HqAttention {
  const root = requireRecord(data, "attention");
  return {
    brand: requireString(root.brand, "attention_brand"),
    generated_at: requireString(root.generated_at, "attention_generated_at"),
    total: requireNumber(root.total, "attention_total"),
    identity: parseAttentionBucket(root.identity, "attention_identity"),
    moderation: parseAttentionBucket(root.moderation, "attention_moderation"),
    safety: parseAttentionBucket(root.safety, "attention_safety"),
  };
}

export function parseRealmeQueue(data: unknown): HqRealmeQueue {
  const root = requireRecord(data, "realme_queue");
  if (!Array.isArray(root.assertions)) {
    throw new ApiError(502, undefined, "invalid_hq_realme_queue");
  }
  return { assertions: root.assertions.map(parseRealmeQueueEntry) };
}

function parseRealmeModeration(value: unknown): HqRealmeModeration {
  const row = requireRecord(value, "realme_moderation");
  const status = row.status;
  if (
    status !== "approved" &&
    status !== "rejected" &&
    status !== "resubmission_requested" &&
    status !== "pending"
  ) {
    throw new ApiError(502, undefined, "invalid_hq_realme_status");
  }
  return {
    id: requireNumber(row.id, "realme_id"),
    user_id: requireNumber(row.user_id, "realme_user_id"),
    check_type: parseRealmeCheckType(row.check_type),
    status,
    reviewed_at: nullableString(row.reviewed_at),
  };
}

export function parseRealmeModerationResult(data: unknown): HqRealmeModerationResult {
  const root = requireRecord(data, "realme_moderation_result");
  return {
    transitioned: requireBoolean(root.transitioned, "realme_transitioned"),
    assertion: parseRealmeModeration(root.assertion),
  };
}

function parseIdentityCorrectionField(value: unknown): HqIdentityCorrectionField {
  if (value !== "gender" && value !== "interested_in") {
    throw new ApiError(502, undefined, "invalid_hq_identity_correction_field");
  }
  return value;
}

function parseIdentityCorrection(value: unknown): HqIdentityCorrection {
  const row = requireRecord(value, "identity_correction");
  return {
    id: requireNumber(row.id, "identity_correction_id"),
    profile_id: requireString(row.profile_id, "identity_correction_profile_id"),
    field: parseIdentityCorrectionField(row.field),
    previous_value: row.previous_value,
    new_value: row.new_value,
    reason: requireString(row.reason, "identity_correction_reason"),
    note: nullableString(row.note),
    admin_user_id: requireNumber(row.admin_user_id, "identity_correction_admin_user_id"),
    created_at: requireString(row.created_at, "identity_correction_created_at"),
  };
}

export function parseIdentityCorrectionResponse(data: unknown): HqIdentityCorrection {
  const root = requireRecord(data, "identity_correction_response");
  return parseIdentityCorrection(root.correction);
}

function parseManagedOperator(value: unknown): HqManagedOperator {
  const row = requireRecord(value, "managed_operator");
  const assignmentStatus = requireString(row.assignment_status, "assignment_status");
  if (
    assignmentStatus !== "active" &&
    assignmentStatus !== "suspended" &&
    assignmentStatus !== "revoked"
  ) {
    throw new ApiError(502, undefined, "invalid_hq_assignment_status");
  }
  return {
    admin_user_id: requireNumber(row.admin_user_id, "admin_user_id"),
    user_id: requireNumber(row.user_id, "user_id"),
    admin_status: parseOperatorStatus(row.admin_status),
    assignment_status: assignmentStatus,
    role: parseOperatorRole(row.role),
    effective_capabilities: parseCapabilityList(row.effective_capabilities, "operator_capabilities"),
    mfa_enrolled: requireBoolean(row.mfa_enrolled, "mfa_enrolled"),
  };
}

export function parseManagedOperatorResponse(data: unknown): HqManagedOperator {
  const root = requireRecord(data, "managed_operator_response");
  return parseManagedOperator(root.operator);
}

export function parseManagedOperatorList(data: unknown): HqManagedOperator[] {
  const root = requireRecord(data, "managed_operator_list");
  if (!Array.isArray(root.operators)) {
    throw new ApiError(502, undefined, "invalid_hq_operators");
  }
  return root.operators.map(parseManagedOperator);
}

function parseProfileStatus(value: unknown): HqProfileStatus | null {
  if (value === null) return null;
  if (value === "draft" || value === "active" || value === "suspended") {
    return value;
  }
  throw new ApiError(502, undefined, "invalid_hq_profile_status");
}

function parseProfileVisibility(value: unknown): HqProfileVisibility | null {
  if (value === null) return null;
  if (value === "hidden" || value === "visible") {
    return value;
  }
  throw new ApiError(502, undefined, "invalid_hq_profile_visibility");
}

function parseContactVerification(value: unknown): HqMemberDirectoryEntry["contact_verification"] {
  const row = requireRecord(value, "contact_verification");
  return {
    email: requireBoolean(row.email, "contact_verification_email"),
    phone: requireBoolean(row.phone, "contact_verification_phone"),
  };
}

function parseDiscoveryStatus(value: unknown): HqMemberDirectoryEntry["discovery_status"] {
  if (
    value === "visible" ||
    value === "not_visible" ||
    value === "restricted" ||
    value === "draft" ||
    value === "no_profile"
  ) {
    return value;
  }
  throw new ApiError(502, undefined, "invalid_hq_discovery_status");
}

function parseLookingFor(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new ApiError(502, undefined, "invalid_hq_looking_for");
  }
  return value.map((entry) => requireString(entry, "looking_for_entry"));
}

function parseMemberDirectoryEntry(value: unknown): HqMemberDirectoryEntry {
  const row = requireRecord(value, "member_directory_entry");
  return {
    user_id: requireNumber(row.user_id, "member_directory_user_id"),
    profile_id: nullableString(row.profile_id),
    display_name: nullableString(row.display_name),
    email: nullableString(row.email),
    phone: nullableString(row.phone),
    age: nullableNumber(row.age, "member_directory_age"),
    gender: nullableString(row.gender),
    looking_for: parseLookingFor(row.looking_for),
    city: nullableString(row.city),
    country_code: nullableString(row.country_code),
    account_type: requireString(row.account_type, "member_directory_account_type"),
    discovery_status: parseDiscoveryStatus(row.discovery_status),
    user_status: parseUserStatus(row.user_status),
    membership_status: parseMembershipStatus(row.membership_status),
    profile_status: parseProfileStatus(row.profile_status),
    profile_visibility: parseProfileVisibility(row.profile_visibility),
    joined_at: requireString(row.joined_at, "member_directory_joined_at"),
    user_created_at: requireString(row.user_created_at, "member_directory_user_created_at"),
    last_active_at: nullableString(row.last_active_at),
    contact_verification: parseContactVerification(row.contact_verification),
    reports_received_count: requireNumber(row.reports_received_count, "reports_received_count"),
    pending_photo_count: requireNumber(row.pending_photo_count, "pending_photo_count"),
    active_enforcement: requireBoolean(row.active_enforcement, "active_enforcement"),
  };
}

export function parseMemberDirectoryList(data: unknown): HqMemberDirectoryList {
  const root = requireRecord(data, "member_directory_list");
  if (!Array.isArray(root.members)) {
    throw new ApiError(502, undefined, "invalid_hq_member_directory");
  }
  return {
    members: root.members.map(parseMemberDirectoryEntry),
    next_cursor: nullableString(root.next_cursor),
  };
}

function parseMetricStatus(value: unknown): HqMetricStatus {
  if (value === "available" || value === "unavailable" || value === "insufficient_data") {
    return value;
  }
  throw new ApiError(502, undefined, "invalid_hq_metric_status");
}

function parseMetricUnit(value: unknown): HqMetricUnit {
  if (value === null) {
    return null;
  }
  if (value === "count" || value === "ratio" || value === "seconds" || value === "metrics") {
    return value;
  }
  throw new ApiError(502, undefined, "invalid_hq_metric_unit");
}

function parseMetricScalarValue(value: unknown, label: string): number | Record<string, number> {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return parseCountMap(value, label);
  }
  throw new ApiError(502, undefined, "invalid_hq_metric_value");
}

function parseMetricValue(value: unknown): HqMetricValue {
  const row = requireRecord(value, "metric_value");
  const status = parseMetricStatus(row.status);
  const metric: HqMetricValue = {
    metric_id: requireString(row.metric_id, "metric_id"),
    version: requireNumber(row.version, "metric_version"),
    definition: requireString(row.definition, "metric_definition"),
    status,
    unit: parseMetricUnit(row.unit),
    limitations: Array.isArray(row.limitations)
      ? row.limitations.map((item, index) => requireString(item, `metric_limitation_${index}`))
      : [],
  };
  if (status === "available" && row.value !== undefined && row.value !== null) {
    metric.value = parseMetricScalarValue(row.value, "metric_value");
  }
  if (row.numerator !== undefined && row.numerator !== null) {
    metric.numerator = requireNumber(row.numerator, "metric_numerator");
  }
  if (row.denominator !== undefined && row.denominator !== null) {
    metric.denominator = requireNumber(row.denominator, "metric_denominator");
  }
  return metric;
}

function parseMetricWindowMap(value: unknown): Record<string, HqMetricWindow> {
  const row = requireRecord(value, "metric_windows");
  const windows: Record<string, HqMetricWindow> = {};
  for (const [key, entry] of Object.entries(row)) {
    const window = requireRecord(entry, `window_${key}`);
    windows[key] = {
      label: requireString(window.label, `window_label_${key}`),
      start_at: requireString(window.start_at, `window_start_${key}`),
      end_at: requireString(window.end_at, `window_end_${key}`),
    };
  }
  return windows;
}

function parseWindowedMetrics(value: unknown, label: string): Record<string, HqMetricValue> {
  const row = requireRecord(value, label);
  const metrics: Record<string, HqMetricValue> = {};
  for (const [key, entry] of Object.entries(row)) {
    metrics[key] = parseMetricValue(entry);
  }
  return metrics;
}

function parseAttentionSignal(value: unknown): HqAttentionSignal {
  const row = requireRecord(value, "attention_signal");
  const severity = row.severity;
  if (severity !== "info" && severity !== "warning") {
    throw new ApiError(502, undefined, "invalid_hq_attention_severity");
  }
  return {
    signal: requireString(row.signal, "attention_signal_id"),
    severity,
    title: requireString(row.title, "attention_title"),
    reason: requireString(row.reason, "attention_reason"),
    value: requireNumber(row.value, "attention_value"),
    unit: requireString(row.unit, "attention_unit"),
  };
}

export function parseCommandCentreHealth(data: unknown): HqCommandCentreHealth {
  const root = requireRecord(data, "command_centre_health_response");
  const health = requireRecord(root.brand_health, "brand_health");
  return parseCommandCentreHealthPayload(health);
}

function parseCommandCentreHealthPayload(health: Record<string, unknown>): HqCommandCentreHealth {
  const audience = requireRecord(health.audience, "audience");
  const activity = requireRecord(health.activity, "activity");
  const profileHealth = requireRecord(health.profile_health, "profile_health");
  const marketplace = requireRecord(health.marketplace, "marketplace");
  const zeroDiscovery = requireRecord(marketplace.zero_discovery_allocations, "zero_discovery");
  const trustSafety = requireRecord(health.trust_safety, "trust_safety");
  if (!Array.isArray(health.attention_signals)) {
    throw new ApiError(502, undefined, "invalid_hq_attention_signals");
  }
  if (health.time_zone !== "Africa/Johannesburg") {
    throw new ApiError(502, undefined, "invalid_hq_time_zone");
  }

  return {
    brand: requireString(health.brand, "brand_health_brand"),
    generated_at: requireString(health.generated_at, "brand_health_generated_at"),
    time_zone: "Africa/Johannesburg",
    windows: parseMetricWindowMap(health.windows),
    audience: {
      memberships_total: parseMetricValue(audience.memberships_total),
      memberships_new: parseWindowedMetrics(audience.memberships_new, "memberships_new"),
    },
    activity: {
      active_users: parseWindowedMetrics(activity.active_users, "active_users"),
      online_now: parseMetricValue(activity.online_now),
    },
    profile_health: {
      by_status: parseMetricValue(profileHealth.by_status),
      visible_published: parseMetricValue(profileHealth.visible_published),
      activation_ratio: parseMetricValue(profileHealth.activation_ratio),
    },
    marketplace: {
      likes_created: parseWindowedMetrics(marketplace.likes_created, "likes_created"),
      matches_created: parseWindowedMetrics(marketplace.matches_created, "matches_created"),
      conversations_created: parseWindowedMetrics(
        marketplace.conversations_created,
        "conversations_created",
      ),
      zero_discovery_allocations: {
        yesterday: parseMetricValue(zeroDiscovery.yesterday),
        last_7d: parseMetricValue(zeroDiscovery.last_7d),
        last_30d: parseMetricValue(zeroDiscovery.last_30d),
      },
      published_without_likes: parseMetricValue(marketplace.published_without_likes),
      published_without_matches: parseMetricValue(marketplace.published_without_matches),
      time_to_first_like_median: parseMetricValue(marketplace.time_to_first_like_median),
      time_to_first_match_median: parseMetricValue(marketplace.time_to_first_match_median),
      time_to_first_conversation_median: parseMetricValue(
        marketplace.time_to_first_conversation_median,
      ),
    },
    trust_safety: {
      open_reports: parseMetricValue(trustSafety.open_reports),
      awaiting_decision: parseMetricValue(trustSafety.awaiting_decision),
      active_enforcements: parseMetricValue(trustSafety.active_enforcements),
      pending_photo_reviews: parseMetricValue(trustSafety.pending_photo_reviews),
      oldest_open_report_age_seconds: parseMetricValue(trustSafety.oldest_open_report_age_seconds),
    },
    attention_signals: health.attention_signals.map(parseAttentionSignal),
  };
}

function parseCommandCentreBrandEntry(value: unknown): HqCommandCentreBrandEntry {
  const row = requireRecord(value, "brand_entry");
  if (row.accessible !== true) {
    throw new ApiError(502, undefined, "invalid_hq_brand_accessible");
  }
  return {
    brand: requireString(row.brand, "brand_entry_brand"),
    accessible: true,
    role: requireString(row.role, "brand_entry_role"),
    brand_health: parseCommandCentreHealthPayload(requireRecord(row.brand_health, "brand_health")),
  };
}

export function parseCommandCentreBrands(data: unknown): HqCommandCentreBrandsResponse {
  const root = requireRecord(data, "command_centre_brands_response");
  if (!Array.isArray(root.brands)) {
    throw new ApiError(502, undefined, "invalid_hq_brand_list");
  }
  if (root.time_zone !== "Africa/Johannesburg") {
    throw new ApiError(502, undefined, "invalid_hq_time_zone");
  }
  return {
    generated_at: requireString(root.generated_at, "brands_generated_at"),
    time_zone: "Africa/Johannesburg",
    brands: root.brands.map(parseCommandCentreBrandEntry),
  };
}

function parseRegistrationTrendBrand(value: unknown): HqRegistrationTrendBrand {
  const row = requireRecord(value, "registration_trend_brand");
  if (row.status !== "available") {
    throw new ApiError(502, undefined, "invalid_hq_registration_trend_status");
  }
  return {
    brand: requireString(row.brand, "registration_trend_brand_name"),
    status: "available",
    total: requireNumber(row.total, "registration_trend_total"),
    points: parseCountMap(row.points, "registration_trend_points"),
  };
}

export function parseRegistrationTrendResponse(data: unknown): HqRegistrationTrendResponse {
  const root = requireRecord(data, "registration_trends_response");
  if (root.time_zone !== "Africa/Johannesburg") {
    throw new ApiError(502, undefined, "invalid_hq_time_zone");
  }
  if (!Array.isArray(root.brands)) {
    throw new ApiError(502, undefined, "invalid_hq_registration_trends");
  }
  return {
    generated_at: requireString(root.generated_at, "registration_trends_generated_at"),
    time_zone: "Africa/Johannesburg",
    window: requireString(root.window, "registration_trends_window"),
    definition: requireString(root.definition, "registration_trends_definition"),
    brands: root.brands.map(parseRegistrationTrendBrand),
  };
}

function parseProductFunnelStage(value: unknown): HqProductFunnelStage {
  const row = requireRecord(value, "product_funnel_stage");
  const status = parseMetricStatus(row.status);
  if (row.unit !== "members") {
    throw new ApiError(502, undefined, "invalid_hq_product_funnel_unit");
  }
  const numberOrNull = (entry: unknown, label: string): number | null => {
    if (entry === null || entry === undefined) return null;
    return requireNumber(entry, label);
  };
  const stage: HqProductFunnelStage = {
    id: requireString(row.id, "product_funnel_stage_id"),
    definition: requireString(row.definition, "product_funnel_stage_definition"),
    status,
    unit: "members",
    conversion_from_previous: numberOrNull(row.conversion_from_previous, "product_funnel_previous_conversion"),
    conversion_from_registration: numberOrNull(row.conversion_from_registration, "product_funnel_registration_conversion"),
    limitations: Array.isArray(row.limitations)
      ? row.limitations.map((entry, index) => requireString(entry, `product_funnel_limitation_${index}`))
      : [],
  };
  if (status === "available") {
    stage.value = requireNumber(row.value, "product_funnel_stage_value");
  }
  return stage;
}

export function parseProductFunnel(data: unknown): HqProductFunnel {
  const root = requireRecord(data, "product_funnel_response");
  const funnel = requireRecord(root.funnel, "product_funnel");
  if (funnel.time_zone !== "Africa/Johannesburg" || !Array.isArray(funnel.stages)) {
    throw new ApiError(502, undefined, "invalid_hq_product_funnel");
  }
  return {
    brand: requireString(funnel.brand, "product_funnel_brand"),
    window: requireString(funnel.window, "product_funnel_window"),
    generated_at: requireString(funnel.generated_at, "product_funnel_generated_at"),
    time_zone: "Africa/Johannesburg",
    stages: funnel.stages.map(parseProductFunnelStage),
  };
}

function parseProductTrendSeries(value: unknown): HqProductTrendSeries {
  const row = requireRecord(value, "product_trend_series");
  if (row.status !== "available" || row.unit !== "count") {
    throw new ApiError(502, undefined, "invalid_hq_product_trend_series");
  }
  return {
    id: requireString(row.id, "product_trend_series_id"),
    definition: requireString(row.definition, "product_trend_series_definition"),
    status: "available",
    unit: "count",
    limitations: Array.isArray(row.limitations)
      ? row.limitations.map((entry, index) => requireString(entry, `product_trend_limitation_${index}`))
      : [],
    points: parseCountMap(row.points, "product_trend_points"),
  };
}

export function parseProductTrends(data: unknown): HqProductTrends {
  const root = requireRecord(data, "product_trends_response");
  const trends = requireRecord(root.trends, "product_trends");
  if (trends.time_zone !== "Africa/Johannesburg" || !Array.isArray(trends.series)) {
    throw new ApiError(502, undefined, "invalid_hq_product_trends");
  }
  return {
    brand: requireString(trends.brand, "product_trends_brand"),
    window: requireString(trends.window, "product_trends_window"),
    generated_at: requireString(trends.generated_at, "product_trends_generated_at"),
    time_zone: "Africa/Johannesburg",
    series: trends.series.map(parseProductTrendSeries),
  };
}
