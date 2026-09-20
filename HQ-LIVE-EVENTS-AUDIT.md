# D8N HQ — Live / Events: Audit & Plan

Audited against the `date9ja-parity` branch of `d8n` (backend) and current `main` of `d8n-hq` (frontend), 2026-09-20. No code written yet — this is the audit-first deliverable the Live/Events spec asked for.

**Headline finding: D8N already has the event architecture this feature needs.** There are four append-only, brand-scoped event tables in production use (`security_events`, `analytics_events`, `trust_events`, `notification_events`), plus timestamped domain tables for every product action (matches, likes, conversations, reports, enforcements, notifications). Live/Events should be a **read/aggregation layer over these**, not a new event store.

---

## 1. Existing event sources

| Table | Model | Scope | Who writes to it | Fields |
|---|---|---|---|---|
| `security_events` | `SecurityEvent` (`app/models/security_event.rb`) | brand-scoped, optional | Identity (login/MFA/session/password/recovery), Admin (`Admin::OperatorManagement`, `Admin::PublishProfile`, `Admin::RestrictProfileDiscovery`/`LiftProfileDiscoveryRestriction`, `Admin::CorrectProfileIdentity`, `Admin::Mfa::Audit`), `Admin::ModerationAudit`, `Admin::EnforcementAudit`, `Trust::*` (adjustments, reports, RealMe/photo moderation), `Hq::SensitiveReadAudit`, Hooks, HookTonight | `event_type` (string), `severity` (enum: info/warning/high/critical), `ip_address`, `user_agent`, `metadata` (jsonb), `brand_id`, `user_id`, `created_at` |
| `analytics_events` | `AnalyticsEvent` | brand-scoped, append-only (raises on update/destroy) | `Analytics::Emit` — currently only 2 allowlisted types: `member.registered`, `profile.published` | `event_id` (uuid), `event_type`, `occurred_at`, `properties` (jsonb, allowlisted per type), `idempotency_key`, `session_id`, `profile_id` |
| `trust_events` | `TrustEvent` | brand-scoped, append-only, idempotent | `Trust::AwardEvent`, RealMe verification, photo moderation, publication | `event_type`, `points`, `source_type`/`source_id`, `metadata`, `occurred_at` |
| `notification_events` | `NotificationEvent` | brand-scoped | `Notifications::EventPublisher` | `event_type`, `payload`, `processed_at`, `processing_attempts`, `last_error_code` — this **is** the delivery-failure tracking the spec asks for |

**This is effectively D8N's canonical event envelope already**, just split across four tables by domain instead of one. `SecurityEvent` in particular has become the de-facto general-purpose audit log: `Admin::ModerationAudit` and `Admin::EnforcementAudit` are thin wrappers that write operator actions onto it (see `domains/admin/moderation_audit.rb`, `domains/admin/enforcement_audit.rb`) — moderation/enforcement/publication/discovery-restriction/MFA/identity-correction actions all land here with `admin_user_id` in `metadata`, deliberately excluding sensitive text (only `has_reason`/`has_note` booleans, never the reason itself).

`Hq::SensitiveReadAudit` (`domains/hq/sensitive_read_audit.rb`) is the same pattern applied to **reads**: every privileged HQ view (Member 360, security history) writes a `SecurityEvent` with `event_type: "hq.*_viewed"`. It is a subset of the audit trail, not a separate log — Live/Events and the Audit Log both read from `security_events`, filtered differently.

## 2. Sensitive-read audit — confirmed

`Hq::SensitiveReadAudit.record(admin_user:, brand:, event_type:, user:, session:, extra:)` writes to `security_events` with `metadata: { admin_user_id, target_user_id, session_id, ...extra }`. This is operator-**viewed**-PII auditing, distinct from operator-**changed**-something auditing (`Admin::ModerationAudit`/`EnforcementAudit`) — both share the same underlying table, differentiated only by `event_type` prefix.

## 3. Operator/admin action audit trail — exists, on `security_events`

No separate table needed. `domains/admin/moderation_audit.rb` and `domains/admin/enforcement_audit.rb` already give "who did what to whom, when" for: report resolution, enforcement apply/lift, profile publish, discovery restrict/restore, identity correction, MFA changes, operator role management. All queryable via `SecurityEvent.where(brand:, event_type: ...)`.

## 4. Security/auth events — exist, with existing bounded HQ read APIs

- `AuthAttempt` (table `auth_attempts`) — login attempts, `result`, `kind`, `ip_address`. Read API: `Hq::AuthAttemptHistory` (cursor-paginated, brand+user scoped, already wired to Member 360's "Security" data via `recent_auth_attempts`).
- `SecurityEvent` — as above. Read API: `Hq::SecurityEventHistory` (same cursor pattern), backs `recent_security_events`.
- `Session` model backs `activity.online_now` (already implemented this quarter) and has `last_used_at`, `expires_at`, `ip_address`, `admin_mfa_verified_at` — session revocation is a `SecurityEvent` write (`domains/identity/session_revoker.rb`).

Both history services (`domains/hq/auth_attempt_history.rb`, `domains/hq/security_event_history.rb`) are per-member, not cross-member — Live/Events needs a **new, brand-wide (or cross-brand)** variant of the same cursor pattern, not a new data source.

## 5. `fetchHqMemberTimeline` backend — exists, but as inline controller code, not a service

`Api::V1::Hq::MembersController#timeline` (`app/controllers/api/v1/hq/members_controller.rb:171-180`) fans out five queries — `SecurityEvent`, `AuthAttempt`, `AccountEnforcement`, `TrustEvent`, `TrustAdjustment` — each capped at 100, tagged with a `type`/`name`/`created_at`/`metadata` shape, merged, sorted, and truncated to 250. It calls `audit!("hq.member_timeline_viewed")` (a `SensitiveReadAudit` write) on every read.

This is the closest thing to a "unified timeline" already in the codebase, and its per-source-then-merge-then-sort shape is exactly the pattern Live/Events needs at brand scale — but it's hand-rolled in the controller (not a reusable service) and it's missing: matches, likes, conversations, reports, notifications, and deletions. It should become the model for a new `Hq::EventFeed` domain service that both this endpoint and the new Live page call, rather than duplicating the fan-out logic.

## 6. Domain models by category

| Category | Model(s) | Table has `created_at`/brand scope? | Notes |
|---|---|---|---|
| Registration | `User`, `BrandMembership` | Yes | `member.registered` already emitted to `analytics_events` |
| Onboarding | (profile completion fields on `Profile`) | Yes | No discrete "onboarding completed" event yet — would need instrumentation (cheap: emit into `analytics_events`, add to `EventTypes::DEFINITIONS`) |
| Matches | `Match` | Yes, brand-scoped, soft-delete (`deleted_at`) | No event row emitted on creation today — read directly off `matches.created_at` |
| Conversations/Messages | `Conversation`, `Message` | Yes | Message **content** must never enter Live — only need `conversation.created_at` / first-message metadata, no body |
| Likes/Passes | `Like`, `ProfilePass` | Yes | High-volume — spec's "high-volume product events" bucket |
| Reports (Trust & Safety) | `Report` | Yes | `Trust::FileReport` writes it; resolution goes through `Admin::ModerationAudit` → `security_events` |
| RealMe verification | `VerificationAssertion` (not `RealmeVerification` — different name than assumed) | Yes | Verification steps also emit `TrustEvent`/`SecurityEvent` on moderation decisions |
| Trust Score changes | `TrustEvent`, `TrustAdjustment` | Yes, append-only | Already the exact "significant change" event the spec wants — just needs a Live-feed threshold filter |
| Discovery restrictions/enforcement | `AccountEnforcement` | Yes | `Admin::RestrictProfileDiscovery`/`LiftProfileDiscoveryRestriction` write `security_events` alongside |
| Deletions/closures | `AccountClosure` | Yes | `Accounts::CloseAccount`/`DeactivateAccount` write `security_events` too |
| Photo/video moderation | `ProfilePhoto` (+ moderation via `Trust::ModerateProfilePhoto`) | Yes | Decision written to `security_events` |
| Notifications | `Notification`, `NotificationEvent` | Yes | `NotificationEvent.last_error_code`/`processing_attempts` is the delivery-failure signal — already there |
| Background jobs | Solid Queue (`gem "solid_queue"`, `config/recurring.yml`) | — | No ActionCable/Sidekiq. Queue-depth/failed-job visibility would need reading `solid_queue_jobs`/`solid_queue_failed_executions` tables directly (Solid Queue ships these) — not yet wired into HQ |
| Error tracking | **None found.** No Sentry/Honeybadger/Rollbar gem. | — | "API error spike" events in the spec have no backing source today — out of scope for phase 1 unless we add basic error capture first |
| Deployments | **None found.** No deployment-tracking table/gem. | — | Out of scope for phase 1 |

## 7. Cross-brand query pattern — exists, reusable

`Hq::CommandCentre::BrandComparison` (`domains/hq/command_centre/brand_comparison.rb`) is the canonical "All Brands" pattern: iterate `AdminAssignment.kept.active.where(admin_user:)`, filter to brands where the assignment's role has the required capability, call a per-brand service per brand, merge. This is exactly the shape needed for Live/Events' "All Brands" filter and should be reused rather than reinvented.

## 8. Realtime mechanism — none exists yet

No ActionCable (`app/channels/` is empty), no SSE route, no existing polling convention beyond ordinary REST fetch-on-mount (all current HQ panels are request/response). **Recommendation: start with bounded polling** (the spec explicitly permits this) — a cursor-paginated `GET /hq/live/events?since=<cursor>` endpoint polled every ~5-10s from the frontend, using the exact `Cursor`/`next_cursor` pattern already established in `Hq::AuthAttemptHistory`/`Hq::SecurityEventHistory`/`Hq::MemberDirectoryCursor`. This requires zero new backend infrastructure. ActionCable/SSE can be added later without changing the event contract if polling proves too slow.

## 9. Retention — none exists yet

No purge jobs for `security_events`, `analytics_events`, `trust_events`, or `auth_attempts` were found in `config/recurring.yml` (which only has media-upload, rate-limit-counter, and Solid Queue cleanup jobs). Retention policy is undefined today — worth deciding before Live/Events increases read volume on these tables, but not a blocker for phase 1 (read-only feature, doesn't change write volume).

---

## Canonical event contract (proposed — reusing existing shape, not inventing one)

The `MembersController#timeline` action's ad-hoc `{ type, name, created_at, metadata }` shape plus `SecurityEvent`/`AnalyticsEvent`'s existing columns already cover ~90% of the spec's proposed envelope. Rather than adding new columns to four production tables, **normalize at the read layer**:

```
Hq::LiveEvent (plain Data object, not a table)
  event_id        -- source table's PK, prefixed ("sec:123", "match:456")
  event_type      -- e.g. "match.created", "report.submitted"
  category        -- derived from event_type prefix (member/marketplace/safety/security/system)
  occurred_at
  brand
  actor            -- { type: member|operator|system, id }
  subject          -- { type: member|report|match|..., id }
  related_entities  -- array of { type, id }
  severity         -- present only for security/system rows
  source_service   -- "security_events" | "analytics_events" | "trust_events" | "matches" | "reports" | ...
  metadata         -- passthrough from source row's jsonb, or a small derived hash for plain tables
```

This is an in-memory projection built by a new `Hq::EventFeed` service that queries each source table (mirroring `MembersController#timeline`'s fan-out, generalized to brand-wide instead of member-scoped) and merges by `occurred_at`. No new table, no dual-write risk, no migration.

## Proposed Live page UI

Matches the spec closely, scoped to what's real:

- Header: **Live / Events**, brand picker (reusing the single global brand control already shipped), Live/Paused toggle, time-range picker.
- Metrics strip: events/min, online now (real, from `activity.online_now`), registrations today, matches today, reports today — each sourced from data that already exists; omit "errors last hour" until error tracking exists.
- Two-pane layout: event stream (left, majority width) + side panel (brand activity counts, no separate "pulse" chart in phase 1 — reuse `FounderPulseGroupedBarChart` if a chart is wanted later).
- Row → click → detail drawer (not navigation), with "Open Member 360" / "Open Report" deep links using the entity IDs already in `metadata`.
- Pause/resume with a "N new events" badge, using the cursor pattern (buffer newly-polled rows behind the cursor while paused).

## Implementation phases

**Phase 1 (no new backend tables, read-only):**
1. Backend: `Hq::EventFeed` service — brand-scoped fan-out over `SecurityEvent`, `Match`, `Report`, `AccountEnforcement`, `TrustEvent` (the "significant" subset), `AnalyticsEvent` (member.registered, profile.published) — cursor-paginated like the existing history services.
2. Backend: `GET /api/v1/hq/live/events` controller action, reusing `AdminAssignment` cross-brand pattern for "All Brands".
3. Frontend: `/hq/live` route, polling every ~8s, pause/resume, detail drawer, category/severity filters computed client-side from `event_type` prefixes.
4. Command Centre's `FounderLiveActivity` widget switches from raw `SecurityEvent` alerts to the same `Hq::EventFeed` (curated "Live Signals" subset), with a real "View all → /hq/live" link.

**Phase 2 (light instrumentation, still no schema changes):**
5. Add `onboarding.completed`, `conversation.created`, `first_message.sent` to `Analytics::EventTypes::DEFINITIONS` and emit them from the relevant domain services (small additive change, existing table).
6. Likes/passes folded into the feed as a summarized/toggle-off-by-default category (existing tables, just higher volume — cap query window).

**Phase 3 (needs new infrastructure, explicitly deferred):**
7. Error tracking (pick a gem, wire basic capture) before "API error spike" events can be real.
8. Deployment tracking before deployment events can be real.
9. Retention policy per table, once Live/Events read volume is understood.
10. Realtime push (ActionCable/SSE) only if polling proves insufficient at scale.

Nothing here requires a second event architecture, a new append-only table, or duplicating `SecurityEvent`/`AnalyticsEvent`/`TrustEvent`/`NotificationEvent`. The work is: one new read-side service that fans out over what already exists, one new endpoint, and one new page.

---

## 10. Failed registration capture — legacy vs. current, and the real gap

The user asked specifically to see failed registrations with payload + exception, and pointed at legacy Date9ja as the reference. Audited both.

**Legacy `Date9ja` (`Date9ja/api`):** `Api::V1::Auth::RegistrationsController` (Devise-based) caught validation failures on the unsaved `resource` and wrote `AuditLog.record!(kind: :sign_up_failed, metadata: {...})` with the submitted `email`, `reason` (error sentence), `full_name`, `country_of_residence`, `gender`, `looking_for` — i.e. attempted field *values*, classified into a short `validation_error_code` (`underage`, `disposable_email`, `duplicate_email`, `validation_failed`). A comment in `AuditLog` dates this to a 2026-07-24 incident: repeated signup failures on "Country of residence is not included in the list" couldn't be diagnosed because Docker log rotation had already dropped the raw request logs before anyone looked. **It captures validation failures, not exceptions** — there was never a `rescue StandardError` around signup in the legacy app either, so an actual crash (DB error, unhandled nil, etc.) was never captured there. Surfaced via a generic `Admin::AuditLogsController` read endpoint, not a dedicated UI.

**Current `d8n` (`domains/identity/password_registration.rb`):** registration here is identifier+password only — no name/gender/country fields at this step (those come later, during onboarding). `PasswordRegistration#audit` → `Identity::PasswordAudit.record!` already writes both an `AuthAttempt` row and a `SecurityEvent` (`auth.password_registration.failed`) on every failure path: rate-limited, duplicate identifier, invalid password. Metadata captured: `identifier_kind`, `identifier_last4`, `retry_after`. This is already better-scoped than legacy for validation-type failures (structured `result` enum instead of a free-text reason sentence) and reads through the same `Hq::AuthAttemptHistory`/`Hq::SecurityEventHistory` services the rest of Live/Events uses — no new table needed for this part.

**The actual gap, same one legacy never closed either:** `PasswordRegistration#register`/`#create_account` has exactly one `rescue` (`ActiveRecord::RecordNotUnique`, itself just replayed as an ordinary `:registration_unavailable` failure with no exception detail retained). Any other unhandled exception during account creation — `identity_identifiers.create!`, `credentials.create!`, `PasswordEngine.set!`, `BrandMembership.create!`, `Session.issue!`, the `Analytics::Emit`/`Notifications::EventPublisher` calls — propagates straight out, becomes a 500, and leaves **nothing** queryable in HQ: no `AuthAttempt`, no `SecurityEvent`, nothing. This is strictly worse than legacy's gap because legacy at least captured the attempted values for *validation* failures; here even that requires reaching a `PasswordEngine.valid?`/duplicate-identifier check first — a mid-transaction crash produces zero trace.

**Recommended fix (small, additive, no new table):** wrap `register`'s transaction body in a `rescue StandardError => e`, write a `SecurityEvent` (`auth.password_registration.errored`, `severity: :critical`) with `error_class: e.class.name`, `error_message: e.message.truncate(500)`, a truncated backtrace (first ~10 frames), `identifier_kind`, and `identifier_last4` — then re-raise so the request still 500s normally (no swallowing real errors). This is the same shape `Identity::PasswordAudit` already writes, just triggered from a crash instead of a normal failure path, so it flows into `Hq::EventFeed` and Live/Events for free once that service exists. This becomes a Phase 1 item, not deferred — it's cheap and it's explicitly what was asked for.

---

## Visual reference (provided by user)

A reference screenshot (`ChatGPT Image Sep 20, 2026, 02_19_19 PM.png`) sets the look/feel target. Key structural elements to match:

- **Top bar:** brand picker rendered as pills (All Brands / Date9ja / DateZA / HookUs, each with a one-line description), global search, notifications, operator identity — reusing the header shell already shipped.
- **Page header:** "Live / Events" title + green "● LIVE" badge, subtitle, Pause / Export / settings / fullscreen controls.
- **KPI strip:** 6 compact tiles (Events/min with a tiny sparkline, Registrations today, Matches today, Conversations today, Reports today, Errors last hour, Active users last N min) each with a trend delta.
- **Filter row:** brand / time-range / category / severity dropdowns + search + "More filters", all one line.
- **Category tab bar:** "All Events (count)" plus one tab per category (Member/Marketplace/Conversation/Profile/Trust & Safety/Security/System/Operator) each with its own icon and live count — this is the client-side filter computed from `event_type` prefix noted in the event contract above.
- **Event table:** dense rows — colored icon chip, event title (bold), one-line detail/description, brand flag, severity dot+label, relative or absolute time. Row click selects it (highlighted) and opens the drawer; does not navigate away.
- **Detail drawer (right, ~340px):** header with icon/title/event ID/timestamp; tabs **Overview / Context / Related / JSON** (JSON = raw metadata passthrough for engineers); Overview shows subject summary card with "View Member" deep link, then a "Registration Details"/category-specific field list, then "Event Metadata" (category, type, source, environment, correlation ID, IP, user agent); "Actions" row (View Member 360 / View in Audit Log); a "Member Quick Preview" hover card; a "Related Events" list scoped to the same subject with "View all" link.
- **Footer strip:** a 60-minute event-volume bar chart (stacked/colored by category) on the left, an "Events by Category (last hour)" legend-with-counts list on the right.

This maps directly onto the Phase 1 plan above — no new data requirements beyond what's already listed, just the UI shape. Category tab counts and the volume chart both derive from the same `Hq::EventFeed` result client-side (or a lightweight `GET /hq/live/summary` if computing counts client-side over a full page proves wasteful — decide once the endpoint exists).
