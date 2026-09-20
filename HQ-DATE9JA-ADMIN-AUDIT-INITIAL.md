# D8N HQ / Date9ja legacy admin audit — initial ledger

Audit date: 2026-09-19  
Scope: `/Users/uchechinwaka/pro/Date9ja` legacy Rails/API + web admin, `/Users/uchechinwaka/pro/d8n` D8N API, and this HQ frontend.

Status means an operator workflow is reachable and usable from HQ. A model, route, or backend-only endpoint is not counted as complete.

## Current HQ surface

Live frontend routes are defined in `src/App.tsx`: command centre, members, Member 360, security alerts, Trust & Safety, report detail, photo moderation, RealMe moderation, and operator security. The routes for product, marketplace, growth, customers, engineering, brands, admin, audit, intelligence and briefings render `UnavailableHqPage`.

Live HQ API/controller evidence:

- `app/controllers/api/v1/hq/command_centre_controller.rb`: health and brand comparison.
- `app/controllers/api/v1/hq/members_controller.rb`: directory, Member 360, security events, auth attempts, enforcements, timeline and discovery diagnostics.
- `domains/hq/member360/load.rb`: identity/profile/product/conversations/comms/safety/activity assembly.
- `app/controllers/api/v1/hq/trust_safety_controller.rb`: overview, repeat offenders and enforcement history.
- `app/controllers/api/v1/hq/operator_sessions_controller.rb` and `src/features/hq/pages/OperatorSecurityPage.tsx`: operator session inspection/revocation.
- Existing operational mutations are consumed from `/api/v1/admin/*` by `src/lib/hq/api.ts` (reports, enforcement, photos, RealMe, identity correction, discovery restriction, trust adjustment).

## Parity matrix (first pass)

| Legacy capability | Legacy location | D8N/HQ equivalent | Status | Gap / recommendation |
|---|---|---|---|---|
| Admin authentication and admin MFA | `api/config/routes.rb` admin namespace; `api/app/controllers/api/v1/admin/base_controller.rb#require_admin!` | HQ cookie login/session in `d8n/app/controllers/api/v1/hq/auth_controller.rb`; MFA gate in `hq/base_controller.rb` | PARTIAL | Secure operator session is now present, but trusted devices/step-up policy and operator UI are still limited. |
| User/member directory | `web/src/pages/AdminPage.js` users section; `api/.../admin/users_controller.rb#index` | `src/features/hq/pages/MemberSearchPage.tsx`; `domains/hq/member_directory.rb` | PARTIAL | HQ supports search, membership/profile/visibility/contact/enforcement/date filters, but not all legacy filters such as seed/type, gender/orientation and deletion-reason filters. |
| Member identity/profile inspection | `AdminPage.js` expanded user row; `Admin::UserSummarySerializer` | `Member360Page.tsx`; `domains/hq/member360/load.rb` | PARTIAL | HQ is richer and brand-aware, but several configured fields are read-only and no complete profile correction workflow exists. |
| Gender / looking-for correction | `admin/users_controller.rb#update_identity`, `#update_gender`; `Admin::ProfileIdentityCorrectionService` | `src/features/hq/pages/Member360Page.tsx` editors; `/api/v1/admin/profiles/:id/identity_corrections` | FULL for current fields | History/audit exists. Other profile fields still need correction endpoints/UI. |
| Discovery eligibility explanation | `admin/users_controller.rb#discovery_eligibility`; `Matching::DiscoveryEligibility` | `members_controller.rb#discovery_diagnostic`; `Member360Page.tsx` diagnostics | FULL for implemented D8N rules | Pair diagnostics exist, but stage-by-stage surface/pool explanations need expansion as more discovery surfaces are added. |
| Discovery restriction / restoration | `admin/users_controller.rb#restrict_discovery/#restore_discovery` | `/api/v1/admin/profiles/:id/discovery_restriction`; Member 360 actions | FULL | Current moderation gate is operable and audited. |
| Suspension / reinstatement | `admin/users_controller.rb#suspend/#unsuspend`; legacy user actions | `admin/suspensions_controller.rb`, `admin/enforcements`; report detail actions | PARTIAL | Actions are available from report detail, not as complete contextual Member 360 actions; enforcement policy/history needs one unified surface. |
| Ban / unban | `admin/users_controller.rb#ban/#unban` | `admin/suspensions_controller.rb`; `ReportDetailPage.tsx` | PARTIAL | Operationally available from reports, missing direct Member 360 action and broader ban history/context. |
| Photo moderation | `admin/photos_controller.rb`; `AdminPage.js` photos section | `admin/profile_photos_controller.rb`; `ProfilePhotoModerationPage.tsx` | FULL | Queue, evidence and approve/reject workflow are live. |
| Profile-video moderation | `admin/profile_videos_controller.rb`; `AdminPage.js` videos section | D8N stores profile videos, but no HQ route/page/controller equivalent | MISSING | Add video queue, playback/evidence, approve/reject/reason and Member 360 linkage. |
| Selfie verification | `admin/selfie_verifications_controller.rb`; legacy RealMe queue | D8N RealMe assertions + `RealmeModerationPage.tsx` | PARTIAL | Core queue exists; verify all legacy selfie evidence/status/rejection/resubmission fields and history are exposed. |
| Video and government-ID verification | `admin/verification_checks_controller.rb` (`video`, `government_id`) | Shared `/admin/realme_verifications` endpoint/page | PARTIAL | Needs explicit method/evidence/decision history and parity validation for both check types. |
| Reports queue and report detail | `admin/reports_controller.rb`; `AdminPage.js` reports | `TrustSafetyPage.tsx`, `ReportDetailPage.tsx`, `/api/v1/admin/reports` | FULL for member reports | Evidence/context and linked Member 360 are present; conversation/message evidence still needs deeper linkage. |
| Community reports/moderation | `admin/community_reports_controller.rb`, community controllers; `AdminPage.js` community | D8N has community admin endpoints/models, but no HQ community route/page | MISSING | Add Community & Support destination and moderation queues. |
| Trust score inspection | `trust_scores_controller.rb`, trust ledger models/tasks | `domains/hq/member360/load.rb` trust score/breakdown; Member 360 | PARTIAL | Current score and sampled events show; complete event chronology, reversals, report/enforcement causality and aggregate trust destination are missing. |
| Trust adjustment | `admin/trust_adjustments_controller.rb` | `/api/v1/admin/profiles/:id/trust_adjustments`; Member 360 action | PARTIAL | Adjustment works; reversal/history workflow and operator-facing audit detail are not complete. |
| Likes sent/received | Legacy models/API; dashboard counts in `AdminPage.js` | Member 360 product counts/history in `domains/hq/member360/load.rb` | PARTIAL | Counts and selected histories exist; complete counterpart chronology/filtering needs verification and UI expansion. |
| Passes/unpasses | `ProfilePass`, legacy API; dashboard/user data | D8N Member 360 pass counts/history | PARTIAL | Underlying pass history is exposed, but no dedicated operational table or unpass parity where supported. |
| Matches/unmatches | Legacy `Match` model/API; dashboard | D8N Member 360 match history/counts | PARTIAL | Match history is present; unmatched reason/time and counterpart drill-down need completion. |
| Blocks | Legacy `Block` model/API; user data | D8N Member 360 block counts | PARTIAL | Counts exist; full block counterpart/chronology and unblock administration are absent. |
| Conversations/messages | Legacy `AdminPage.js` messages section explicitly says browsing unavailable | D8N Member 360 recent conversations/messages in `domains/hq/member360/load.rb` | STRONGER THAN LEGACY / PARTIAL | HQ now exposes message content and participants beyond legacy, but needs complete conversation browser, attachments, delivery/read state, reported-message context and sensitive-read audit UX. |
| Notifications/delivery | Legacy notification models/API; metrics and member preferences | Member 360 comms delivery counts/recent deliveries | PARTIAL | Generated/inbox/preferences/provider attempts/retries need complete operator timeline and delivery drill-down. |
| Deletion/lifecycle intelligence | `admin/deletions_controller.rb`, `Admin::DeletionMetricsService`; user deletion fields | Member 360 closure/purge fields; no HQ lifecycle destination | PARTIAL | Individual state is visible; aggregate leavers/stayers, retention interventions, purge deadlines and churn trends need Product/Growth UI. |
| Audit/activity logs | `admin/audit_logs_controller.rb`; `AdminPage.js` logs | HQ sensitive-read audits/backend audit records; Member 360 timeline | PARTIAL | Member timeline exists, but a dedicated searchable cross-brand audit destination is coming soon. |
| Error logs | `admin/error_logs_controller.rb`; `AdminPage.js` errors | No HQ error-log page | MISSING | Add Platform Operations error/incident surface. |
| Acquisition/funnel/retention | `admin/acquisition_controller.rb`, metrics service, dashboard | D8N HQ analytics/product intelligence controllers exist | PARTIAL | Backend endpoints exist, but `/hq/product`, `/hq/growth`, `/hq/acquisition` are explicitly coming soon in `src/App.tsx`/`navConfig.ts`. |
| Marketplace health | Legacy `Admin::MarketplaceHealthService`, `AdminPage.js` marketplace | D8N `command_centre`/analytics backend only | PARTIAL | No live HQ marketplace destination; build cross-brand liquidity/pool diagnostics. |
| Founder goals/journal/company | Legacy founder dashboard, company goals/journal/settings routes and UI | No HQ company/intelligence pages | MISSING | Preserve as Company/Intelligence destination or explicitly retire with replacement. |
| Backups and SMS/provider operations | Legacy admin backups/SMS routes and UI | No HQ operational page | MISSING | Add Platform Operations/provider diagnostics with RBAC and audit. |
| Operators, roles, assignments | Legacy boolean admin model/UI limited | HQ operator/role/capability backend and `OperatorSecurityPage` | PARTIAL | Session security is live; operator CRUD/brand assignment/role management UI is not in current routes (`/hq/admin` is coming soon). |
| Brand configuration | Legacy single Date9ja assumptions | D8N brand registry/capability contracts; `/hq/brands` reserved | PARTIAL | Backend is multi-brand; HQ configuration/contract inspection UI is coming soon. |

## Explicitly coming soon in HQ

These are not hidden capabilities; they are intentionally reserved but currently render `UnavailableHqPage`:

- Live/events and incidents: `src/App.tsx` routes `/hq/live`, `/hq/incidents`.
- Customers/support: `/hq/customers`.
- Product intelligence, marketplace health, growth/acquisition: `/hq/product`, `/hq/marketplace`, `/hq/growth`, `/hq/acquisition`.
- Reliability, errors, APM/traces, jobs, database, infrastructure and deployments: `/hq/reliability`, `/hq/errors`, `/hq/apm`, `/hq/jobs`, `/hq/database`, `/hq/infrastructure`, `/hq/deployments`.
- Brands, operators/admin, audit: `/hq/brands`, `/hq/admin`, `/hq/audit`.
- Company intelligence and executive briefings: `/hq/intelligence`, `/hq/briefings`.

`HqSidebar.tsx` also links to `/ops` as “DateZA Admin”, but `src/App.tsx` defines no `/ops` route; this link currently falls through the wildcard redirect and should be treated as a broken/unfinished compatibility path, not a working admin destination.

## D8N/HQ capabilities stronger than legacy Date9ja admin

- Dedicated HttpOnly HQ operator sessions with central revocation (`HqOperatorSession`, `HqBrowserSession`, operator sessions page), instead of the legacy single boolean-admin model.
- Multi-brand assignments and capability-based RBAC (`domains/admin/capabilities.rb`) rather than Date9ja-only authorization.
- Member 360 with security history, authentication attempts, enforcement history, timeline, discovery diagnostics, trust breakdown and message content.
- Durable discovery restriction/reversal and identity-correction history.
- Cross-brand command-centre health and brand comparison APIs.
- Sensitive-read audit hooks and no-store handling for HQ/admin responses.

## Immediate audit priorities

1. Close the Member 360 operational gaps: full profile correction, complete relationships/conversations, notification delivery drill-down and lifecycle history.
2. Add missing legacy queues: profile videos, community moderation, error/provider operations and company capabilities.
3. Wire already-existing analytics/product backend endpoints into real HQ pages before adding new metrics.
4. Build `/hq/admin`, `/hq/audit` and `/hq/brands` so the existing RBAC, assignments and audit architecture is operable rather than backend-only.
5. Remove or implement the `/ops` link and document whether legacy DateZA admin is retired or intentionally retained.
