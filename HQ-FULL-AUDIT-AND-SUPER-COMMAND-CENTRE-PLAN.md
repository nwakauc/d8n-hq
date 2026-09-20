# D8N HQ — Full Audit and Super Command Centre Plan

Status: audit completed before major implementation. This document records what exists in the checked-out repositories, what is exposed in D8N HQ, what remains legacy-only, and the proposed additive implementation order.

Repositories audited:

- `d8n-hq` — current standalone HQ frontend.
- `d8n` — shared Rails backend, HQ controllers, domain services, metrics, capabilities, and routes.
- `date9ja` — legacy web admin frontend and API client.

The supplied Super HQ reference image was not present as a local file in the workspace, so the visual audit below is based on the written specification and existing founder/dashboard implementations. The reference image should be re-attached or placed in the repository before a pixel-level comparison.

## 1. Executive findings

1. Current HQ is a real, security-aware operator console, but it is still a Phase 1/2 surface rather than the complete D8N operating system.
2. Current HQ has working command-centre health, brand comparison, member search/Member 360, Trust & Safety, photo moderation, RealMe moderation, security alerts, operator sessions, MFA, and several audited actions.
3. Current HQ navigation already reserves most of the desired information architecture, but many routes render an explicit unavailable/coming-soon page.
4. The D8N backend already contains useful shared metric computation and product-intelligence services, including historical windows, marketplace counts, zero-discovery allocations, profiles without engagement, trust backlog, and time-to-first metrics. The frontend exposes only part of this.
5. Date9ja legacy admin has the broadest operational inventory. It includes dashboard metrics, historical signup chart, marketplace analysis, acquisition, users, deletions and win-back context, photo/video/RealMe queues, feedback, reports, community, messages, logs, errors, founder planning, backups, SMS diagnostics, and careers.
6. Several requested signals are not currently safely available as durable cross-brand data: true presence/online-now, deletion reason completeness/history, error aggregation, job/queue health, notification delivery health, acquisition attribution, full event stream, and revenue/subscription reporting.
7. The implementation should be additive: preserve current HQ pages and legacy capabilities, then connect them through shared query/filter/drill-down contracts.

## 2. Existing D8N HQ inventory

### Authentication and shell

| Surface | Current state | Classification |
|---|---|---|
| HQ cookie login | Persistent HttpOnly HQ session, credentials included, CSRF token retained in memory | PRESENT AND GOOD |
| Session restore | Supports JSON session metadata and successful empty 204 probes | PRESENT AND GOOD |
| Operator identity | `/api/v1/hq/operator`, role, capabilities, assignments, MFA state | PRESENT AND GOOD |
| MFA enrollment/challenge | Enrollment, confirmation, challenge, recovery state | PRESENT AND GOOD |
| Brand context | Host-pinned brand selection and per-brand session marker | PRESENT AND GOOD |
| Global search shell | Keyboard-open search palette exists; member lookup is the meaningful implemented search | PRESENT BUT INCOMPLETE |
| Route guard | Signed-in operator check, forbidden/unavailable distinction, MFA gate | PRESENT AND GOOD |
| Responsive shell | Sidebar, header, founder/ops mode, status pages | PRESENT BUT INCOMPLETE |

### Current routes and pages

| Route | Current implementation | Classification |
|---|---|---|
| `/hq` | Command Centre; ops dashboard and founder overview modes | PRESENT BUT INCOMPLETE |
| `/hq/members` | Member directory/search and filters | PRESENT AND GOOD |
| `/hq/members/:lookup` | Member 360 with identity, profile, activity/history, discovery diagnostics, enforcement and profile-publication controls | PRESENT BUT INCOMPLETE |
| `/hq/live` | Reserved unavailable page | DESIGNED BUT NOT IMPLEMENTED |
| `/hq/alerts` | Security alert list with filters/detail navigation | PRESENT AND GOOD |
| `/hq/incidents` | Reserved unavailable page | DESIGNED BUT NOT IMPLEMENTED |
| `/hq/growth` | Reserved unavailable page | DESIGNED BUT NOT IMPLEMENTED |
| `/hq/product` | Reserved unavailable page | DESIGNED BUT NOT IMPLEMENTED |
| `/hq/marketplace` | Reserved unavailable page | DESIGNED BUT NOT IMPLEMENTED |
| `/hq/revenue` | Reserved unavailable page | DESIGNED BUT NOT IMPLEMENTED |
| `/hq/acquisition` | Reserved unavailable page | DESIGNED BUT NOT IMPLEMENTED |
| `/hq/customers` | Reserved unavailable page | DESIGNED BUT NOT IMPLEMENTED |
| `/hq/trust-safety` | Trust & Safety overview, report queue, enforcements, repeat offenders | PRESENT BUT INCOMPLETE |
| `/hq/trust-safety/reports/:reportId` | Report detail, lifecycle transitions and profile enforcement actions | PRESENT AND GOOD |
| `/hq/moderation/photos` | Photo moderation queue and actions | PRESENT AND GOOD |
| `/hq/moderation/realme` | RealMe moderation queue and actions | PRESENT AND GOOD |
| `/hq/reliability` | Reserved unavailable page | DESIGNED BUT NOT IMPLEMENTED |
| `/hq/apm` | Reserved unavailable page | DESIGNED BUT NOT IMPLEMENTED |
| `/hq/errors` | Reserved unavailable page | DESIGNED BUT NOT IMPLEMENTED |
| `/hq/traces` | Reserved unavailable page | DESIGNED BUT NOT IMPLEMENTED |
| `/hq/logs` | Reserved unavailable page | DESIGNED BUT NOT IMPLEMENTED |
| `/hq/jobs` | Reserved unavailable page | DESIGNED BUT NOT IMPLEMENTED |
| `/hq/database` | Reserved unavailable page | DESIGNED BUT NOT IMPLEMENTED |
| `/hq/infrastructure` | Reserved unavailable page | DESIGNED BUT NOT IMPLEMENTED |
| `/hq/deployments` | Reserved unavailable page | DESIGNED BUT NOT IMPLEMENTED |
| `/hq/data-health` | Reserved unavailable page | DESIGNED BUT NOT IMPLEMENTED |
| `/hq/security` | Operator session security, session listing and revocation | PRESENT BUT INCOMPLETE |
| `/hq/brands` | Reserved unavailable page | DESIGNED BUT NOT IMPLEMENTED |
| `/hq/admin` | Reserved unavailable page, although backend operator CRUD exists | BACKEND EXISTS / HQ UI MISSING |
| `/hq/audit` | Reserved unavailable page | BACKEND EXISTS / HQ UI MISSING |
| `/hq/intelligence` | Reserved unavailable page | DESIGNED BUT NOT IMPLEMENTED |
| `/hq/briefings` | Reserved unavailable page | DESIGNED BUT NOT IMPLEMENTED |

### Current Command Centre modules

The founder view currently contains:

- hero metrics from brand health;
- company pulse and attention signals;
- profile health;
- marketplace pulse;
- Trust & Safety summary;
- security alerts;
- brand comparison;
- system/version status;
- founder/ops mode switching.

The backend-backed metrics currently include memberships total/new, active users by windows, profile status and activation ratio, likes, matches, conversations, zero-discovery allocations, published profiles without likes/matches, trust backlog, active enforcements, pending photo reviews, and oldest open report age. Time-to-first-like/match/conversation is explicitly marked unavailable pending bounded rollups.

Current gaps in Command Centre: global all-brand date controls, clickable drill-downs for most metrics, registration history, true online-now, deletion trend, error trend, notifications, jobs, infrastructure, revenue, source attribution, richer marketplace funnel, and cross-brand event activity.

## 3. Current Member 360 inventory

Implemented or partially implemented sections:

- identity: identifiers, membership, account state, recent sessions;
- profile: public profile, photos/video, status, visibility, onboarding and completion;
- discovery: eligibility diagnostic, discovery restriction and restore actions;
- publication: capability-gated “Make discoverable” workflow with required audited reason;
- security: auth attempts and security event history;
- enforcement: enforcement history and reinstatement/suspension actions where authorized;
- Trust & Safety context: reports and safety state;
- identity correction: capability-gated correction workflow;
- product activity and timeline data where the backend supplies it.

Missing or incomplete versus the target: preferences in a dedicated readable section, full likes/matches/conversation history, deletion/retention context, support history, richer trust-score/RealMe distinction, event-linked drill-downs, and a unified chronological activity timeline across all domains.

## 4. Current backend HQ capability inventory

### Live HQ endpoints

| Backend endpoint family | Current frontend use | Classification |
|---|---|---|
| `/hq/auth/*`, `/hq/operator`, `/hq/mfa/*` | Login, restore, operator, MFA | PRESENT AND GOOD |
| `/hq/auth/sessions` | Operator security page | PRESENT BUT INCOMPLETE |
| `/hq/command_centre/health` | Founder/ops command centre | PRESENT BUT INCOMPLETE |
| `/hq/command_centre/brands` | Brand comparison | PRESENT BUT INCOMPLETE |
| `/hq/analytics/overview` | Client wrapper exists; not a dedicated route/page | BACKEND EXISTS / HQ UI MISSING |
| `/hq/product_intelligence/funnel` | Client wrapper exists; no route/page | BACKEND EXISTS / HQ UI MISSING |
| `/hq/product_intelligence/trends` | Client wrapper exists; no route/page | BACKEND EXISTS / HQ UI MISSING |
| `/hq/members` and Member 360 subresources | Members and Member 360 | PRESENT BUT INCOMPLETE |
| `/hq/members/:lookup/publication` | Member 360 publication action | PRESENT BUT INCOMPLETE |
| `/hq/trust_safety/*` | Trust & Safety pages | PRESENT BUT INCOMPLETE |
| `/hq/security_alerts` | Security alerts | PRESENT BUT INCOMPLETE |
| `/hq/operators` | No current page | BACKEND EXISTS / HQ UI MISSING |
| `/admin/reports*` | HQ report UI | PRESENT BUT INCOMPLETE |
| `/admin/profiles/*` enforcement/corrections/discovery/trust actions | Member/report actions | PRESENT BUT INCOMPLETE |
| `/admin/profile_photos`, `/admin/realme_verifications` | Moderation pages | PRESENT BUT INCOMPLETE |

### Existing domain capabilities not fully exposed in HQ

The D8N platform catalog and domain code show available or partially available capabilities for identity/session persistence, profile onboarding/options/preferences/prompts/location/photos/video/completion/publication/visibility, discovery surfaces/exposure, matching/likes/passes/relationships/hooks, chat/conversations/messages, notifications (event/inbox/email/SMS/push), verification (email/phone/selfie/liveness/document), Trust & Safety reports/moderation/suspension/enforcement/trust score, community, and admin authorization/report/enforcement operations.

The platform catalog also marks several capabilities as planned: reputation/fraud detection, richer chat modes, billing operations, broad admin analytics, feature/brand operations, and some verification/admin user operations. These must remain explicitly unavailable until backed by real data and authorized endpoints.

## 5. Date9ja legacy admin inventory

The legacy `web/src/pages/AdminPage.js` is a large single-page admin console with these tabs:

| Legacy tab | Useful retained functionality | Classification for HQ |
|---|---|---|
| Dashboard | KPI strip, online-now card, signup chart, activation funnel, retention estimates, demographics, marketplace health, quick actions | PRESENT BUT INCOMPLETE / PRESERVE |
| Marketplace | Supply/demand health, market segments, discovery-ready, active 7d, online, new 7d, onboarding, recommendations | LEGACY DATE9JA ONLY; BACKEND/PATTERN EXISTS |
| Acquisition | Source/campaign filters and acquisition reporting | LEGACY DATE9JA ONLY |
| Users | Search, pagination, real/seed/flagged/suspended/banned/deleted filters, user type, moderation, identity correction, discovery eligibility/pair inspection | PRESENT BUT INCOMPLETE in HQ |
| Deletions | Period totals, deletion reasons, trend, product-state context, retention exit flow, stayers/leavers/comments, waitlist | LEGACY DATE9JA ONLY |
| Photos | Pending/approved/rejected queue, moderation, suspend-user action | PRESENT BUT INCOMPLETE |
| Profile videos | Review and approve/reject with reason | BACKEND EXISTS / HQ UI MISSING |
| RealMe / Selfies | Selfie and verification-check queues, approve/reject/resubmit | PRESENT BUT INCOMPLETE |
| Feedback | Unreviewed feedback list and mark reviewed | LEGACY DATE9JA ONLY |
| Reports | Report queue, filters, resolve, suspend/ban reported user | PRESENT BUT INCOMPLETE |
| Community | Events, stories, remarks, Aunty Phobie escalations; approve/reject/hide with notes | LEGACY DATE9JA ONLY / BACKEND PARTIAL |
| Messages | Message review/operational inspection | LEGACY DATE9JA ONLY |
| Logs | Admin activity log with action labels | BACKEND EXISTS / HQ UI MISSING |
| Errors | Application error log, load-more behavior, error detail | LEGACY DATE9JA ONLY |
| Founder | Company snapshot, status summary, CEO questions, advisor, health score, goals, forecasts, marketplace summary, wins/risks/recommendations, milestones, journal | LEGACY DATE9JA ONLY; preserve as founder intelligence |
| SMS test | Operator diagnostic SMS test | LEGACY DATE9JA ONLY; security-sensitive |
| Careers | Jobs, applications, publish/close, application state changes | LEGACY DATE9JA ONLY; likely separate business scope |

Legacy dashboard charts/cards include daily signups over the last 30 days, activation funnel, retention windows (Day 1/7/30), marketplace health, online users, demographic breakdowns by gender/looking-for/age/country/city, user type, devices and operating systems. These are valuable references but must be reimplemented only where the D8N backend can provide accurate cross-brand data.

Legacy actions include user suspend/unsuspend/ban/unban, discovery restrict/restore, identity correction, photo/video/selfie/verification moderation, report resolution, community moderation, feedback review, database backup trigger, founder goal/journal/company-setting edits, career workflow changes, and SMS testing. Each must be mapped to explicit HQ capabilities and audit requirements before migration.

## 6. Preservation matrix

| Capability | Current HQ | Date9ja legacy | Backend/data | Decision |
|---|---|---|---|---|
| Founder command centre | Founder overview and health snapshot | Rich founder dashboard | D8N health/metrics; Date9ja founder endpoint | Keep both concepts; unify progressively |
| Brand comparison | Present | Date9ja is brand-local | HQ brand comparison exists | Expand to All Brands and drill-down |
| Daily registrations | Window aggregate only | 30-day daily chart | Membership timestamps exist | Add historical series and period filters |
| Online now | Not implemented as true presence | Legacy recent-active card | Session last-used data, not presence | Expose active windows; label online-now gap |
| Marketplace liquidity | Summary/pulse | Detailed segments and recommendations | Brand-health and product-intelligence services | Promote to dedicated page |
| Member search | Present | Richer filters | Member directory supports several filters | Preserve and extend |
| Member 360 | Present | Legacy user detail | Strong HQ backend | Make definitive operator view |
| Deletions | Missing | Detailed deletion/win-back analysis | D8N source not yet confirmed cross-brand | Add after source audit/instrumentation |
| Photos | Present | Present | Admin queue endpoint | Preserve and add bulk/filter/deep links |
| Profile videos | Missing | Present | Backend capability/domain exists | Add dedicated moderation queue |
| RealMe | Present | Present | Verification endpoints | Keep separate from Trust Score |
| Reports | Present | Present | HQ/admin endpoints | Add richer filters/evidence/history |
| Community | Missing | Present | Platform community capability, endpoint coverage incomplete | Add only with backend contract |
| Errors | Missing | Present | D8N error-log model is in Date9ja; shared source unclear | Establish shared observability source |
| Logs/audit | Missing | Present | Sensitive read/moderation audit records exist | Add immutable audit viewer |
| Security | Alerts and sessions present | Legacy auth/security signals | HQ security events/auth history | Add auth activity and incident workflows |
| Notifications | Missing | Delivery-oriented legacy models | Shared notification capability exists | Instrument provider delivery first |
| Revenue | Reserved route | Founder KPI can show MRR/premium values | D8N billing capability planned | Keep unavailable until authoritative source |
| Backups/infrastructure | Reserved routes | Backup status and manual trigger | D8N operational infrastructure source not in HQ contract | Add read-only health first; gate mutations |
| Operator administration | Backend CRUD exists | Legacy boolean admin | HQ role/capability backend | Build Team & Access with RBAC/audit |

## 7. Super Command Centre target audit

### Immediate state

Current HQ covers some health, growth, marketplace, trust, and security signals. It does not yet provide the requested unified KPI strip for total members, new today, active today, online now, matches, conversations, deletions, open reports, pending moderation, and system health with click-through targets.

### Historical growth

Backend membership timestamps and metric windows support new-membership windows. A true daily/weekly/monthly historical series, stacked by brand and clickable to records, still needs an endpoint/query contract and bounded pagination.

### Marketplace

Current backend supports likes, matches, conversations, zero-discovery allocations, published-without-engagement cohorts, and a deferred time-to-first metric. It does not yet expose all requested funnel steps, impressions, meaningful conversation, or complete reciprocal liquidity dimensions.

### Trust and safety

Current HQ has reports, enforcement history, repeat offenders, photos, RealMe, security alerts, and member safety context. Trust Score is represented in backend capability/domain code but is not yet a complete dedicated HQ surface. Fraud/safety intelligence is not yet a complete evidence-backed product.

### Engineering and observability

The navigation reserves Errors, APM, Jobs, Database, Infrastructure, Deployments, Logs, and Reliability, but no current HQ API contract feeds them. Date9ja has application error logs and admin logs; a shared D8N observability model is required for cross-brand use.

### Business and growth

Acquisition, revenue, subscriptions, retention/win-back, campaigns and deletion insights are mostly missing from current HQ. Date9ja contains useful brand-local acquisition, deletion, founder, and revenue-like KPI code, but source definitions must be normalized before cross-brand display.

## 8. Instrumentation gap register

| Signal | Why it matters | Current source | Captured? | Historical? | HQ UI? | Work required |
|---|---|---|---|---|---|---|
| Online now/presence | Marketplace liquidity and support | Session `last_used_at` only | Partial | Partial | No | Define presence heartbeat/window and endpoint |
| Daily registrations by brand | Growth trend | Membership timestamps | Yes | Queryable | No historical chart | Add bounded series endpoint and drill-down |
| Signup source/campaign | Acquisition quality | Date9ja legacy acquisition only | Brand-local | Partial | No | Normalize attribution fields/events |
| Onboarding conversion | Activation | Profile/membership state | Partial | Snapshot/window | Partial | Add cohort funnel with stable definitions |
| Discovery impressions | Marketplace exposure | Allocation data, not full impressions | Partial | Partial | No | Persist exposure/impression events |
| Zero-result discovery | Marketplace friction | Discovery allocations | Yes | Yes | Summary only | Add affected-member/session drill-down |
| Time to first like/match/conversation | Activation/liquidity | Backend marks deferred | Not safely queryable live | No | No | Rollup job/materialized metrics |
| Deletion reasons | Retention/product problems | Date9ja deletion model/UI | Date9ja-focused | Partial | No | Confirm D8N canonical deletion event/schema |
| Deletion product context | Win-back | Date9ja captured from 2026-09-07 | Partial | Partial | No | Move to shared deletion snapshot/event |
| Errors and exception groups | Detect regressions | Date9ja `ErrorLog`; D8N source unclear | Partial | Partial | No | Shared sanitized error ingestion/grouping |
| Failed jobs/queue depth | Platform health | No HQ contract found | Unknown | No | No | Add operational telemetry adapter |
| Notification delivery | Member reachability | Date9ja delivery models; shared capability | Partial | Partial | No | Provider attempt/delivery/failure events |
| Audit events | Accountability | HQ sensitive/moderation audits | Yes | Yes | No viewer | Add paginated audit endpoint/UI |
| Live cross-platform events | Operating loop | Individual domain events | Fragmented | Fragmented | No | Canonical event envelope and retention policy |
| Revenue/subscriptions | Business health | Backend capability marked planned | Unknown | Unknown | No | Authoritative billing contract first |
| Trust Score history | Safety/reputation | Domain capability available | Partial | Unknown | No | Define read model and operator-safe detail |
| Scam/fraud signals | Safety intelligence | Capability planned | No | No | No | Explicit detection/audit model before UI |
| Support interactions | Member support | Legacy feedback/support-like data | Brand-local | Partial | No | Shared support/event source |
| Deployment/version health | Release correlation | `/api/v1/version` only | Partial | No history | Status only | Deployment registry/events |

## 9. Proposed final information architecture

Preserve the existing shell and routes, replacing unavailable pages incrementally:

### Command

- Command Centre
- Live / Events
- Security Alerts
- Incidents

### People

- Members
- Member 360
- Deleted Accounts / Retention
- Customers & Support
- Moderation Queue

### Marketplace

- Discovery & Matching
- Marketplace Health / Liquidity
- Conversations
- Product Intelligence / Funnels

### Growth & Business

- Registrations & Growth
- Acquisition & Campaigns
- Retention & Win-back
- Revenue & Subscriptions, only when backed by authoritative billing data

### Trust & Safety

- Reports & Moderation
- Photo Review
- Profile Video Review
- RealMe
- Trust Score
- Safety Intelligence
- Enforcement History

### Engineering & Platform

- Errors
- Events
- Jobs & Queue
- Services & Infrastructure
- Deployments
- Logs & Monitoring
- Notifications
- Data Health

### Admin

- Team & Access
- Brands
- Audit Log
- Settings

Drill-down contract: every summary metric should carry a metric definition, time window, brand scope, query/filter state, and a link or route to the underlying record list. Member-level links must route to Member 360; report/event/error links must preserve IDs and brand context.

## 10. Implementation phases

### Phase A — Preserve and expose existing value

- Add All Brands/date-range controls without removing current brand-pinned views.
- Build analytics overview and product-intelligence pages from existing backend endpoints.
- Add profile video moderation, audit viewer, operator Team & Access, and richer Member 360 preferences/activity.
- Port legacy deletion, acquisition, feedback, and error concepts only after source contracts are confirmed.

### Phase B — Command Centre

- Add clickable KPI strip.
- Add daily registrations history and brand comparison.
- Add active-window metrics with explicit online-now limitation.
- Add deletion summary only once canonical deletion data is available.
- Add recent reports, recent errors, recent activity, and system health cards.

### Phase C — Drill-downs

- Make chart segments, KPI values, attention signals, brand rows, report rows, and error groups navigable.
- Build reusable query/filter state for brand, date window, status, severity, and cohort.
- Add deep links from every operational signal to Member 360, report detail, event, or error detail.

### Phase D — Operational controls

- Port safe legacy actions: profile discovery/publication, moderation, enforcement, identity correction, session revocation, report decisions.
- Add explicit capability checks, reason/confirmation requirements, before/after audit records, and action-result refresh.

### Phase E — Observability

- Establish shared sanitized errors, events, queue/job, notification, deployment, and service health contracts.
- Add Errors, Events, Jobs, Infrastructure, Deployments, Logs, and Notifications pages.

### Phase F — Marketplace intelligence

- Add funnel cohorts, liquidity pools, zero-result cohorts, published-without-engagement cohorts, and bounded time-to-first rollups.
- Keep unsupported metrics visibly unavailable rather than estimated.

### Phase G — Business intelligence

- Add acquisition quality, retention/win-back, revenue/subscriptions, campaign and deletion insights after canonical data contracts exist.

### Phase H — Intelligent attention

- Add anomaly thresholds and founder attention only from well-defined, explainable signals with drill-downs and suppression controls.

## 11. Risks and controls

| Risk | Control |
|---|---|
| Invented or incomparable metrics | Metric catalog with definition/version/unit/status and explicit unavailable state |
| Expensive cross-brand queries | Bounded windows, rollup jobs, pagination, materialized snapshots |
| Cross-brand leakage | Brand-scoped authorization and explicit all-brand aggregation service; never trust client brand alone |
| Sensitive data exposure | Capability-specific endpoints, aggregate-first UI, least-privilege member detail, redaction |
| Unsafe operator actions | Backend authorization remains authoritative; confirmation, reason, immutable audit, before/after values |
| Noisy attention system | Explainable thresholds, deduplication, severity, snooze/acknowledge state |
| Event volume/cost | Canonical event envelope, retention, sampling only where safe, rollups for dashboards |
| Legacy behavior drift | Preserve legacy tests and add contract tests while migrating each action |
| Misleading online/active labels | Separate presence, last-hour, today, 7d, DAU/WAU/MAU definitions |
| Founder dashboard overload | Summary on Command Centre, depth on dedicated pages, consistent drill-downs |

## 12. Recommended next implementation slice

The highest-value evidence-backed slice is:

1. Build a real `/hq/product` or `/hq/intelligence` page using existing analytics overview, product funnel, and trends endpoints.
2. Add global time-window and brand comparison primitives.
3. Add clickable metric drill-down contracts to Members, reports, and Member 360.
4. Add `/hq/admin` Team & Access using the existing operator CRUD backend.
5. Add `/hq/audit` using existing sensitive-read/moderation audit records.
6. Add a shared error/event contract before implementing Errors or Live / Events.
7. Port Date9ja deletions only after confirming the canonical D8N deletion source and historical coverage.

This order preserves existing functionality, exposes backend value already present, and avoids building dashboards around unsupported or misleading data.

## 13. Accepted Command Centre operating model — 20 September 2026

The Command Centre is not a collection of analytics cards. It is D8N's live operator cockpit. The top-level experience must answer six questions, with every signal leading to a cohort, evidence, and a permitted action:

| Question | Command Centre signals | Destination for investigation |
|---|---|---|
| **People** — are people coming, staying and returning? | registrations, activation, active windows, retention, dormancy, reactivation, deletions, demographics, geography | Members, Registrations, Retention, Deletion Insights, Geography |
| **Marketplace** — are they finding one another? | discovery, exposure, likes, passes, reciprocal pools, matches, conversations, zero-result sessions and friction | Discovery, Matching, Conversations, Liquidity & Pools, Funnels |
| **Safety** — are people safe? | reports, blocks, moderation workload, RealMe, Trust Score, scam signals and enforcement | Reports, Moderation Queue, Photos, Videos, RealMe, Safety Audit |
| **Product** — is the experience working? | onboarding/publication funnel, product usage, device/version concentration, notification delivery | Product Usage, Devices & Versions, Notifications, Feature Flags |
| **System** — is D8N technically healthy? | errors, API/database/jobs/media/deployment/provider status and data health | Errors, Logs, Events, Jobs, Infrastructure, Deployments |
| **Business** — are we building something sustainable? | acquisition quality, retention, paid conversion, memberships, payments and revenue | Acquisition, Campaigns, Retention, Memberships & Revenue |

### Required Command Centre modules

- **Today at D8N:** a compact since-midnight scorecard for registrations, onboarding completions, publications, likes, passes, matches, conversations, messages, reports, blocks, unmatches, RealMe, deletions, moderation actions, authentication failures, and errors—only where a canonical source exists.
- **Engagement funnel:** registration → onboarding → published → discovery exposure → like sent/received → match → conversation → return. This is a first-class leakage view, not scattered cards.
- **Daily registrations, active users and deletions:** real historical, brand-comparable series with date/member drill-downs.
- **Marketplace Pulse and marketplace pools:** evidence-backed friction, reciprocal supply/demand, city/location views, and cohort drill-downs.
- **Retention:** D1/D7/D30 where canonical cohort data exists, returning/dormant/reactivated users and deletion/churn context. Legacy retention estimates must be preserved as legacy/approximate until rebuilt from an authoritative definition.
- **Geography and product quality:** countries/cities, marketplace health by location, device/platform, OS/browser/app version, signup source and error concentration by version.
- **Conversation and communications health:** matches without first message, conversations started, reply/mutual-reply rates, response time, early abandonment, blocks/reports following conversations, plus push/email/SMS attempted/delivered/failed metrics.
- **What changed?:** explainable period-over-period movements distinct from urgent attention signals.
- **Operator workload:** pending photos/videos/RealMe, reports awaiting decision, support/feedback, unresolved incidents, oldest queue item and SLA age.
- **Live Activity, Recent Errors, Recent Reports, System Health and Needs Your Attention:** unified operational signals, each with a direct investigation route.

### Accepted final navigation

| Group | Routes |
|---|---|
| Command | Command Centre, Live / Events, Attention, Security Alerts, Incidents |
| People | Members, Deleted Accounts, Customers & Support, Feedback |
| Products | All Products, Date9ja, DateZA, HookUs, Feature Flags, Product Settings |
| Marketplace | Discovery, Matching, Conversations, Liquidity & Pools, Funnels, Marketplace Insights, Community |
| Trust & Safety | Reports, Moderation Queue, Photos, Videos, RealMe, Trust Score, Scam/Fraud Intelligence, Enforcement, Safety Audit |
| Growth | Registrations, Acquisition, Campaigns, Influencers / Referrals, Retention, Win-back, Deletion Insights |
| Business | Memberships, Revenue, Payments, Goals / Targets |
| Intelligence | Analytics, Cohorts, Demographics, Geography, Product Usage, Devices / Versions, D8N Insights |
| Engineering | Errors, Logs, Events, Jobs / Queues, Deployments, Services, Database, Infrastructure, Notifications, Third-Party Services, Data Health |
| Administration | Team & Access, Brands, Audit Log, Settings |

### Legacy Date9ja mapping

| Legacy area | D8N HQ destination |
|---|---|
| Dashboard / Founder | Command Centre and Intelligence |
| Marketplace | Marketplace, Funnels, Liquidity & Pools |
| Acquisition | Growth → Registrations, Acquisition, Campaigns |
| Users | People → Members and Member 360 |
| Deletions | People → Deleted Accounts; Growth → Deletion Insights |
| Photos, Videos, Selfies | Trust & Safety → moderation queues and RealMe |
| Feedback | People → Feedback / Customers & Support |
| Reports | Trust & Safety → Reports and Enforcement |
| Community | Marketplace → Community |
| Messages | Marketplace → Conversations; authorized member investigation |
| Logs, Errors | Engineering → Logs, Errors, Events |
| SMS | Engineering → Notifications / Third-Party Services |
| Careers | Excluded from core D8N HQ unless still required for company administration |

The supplied Super HQ reference image is the visual hierarchy guide: compact global controls, an immediate KPI strip, evidence-backed charts/funnels, a right-side live activity rail, a visible attention section, and dense but readable lower operational rows. It is a guide, not a source of sample values. Production HQ must only render real data or an explicit unavailable/instrumentation state.
