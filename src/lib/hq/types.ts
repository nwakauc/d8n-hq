/**
 * D8N HQ Phase 1 types — aligned with docs/api/openapi.yaml (tag: Hq).
 * Do not invent fields the contract does not define.
 */

export type HqMembershipStatus = "active" | "suspended" | "left" | "deactivated";
export type HqUserStatus = "active" | "suspended" | "closed";

export type HqMemberSummary = {
  user_id: number;
  profile_id: string | null;
  brand: string;
  membership_status: HqMembershipStatus;
};

export type HqProfileStatus = "draft" | "active" | "suspended";
export type HqProfileVisibility = "hidden" | "visible";

export type HqMemberDirectorySort = "newest" | "oldest" | "recently_active";
export type HqMemberDirectoryContactVerification = "any" | "verified" | "unverified";
export type HqMemberDirectoryEnforcementFilter = "any" | "active" | "none";

export type HqMemberDirectoryContactVerificationState = {
  email: boolean;
  phone: boolean;
};

/** Safe operational row from GET /api/v1/hq/members — not full Member 360. */
export type HqMemberDirectoryEntry = {
  user_id: number;
  profile_id: string | null;
  display_name: string | null;
  user_status: HqUserStatus;
  membership_status: HqMembershipStatus;
  profile_status: HqProfileStatus | null;
  profile_visibility: HqProfileVisibility | null;
  joined_at: string;
  user_created_at: string;
  last_active_at: string | null;
  contact_verification: HqMemberDirectoryContactVerificationState;
  reports_received_count: number;
  pending_photo_count: number;
  active_enforcement: boolean;
};

export type HqMemberDirectoryList = {
  members: HqMemberDirectoryEntry[];
  next_cursor: string | null;
};

export type HqMemberDirectoryParams = {
  search?: string | null;
  status?: HqMembershipStatus | null;
  profile_status?: HqProfileStatus | null;
  profile_visibility?: HqProfileVisibility | null;
  contact_verification?: HqMemberDirectoryContactVerification | null;
  enforcement?: HqMemberDirectoryEnforcementFilter | null;
  created_from?: string | null;
  created_to?: string | null;
  last_active_from?: string | null;
  last_active_to?: string | null;
  sort?: HqMemberDirectorySort | null;
  cursor?: string | null;
  limit?: number;
};

export type HqIdentifier = {
  kind: "email" | "phone";
  value: string;
  verified_at: string | null;
  last_seen_at: string | null;
};

export type HqSession = {
  device_name: string | null;
  ip_address: string | null;
  last_used_at: string;
  expires_at: string;
  revoked_at: string | null;
};

export type HqIdentitySection = {
  user_id: number;
  user_status: HqUserStatus;
  first_name: string | null;
  last_name: string | null;
  user_created_at: string;
  membership_status: HqMembershipStatus;
  member_since: string;
  identifiers: HqIdentifier[];
  recent_sessions: HqSession[];
};

export type HqProfilePhoto = {
  id: string;
  position: number;
  status: "pending_review" | "approved" | "rejected";
  visibility: "hidden" | "visible";
  processing_state: "pending" | "processing" | "ready" | "failed";
};

export type HqProfilePreference = {
  min_age: number | null;
  max_age: number | null;
  max_distance_km: number | null;
  relationship_intent: string | null;
  interested_in: string[];
  country: string | null;
};

/** When exists === false, every other property is absent (not null). */
export type HqProfileSection =
  | { exists: false }
  | {
      exists: true;
      public_id: string;
      display_name: string | null;
      status: "draft" | "active" | "suspended";
      visibility: "hidden" | "visible";
      gender: string | null;
      birthdate: string | null;
      country_code: string | null;
      city: string | null;
      created_at: string;
      onboarding_state:
        | "profile_required"
        | "profile_incomplete"
        | "ready_to_publish"
        | "complete"
        | "profile_suspended";
      onboarding_next_step: string | null;
      onboarding_completion_percent: number;
      photo_count: number;
      photos: HqProfilePhoto[];
      preference: HqProfilePreference | null;
    };

export type HqConversationSummary = {
  id: string;
  status: "active" | "closed";
  created_at: string;
};

export type HqProductSection = {
  likes_given: number;
  likes_received: number;
  matches_active: number;
  hooks_sent: number;
  hooks_received: number;
  hooks_live_sent: number;
  hooks_live_received: number;
  hook_tonight_live: boolean;
  conversations_count: number;
  recent_conversations: HqConversationSummary[];
  blocks_given: number;
  blocks_received: number;
};

export type HqDelivery = {
  channel: "sms" | "email" | "push" | "whatsapp" | "in_app";
  status: "pending" | "sent" | "failed" | "skipped" | "processing";
  provider: string;
  sent_at: string | null;
  failed_at: string | null;
  error_code: string | null;
  created_at: string;
};

export type HqCommsSection = {
  delivery_counts_by_status: Record<string, number>;
  delivery_counts_by_channel: Record<string, number>;
  recent_deliveries: HqDelivery[];
};

export type HqAdminEnforcement = {
  id: number;
  kind: HqEnforcementKind;
  state: "active" | "reverted";
  profile_id: string | null;
  reason: string | null;
  note: string | null;
  report_id: number | null;
  admin_user_id: number;
  reverted_by_admin_user_id: number | null;
  created_at: string;
  reverted_at: string | null;
};

export type HqEnforcementKind = "suspension" | "ban";

export type HqRecentReport = {
  id: number;
  status: "open" | "reviewing" | "actioned" | "dismissed";
  reason: string;
  target_type: "profile" | "message" | "profile_media" | "hook" | "conversation";
  direction: "filed" | "received";
  created_at: string;
};

export type HqAccountClosure = {
  media_purge_state: "pending" | "completed" | "failed";
  created_at: string;
};

export type HqSafetySection = {
  reports_filed_count: number;
  reports_received_count: number;
  recent_reports: HqRecentReport[];
  active_enforcement: HqAdminEnforcement | null;
  enforcement_count: number;
  account_closure: HqAccountClosure | null;
};

export type HqAuthAttemptKind =
  | "password"
  | "email_otp"
  | "phone_otp"
  | "oauth"
  | "webauthn"
  | "recovery_code";

export type HqAuthAttemptResult = "succeeded" | "failed" | "throttled" | "locked";

export type HqRecentAuthAttempt = {
  kind: HqAuthAttemptKind;
  result: HqAuthAttemptResult;
  ip_address: string | null;
  created_at: string;
};

export type HqSecuritySeverity = "info" | "warning" | "high" | "critical";

export type HqRecentSecurityEvent = {
  event_type: string;
  severity: HqSecuritySeverity;
  created_at: string;
};

export type HqActivitySection = {
  last_login_at: string | null;
  recent_auth_attempts: HqRecentAuthAttempt[];
  recent_security_events: HqRecentSecurityEvent[];
};

export type HqMember360 = {
  member: HqMemberSummary;
  sections: {
    identity: HqIdentitySection;
    profile: HqProfileSection;
    product: HqProductSection;
    comms: HqCommsSection;
    safety: HqSafetySection;
    activity: HqActivitySection;
  };
};

export type HqSecurityEvent = {
  id: number;
  event_type: string;
  severity: HqSecuritySeverity;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
};

export type HqSecurityEventList = {
  security_events: HqSecurityEvent[];
  next_cursor: string | null;
};

export type HqAuthAttempt = {
  id: number;
  kind: HqAuthAttemptKind;
  result: HqAuthAttemptResult;
  identifier: string;
  ip_address: string | null;
  created_at: string;
};

export type HqAuthAttemptList = {
  auth_attempts: HqAuthAttempt[];
  next_cursor: string | null;
};

export type HqEnforcementList = {
  enforcements: HqAdminEnforcement[];
  next_cursor: string | null;
};

export type HqDiscoveryStageName =
  | "visible_active_profiles"
  | "reciprocal_gender_age_distance"
  | "final_eligible_candidates";

export type HqDiscoveryStage = {
  stage: HqDiscoveryStageName;
  description: string;
  candidate_count: number;
};

export type HqDiscoveryDiagnostic = {
  eligible: boolean;
  ineligibility_reason: string | null;
  stages: HqDiscoveryStage[];
};

export type HqHistoryParams = {
  cursor?: string | null;
  limit?: number;
};

/** Phase 2 Trust & Safety */

export type HqReportStatus = "open" | "reviewing" | "actioned" | "dismissed";

export type HqReportReason =
  | "inappropriate_content"
  | "harassment"
  | "spam"
  | "fake_profile"
  | "underage"
  | "other"
  | "violence_or_threat"
  | "non_consensual_content"
  | "impersonation";

export type HqReportTargetType =
  | "profile"
  | "message"
  | "profile_media"
  | "hook"
  | "conversation";

export type HqAdminReportParty = {
  id: string;
  display_name: string | null;
} | null;

export type HqAdminReport = {
  id: number;
  status: HqReportStatus;
  reason: HqReportReason;
  target_type: HqReportTargetType;
  evidence: Record<string, unknown>;
  reporter: HqAdminReportParty;
  reported: HqAdminReportParty;
  note: string | null;
  resolution_note: string | null;
  reviewed_by_admin_user_id: number | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type HqAdminReportList = {
  reports: HqAdminReport[];
  next_cursor: string | null;
};

export type HqGenderSplit = {
  woman: number;
  man: number;
  other: number;
  unknown: number;
};

/** Brand-scoped growth snapshot from GET /api/v1/hq/analytics/overview. */
export type HqAnalyticsOverview = {
  brand: string;
  generated_at: string;
  time_zone: string;
  signups_today: number;
  signups_this_week: number;
  signups_this_month: number;
  active_today: number;
  active_7d: number;
  active_30d: number;
  gender_split: HqGenderSplit;
  total_registered_members: number;
};

export type HqTrustSafetyOverview = {
  brand: string;
  generated_at: string;
  reports: {
    total: number;
    by_status: Record<string, number>;
    awaiting_decision: number;
    oldest_open_report_at: string | null;
    oldest_open_report_age_seconds: number | null;
    by_reason: Record<string, number>;
    by_target_type: Record<string, number>;
    sla_status: "not_configured";
    /** Null until an approved SLA exists — never coerce to 0. */
    overdue: number | null;
  };
  enforcements: {
    total: number;
    active: number;
  };
};

export type HqRepeatOffender = {
  profile_id: string;
  display_name: string | null;
  member_360_lookup: string | null;
  report_count: number;
  awaiting_decision_count: number;
  latest_report_at: string;
};

export type HqRepeatOffenderList = {
  repeat_offenders: HqRepeatOffender[];
  minimum_reports: 2;
  truncated: boolean;
};

export type HqTrustSafetyEnforcementParams = {
  state?: "active" | "reverted" | null;
  cursor?: string | null;
  limit?: number;
};

export type HqAdminReportListParams = {
  status?: HqReportStatus | null;
  cursor?: string | null;
  limit?: number;
};

export type HqUpdateReportBody = {
  status: "reviewing" | "actioned" | "dismissed" | "open";
  note?: string | null;
};

export type HqSuspendProfileBody = {
  reason?: string | null;
  note?: string | null;
  report_id?: number | null;
};

export type HqBanProfileBody = {
  reason: string;
  note?: string | null;
  report_id?: number | null;
};

/** Warning/high/critical security events from GET /api/v1/hq/security_alerts. */
export type HqSecurityAlertList = {
  alerts: HqSecurityEvent[];
};

/** Public release identity from GET /api/v1/version (no session required). */
export type HqVersionInfo = {
  app: "d8n";
  git_sha: string | null;
  release: string | null;
  image_version: string | null;
  environment: string;
  rails_environment: string;
  build_timestamp: string | null;
  booted_at: string;
};

/** Authoritative HQ permissions — never infer from role labels. */
export type HqCapability =
  | "hq.member.sensitive_read"
  | "hq.member.security_read"
  | "hq.discovery_diagnostics.read"
  | "hq.trust_safety.read"
  | "admin.reports.read"
  | "admin.reports.moderate"
  | "admin.enforcements.read"
  | "admin.enforcements.create"
  | "admin.enforcements.reinstate"
  | "admin.enforcements.override"
  /** @deprecated legacy umbrella — prefer granular enforcement capabilities */
  | "admin.enforcements.manage"
  | "admin.profile_photos.moderate"
  | "admin.operators.read"
  | "admin.operators.manage"
  | "admin.brand_operations.manage"
  | "hq.system.read"
  | "hq.analytics.read"
  | "hq.security_alerts.read";

export type HqOperatorRole =
  | "founder"
  | "super_admin"
  | "operations"
  | "trust_safety"
  | "support"
  | "engineering"
  | "marketing"
  | "analyst"
  | "moderator";

export type HqOperatorStatus = "active" | "suspended" | "disabled";

export type HqMfaLifecycleState = "not_enrolled" | "pending" | "active";

export type HqMfaState = {
  state: HqMfaLifecycleState;
  required: true;
  verified: boolean;
  recovery_codes_remaining: number | null;
};

export type HqOperatorAssignment = {
  brand: string;
  role: HqOperatorRole;
  effective_capabilities: HqCapability[];
};

export type HqCurrentOperator = {
  admin_user_id: number;
  user_id: number;
  status: HqOperatorStatus;
  current_brand: string;
  role: HqOperatorRole;
  effective_capabilities: HqCapability[];
  grantable_roles: HqOperatorRole[];
  brand_assignments: HqOperatorAssignment[];
  mfa: HqMfaState;
};

export type HqCurrentOperatorResponse = {
  operator: HqCurrentOperator;
};

export type HqMfaEnrollment = {
  state: "pending";
  secret: string;
  provisioning_uri: string;
};

export type HqMfaEnrollmentResponse = {
  mfa: HqMfaEnrollment;
};

export type HqMfaConfirmation = {
  mfa: {
    state: "active";
    verified: true;
  };
  recovery_codes: string[];
};

export type HqMfaChallengeResult = {
  mfa: {
    state: "active";
    verified: true;
    method: "totp" | "recovery_code";
    recovery_codes_remaining: number;
  };
};

export type HqProfilePhotoDerivative = {
  content_type: string;
  url: string;
  url_expires_in: number;
};

export type HqProfilePhotoQueueEntry = {
  id: string;
  profile_id: string;
  position: number;
  created_at: string;
  image: HqProfilePhotoDerivative | null;
};

export type HqProfilePhotoQueue = {
  photos: HqProfilePhotoQueueEntry[];
};

export type HqProfilePhotoModeration = {
  id: string;
  profile_id: string;
  position: number;
  status: "approved" | "rejected";
  visibility: "hidden" | "visible";
  processing_state: "pending" | "processing" | "ready" | "failed";
};

export type HqProfilePhotoModerationResult = {
  transitioned: boolean;
  photo: HqProfilePhotoModeration;
};

export type HqManagedOperator = {
  admin_user_id: number;
  user_id: number;
  admin_status: HqOperatorStatus;
  assignment_status: "active" | "suspended" | "revoked";
  role: HqOperatorRole;
  effective_capabilities: HqCapability[];
  mfa_enrolled: boolean;
};

export type HqCreateOperatorBody = {
  email: string;
  role: HqOperatorRole;
};

export type HqUpdateOperatorBody = {
  role?: HqOperatorRole;
  status?: "active" | "suspended" | "revoked";
};

/** Canonical HQ metric status from Command Centre APIs. */
export type HqMetricStatus = "available" | "unavailable" | "insufficient_data";

export type HqMetricUnit = "count" | "ratio" | "seconds" | "metrics" | null;

/** Typed metric payload — value is present only when status is available. */
export type HqMetricValue = {
  metric_id: string;
  version: number;
  definition: string;
  status: HqMetricStatus;
  unit: HqMetricUnit;
  limitations: string[];
  /** Scalar count/ratio/seconds, or status map for profiles.by_status. */
  value?: number | Record<string, number>;
  numerator?: number;
  denominator?: number;
};

export type HqMetricWindow = {
  label: string;
  start_at: string;
  end_at: string;
};

export type HqAttentionSignal = {
  signal: string;
  severity: "info" | "warning";
  title: string;
  reason: string;
  value: number;
  unit: string;
};

/** Founder Command Centre brand health snapshot from GET /api/v1/hq/command_centre/health. */
export type HqCommandCentreHealth = {
  brand: string;
  generated_at: string;
  time_zone: "Africa/Johannesburg";
  windows: Record<string, HqMetricWindow>;
  audience: {
    memberships_total: HqMetricValue;
    memberships_new: Record<string, HqMetricValue>;
  };
  activity: {
    active_users: Record<string, HqMetricValue>;
  };
  profile_health: {
    by_status: HqMetricValue;
    visible_published: HqMetricValue;
    activation_ratio: HqMetricValue;
  };
  marketplace: {
    likes_created: Record<string, HqMetricValue>;
    matches_created: Record<string, HqMetricValue>;
    conversations_created: Record<string, HqMetricValue>;
    zero_discovery_allocations: {
      yesterday: HqMetricValue;
      last_7d: HqMetricValue;
      last_30d: HqMetricValue;
    };
    published_without_likes: HqMetricValue;
    published_without_matches: HqMetricValue;
    time_to_first_like_median: HqMetricValue;
    time_to_first_match_median: HqMetricValue;
    time_to_first_conversation_median: HqMetricValue;
  };
  trust_safety: {
    open_reports: HqMetricValue;
    awaiting_decision: HqMetricValue;
    active_enforcements: HqMetricValue;
    pending_photo_reviews: HqMetricValue;
    oldest_open_report_age_seconds: HqMetricValue;
  };
  attention_signals: HqAttentionSignal[];
};

export type HqCommandCentreHealthResponse = {
  brand_health: HqCommandCentreHealth;
};

export type HqCommandCentreBrandEntry = {
  brand: string;
  accessible: true;
  role: string;
  brand_health: HqCommandCentreHealth;
};

export type HqCommandCentreBrandsResponse = {
  generated_at: string;
  time_zone: "Africa/Johannesburg";
  brands: HqCommandCentreBrandEntry[];
};
