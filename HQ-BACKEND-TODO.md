# D8N HQ — Backend TODO (Command Centre shell panels)

Written for whoever picks up backend work on the `d8n` Rails repo. The HQ
frontend (`d8n-hq`) now renders the full Super HQ reference layout —
every panel from the reference image has real UI (charts, tabs, tables),
but panels with no backend source show an honest "needs backend
implementation" state instead of invented numbers. This file is the
verified, per-panel punch list to make those real, ranked by how much of
the data already exists in `d8n` today.

Verified against the `d8n` repo at `/Users/uchechinwaka/pro/d8n` on
2026-09-20 (schema, `domains/hq/`, `config/routes.rb`). File paths and
table/column names below are real, not assumed — check them again before
starting, the schema may have moved on.

**Contract convention:** reuse `Hq::Metrics::MetricValue` (see
`domains/hq/metrics/metric_value.rb`) for any new scalar metric —
`{status: "available"|"unavailable"|"insufficient_data", value, unit,
limitations}`. The frontend's `presentMetric()` already renders all three
states correctly; a new metric in this shape needs zero new frontend
parsing code, just a spot to plug the value into an existing component.
For list/table panels (Recent Errors, Recent Reports, Deletions), a
`{status, rows: [...], next_cursor}` envelope following the existing
`Hq::MemberDirectorySerializer` pagination pattern is the right shape.

---

## Quick wins — data already captured, only needs an HQ service + endpoint

### 1. Devices & Platforms

- **Powers:** Command Centre "Devices & platforms" panel.
- **Data already captured:** `device_registrations` table has `platform`
  (enum), `enabled`, `last_seen_at`, `last_error`, scoped by `brand_id`.
  See `app/models/device_registration.rb` and the schema at
  `db/schema.rb:558`.
- **Work:** new `Hq::CommandCentre::DeviceBreakdown` service — count
  enabled, non-revoked registrations by `platform`, grouped by brand and
  by a "seen in last N days" window (stale tokens skew this if not
  filtered). Expose as `GET /api/v1/hq/command_centre/devices`.
- **Effort:** S (half day). No migration needed.

### 2. Notification Health

- **Powers:** Command Centre "Notification health" panel.
- **Data already captured:** `notification_deliveries` table —
  `channel` (sms/email/push/whatsapp/in_app), `status`
  (pending/sent/failed/skipped/processing), `error_code`, `provider`,
  `brand_id`, `created_at`. See `app/models/notification_delivery.rb`
  and `db/schema.rb:917`.
- **Work:** new `Hq::CommandCentre::NotificationHealth` service —
  delivered % (`sent`) and fail % (`failed`) by channel over the
  selected window, plus top `error_code`s. Expose as
  `GET /api/v1/hq/command_centre/notifications`.
- **Effort:** S (half day). No migration needed.
- **Note:** there's no provider delivery-webhook confirmation distinct
  from "sent" (no `delivered` status) — `sent` means "handed to
  provider," not "confirmed received." Fine as a v1 proxy; flag it as a
  known limitation in the metric's `limitations` array rather than
  silently overclaiming.

### 3. Jobs / Queue + baseline System Health

- **Powers:** Command Centre "System health" panel (partially).
- **Data already captured:** `Infrastructure::Readiness` already checks
  primary DB + SolidQueue connectivity (`domains/infrastructure/readiness.rb`),
  currently only wired to `api/v1/health_controller.rb` (public health
  check), not to HQ. SolidQueue also gives real job failure/backlog data
  for free via `solid_queue_failed_executions`, `solid_queue_jobs`,
  `solid_queue_ready_executions` (`db/queue_schema.rb`).
- **Work:** new `Hq::CommandCentre::SystemHealth` service combining (a)
  `Infrastructure::Readiness.call`, (b) failed job count + oldest
  unclaimed job age from SolidQueue tables. Expose as
  `GET /api/v1/hq/command_centre/system_health`.
- **Effort:** S–M (1 day).
- **Not covered by this quick win:** per-service latency/error-rate
  (R2 media, email/SMS providers, third-party APIs) — nothing currently
  times or records outcomes for those calls. That's a separate,
  larger instrumentation task (wrap outbound calls, e.g. via a shared
  `Infrastructure::ExternalCall.instrument(service:) { ... }` helper that
  records duration + success/failure) — see item 8.

### 4. Retention (D1 / D7 / D30)

- **Powers:** Command Centre "Retention" panel.
- **Data already captured:** registration timestamp
  (`brand_memberships.created_at`) and last activity
  (`sessions.last_used_at`) are both already there — no new columns.
  See `domains/hq/metrics/catalog.rb` (`users.active` already uses
  `Session#last_used_at`).
- **Work:** new `Hq::CommandCentre::Retention` service — for each
  registration cohort date, what fraction had a session with
  `last_used_at` on day 1 / within day 7 / within day 30 of
  registration. This is a real SQL/cohort computation, not new
  instrumentation, but it's non-trivial (cohort windows, brand scoping,
  "not enough elapsed time yet" for recent cohorts → use
  `insufficient_data` status per cohort, not `0`). Expose as
  `GET /api/v1/hq/command_centre/retention`.
- **Effort:** M (1–2 days) — the query and edge cases (partial cohorts)
  take longer than the plumbing.

### 5. Marketplace Pools (reciprocal liquidity)

- **Powers:** Command Centre "Marketplace pools" panel, and the
  Marketplace Funnel pool tabs.
- **Data already captured:** `profiles.gender` and
  `profile_preferences.interested_in` (jsonb array) already capture
  everything needed to bucket members into reciprocal pools (e.g.
  men→women, women→men, men→men, women→women, open). See
  `db/schema.rb:1204` (`profile_preferences`) and the `profiles` table
  (`gender` column at `db/schema.rb:1306`). `likes`, `matches`,
  `conversations` are already counted elsewhere in
  `domains/hq/metrics/catalog.rb`.
- **Work:** new `Hq::CommandCentre::MarketplacePools` service —
  for each pool: active members, reciprocal-eligible supply, match rate,
  conversation rate, scoped by brand + window. This is the least trivial
  "quick win" here — reciprocal matching logic (A interested in B's
  gender AND B interested in A's gender) needs care, and `interested_in`
  being a jsonb array (not a fixed enum) means the pool bucket list
  itself should probably be data-driven, not hardcoded to the 5 labels
  in the current frontend shell. Recommend the service returns whatever
  pools have members > 0, and the frontend renders tabs from that list
  instead of a fixed `POOL_TABS` array (frontend follow-up once this
  ships).
- **Effort:** M–L (2–3 days).

### 6. Recent Reports (list, not just counts)

- **Powers:** Command Centre "Recent reports" row detail; also unblocks
  a real Trust & Safety reports queue view.
- **Data already captured:** `reports` table is fully fleshed out —
  `reason`, `evidence` (jsonb), `status`, `reporter_profile_id`,
  `reported_profile_id`, `reviewed_at`, `resolution_note`. See
  `db/schema.rb:1357`. `domains/hq/trust_safety/overview.rb` only
  returns counts today — there is no `GET .../reports` list endpoint
  under the `hq` namespace yet (checked `config/routes.rb:112-138`).
- **Work:** new `Hq::TrustSafety::ReportQueue` (or similar) + a
  paginated `GET /api/v1/hq/trust_safety/reports` list endpoint,
  following the existing cursor pattern in
  `domains/hq/member_directory_cursor.rb` /
  `domains/hq/member_directory_serializer.rb`.
- **Effort:** S–M (1 day) — the data model is done; this is a
  standard authorized list endpoint.

---

## Needs new capture — schema or instrumentation work first

### 7. Deletions with reason

- **Powers:** Command Centre "Deletions" panel and hero KPI tile;
  Retention & Win-back / Deletion Insights (future dedicated page).
- **Current state:** deletion itself **is** captured —
  `account_closures` table (`db/schema.rb:17`) has `brand_id`,
  `user_id`, `brand_membership_id`, `created_at` — so "deletions per
  day per brand" is answerable today with zero new columns. What's
  **missing** is the reason: `Accounts::CloseAccount.call(user:, brand:)`
  (`domains/accounts/close_account.rb`) takes no `reason` argument at
  all, and `AccountClosure` has no `reason` column.
- **Work:**
  1. Migration: add `reason` (string/enum) and optionally `reason_note`
     (text, for "Other") to `account_closures`.
  2. Update `Accounts::CloseAccount.call` to accept `reason:` and
     persist it — this needs a product-side decision on where the
     reason is collected (deletion confirmation screen on each brand
     frontend) before the backend change is useful.
  3. New `Hq::CommandCentre::Deletions` service (day/brand/reason
     breakdown + trend) and `GET /api/v1/hq/command_centre/deletions`.
- **Effort:** S for the migration + service once the frontend deletion
  flow collects a reason (M–L if that product flow doesn't exist yet on
  the brand apps — check each brand's own account-deletion screen).
- **Do the trend/count part first** (item is already partially a quick
  win — day/brand counts need no migration) and ship reason breakdown
  as a fast-follow once brand apps collect it.

### 8. Online Now / presence

- **Powers:** Command Centre hero KPI "Online now."
- **Current state:** no canonical presence signal.
  `Session#last_used_at` (`db/schema.rb:1409`) updates on authenticated
  request activity — a reasonable **approximation** of presence, not a
  real-time signal. `domains/realtime/member_events.rb` uses
  ActionCable for event broadcast but there's no presence channel
  tracking active socket connections.
- **Two options, pick one deliberately (don't half-do both):**
  - **Option A — cheap, approximate (recommend shipping first):** new
    metric `presence.online_now` = distinct users with
    `Session.active` and `last_used_at` within e.g. the last 5 minutes,
    per brand. Ships in the same PR as item 4 (Retention), reuses the
    same `Session` queries. Must carry an explicit `limitations`
    string ("derived from request activity, not a live connection — a
    5 min idle window") so HQ doesn't imply more precision than it has.
  - **Option B — accurate:** an ActionCable presence channel (Redis-
    backed) that brand frontends connect to while foregrounded, giving
    true online/offline. Real product work on every brand frontend,
    not just backend — scope this only if Option A proves insufficient.
- **Effort:** Option A = S (half day, bundle with item 4). Option B = L
  (multi-day, cross-repo).

### 9. Recent Errors

- **Powers:** Command Centre "Recent errors" panel; future `/hq/errors`
  page.
- **Current state:** nothing. No error-tracking gem (`grep`ped
  `Gemfile` for Sentry/Honeybadger/Rollbar/Bugsnag/AppSignal — none),
  no internal exception log table in `db/schema.rb`. Errors currently
  only exist in Rails logs.
- **Two options:**
  - **Option A — fastest to a working panel:** add a hosted error
    tracker (Sentry is the common Rails choice) and have HQ's backend
    proxy/cache its API (group, count, first/last seen, affected
    service) rather than rebuilding error grouping from scratch. Needs
    an account/API key decision — a product/infra call, not just code.
  - **Option B — self-hosted:** new `error_events` table +
    `Rails.application.config.exceptions_app` / a
    `rescue_from StandardError` hook in `ApplicationController` (plus
    background-job failure capture from SolidQueue) that records
    fingerprint, service, message (sanitized — never persist request
    bodies/tokens), occurrence count, first/last seen. More control,
    more to build and maintain.
- **Effort:** Option A = M (1–2 days integration + the account
  decision). Option B = L (3–5 days: capture, grouping/fingerprinting,
  storage, HQ endpoint).
- **Recommendation:** Option A unless there's a reason to avoid a
  third-party dependency — error grouping/fingerprinting is a solved
  problem not worth re-solving in-house for a first version.

### 10. Live Activity — unified operational event stream

- **Powers:** Command Centre "Live activity" panel (today it only shows
  security events — real but narrow); future `/hq/live`.
- **Current state:** `domains/hq/security_event_history.rb` /
  `SecurityEvent` model is the only thing feeding HQ's activity feed
  today. `notification_events` (`db/schema.rb:949`) is a related but
  notification-specific event log, not a general envelope. There is no
  shared "record this operationally-interesting thing happened" call
  used across registration, matching, messaging, moderation, deletion,
  etc.
- **Work:** define a canonical event envelope (event_type, brand_id,
  user_id/profile_id, occurred_at, payload jsonb — modeled closely on
  `SecurityEvent`'s existing shape, which HQ already knows how to
  serialize) and thread a call to record it through each domain
  service that should emit one: registration (`Identity::...`),
  onboarding completion, publication (`profile_publications`), like/
  match/conversation creation (`domains/matching`,
  `domains/messaging`), moderation decisions
  (`domains/trust_safety` — verify exact path), `Accounts::CloseAccount`
  (deletion), RealMe completion. Expose as
  `GET /api/v1/hq/command_centre/events` with the same filters
  (brand/type/severity/time) as `security_alerts#index` already
  supports.
- **Effort:** L–XL (this is cross-cutting — touches most domains, one
  call each, but there are many call sites and it needs care not to
  put anything sensitive in the shared `payload`). Recommend doing this
  incrementally: pick the 3–4 highest-value event types first
  (registration, match, deletion, moderation decision) rather than all
  at once.

---

## Suggested order

1. Devices & Platforms, Notification Health, Jobs/Queue basics, Recent
   Reports list — all quick wins, no migrations, ship this week.
2. Retention + Online Now (Option A) — bundle together, same `Session`
   queries, ~2 days.
3. Marketplace Pools — needs care on the reciprocal-matching logic;
   budget 2–3 days.
4. Deletions trend (day/brand, no reason yet) — ships alongside #1,
   it's also a no-migration quick win. Deletion *reason* is a
   fast-follow once a brand frontend collects it.
5. Recent Errors (Sentry integration, Option A) — needs an account/infra
   decision before code starts.
6. Live Activity unified envelope — biggest lift, do incrementally,
   last.

Each item above should land as: migration (if any) → domain service
under `domains/hq/command_centre/` → controller action under
`app/controllers/api/v1/hq/` → route in `config/routes.rb` → response
using the `Hq::Metrics::MetricValue` or cursor-list envelope so the
`d8n-hq` frontend changes are additive (pass real data into the
existing panel components) rather than a rebuild.
