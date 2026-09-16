# D8N HQ — standalone extraction

Status: **builds, lints, and tests green locally. Not deployed anywhere.** No DNS, no
production CORS config, no real backend touched. See "What's left before deploy" below.

This app is `src/features/hq/` + `src/lib/hq/` extracted out of `~/pro/dateza` into its own
repo, per the founder-approved recommendation in `~/pro/dateza/HQ-STANDALONE-PLAN.md`
(Option B). Read that doc first for the *why* — this doc covers the *how* and *what's left*.

## The one architectural fact this whole app is built around

D8N (`~/pro/d8n`, the Rails backend) resolves which brand a request is for **purely from the
Host header** (`domains/brands/resolver.rb`), and a login session is **pinned to one brand at
issuance** (`Session belongs_to :brand`; `Identity::SessionAuthenticator` hard-rejects
`wrong_brand`). There is no brand query param, no admin override, and — deliberately, per the
constraints on this work — no backend change was made to add one.

So this app does not pretend to have "one login, one session, three brands." Instead:

- It holds **one Bearer token per brand** (`src/lib/api/tokenStore.ts`), each obtained by
  signing in against that brand's own API host with `session_mode: "token"`
  (`src/lib/api/auth.ts`) — D8N's existing cookie-free auth mode
  (`~/pro/dateza/src/lib/api/tokenStore.ts` has the same mode, just single-brand).
- Every request targets a specific brand's **absolute** API URL (`src/lib/brands.ts` +
  `src/lib/api/client.ts`), not a same-origin relative path — this app is not, and should not
  try to be, same-origin with any one brand's API.
- The brand switcher in the header (`src/features/hq/HqHeader.tsx`, `BrandSelector`) actually
  switches which host+token every subsequent request uses. Switching to a brand you're already
  signed into is instant; switching to one you aren't sends you to sign in for it once, then
  it's cached for the rest of the browser session.
- The one already-genuinely-cross-brand backend read
  (`GET /api/v1/hq/command_centre/brands`, `Hq::CommandCentre::BrandComparison`) needs none of
  this — it aggregates across the caller's `AdminAssignment`s server-side, so it works from
  whichever single brand you're currently signed into.

This is deliberately the frontend-only path scoped in `HQ-STANDALONE-PLAN.md` as needing no
backend changes. A cleaner single-session backend fix (one login, `base_controller.rb` accepts
an explicit, `AdminAssignment`-validated brand selector instead of trusting `Current.brand`
unconditionally) is still a good follow-up — it's scoped there too — but this app does not
depend on it.

## What was ported vs. rewritten from `~/pro/dateza`

**Ported close to verbatim** (all of `src/features/hq/` and `src/lib/hq/` except the files
below): the shell, sidebar, nav, Command Centre, Member 360, Member Search, Trust & Safety,
Alerts, Report Detail, MFA gate flow, and the whole `founder/` cross-brand dashboard. These
files didn't need to know about multi-brand tokens — they call `apiRequest`/`fetchHqOperator`
the same way they always did.

**Rewritten** because the single-brand, cookie-capable, consumer-app session model they
depended on doesn't fit a standalone multi-brand admin tool:
- `src/lib/api/tokenStore.ts` — one token per brand instead of one global token; tracks the
  active brand.
- `src/lib/api/client.ts` — targets an absolute per-brand URL and that brand's token;
  `credentials: "omit"` (no cookie mode at all here, so no CSRF token plumbing either).
- `src/lib/api/auth.ts`, `src/lib/api/types.ts` — trimmed to just sign-in (`session_mode:
  "token"`); dropped the consumer registration/onboarding/password-reset flows dateza's
  version carries, since HQ operators already have accounts (created via
  `Admin::FounderBootstrap` / operator management on the backend) and never register here.
- `src/features/auth/` — new `AuthProvider`/`useAuth` replacing dateza's generic
  `SessionProvider`/`useSession`; `SignInPage` gained a brand dropdown.
- `src/features/hq/HqOperatorProvider.tsx`, `useBrandAdminAccess.ts`,
  `src/lib/hq/adminAccess.ts` — the "which identity am I probing for" cache key changed from a
  numeric `user_id` (one session, one user) to the active brand slug (this app can hold
  multiple signed-in brands in one tab).
- `src/features/hq/HqSiteLink.tsx` — was "Back to DateZA"; there's no member-facing app to
  return to here, so it's now "Sign out" (of the active brand).
- Dropped entirely: `HqEntryLink.tsx` (the consumer-app nav chip that links *into* `/hq` — this
  app's root *is* `/hq`), and everything under dateza's `features/session`/`features/auth`
  beyond what's listed above (registration, password reset, email/phone change — none of it
  applies to an operator console).

**Not ported at all**: DateZA's global `src/index.css` (12k lines of consumer-brand design
system). `src/index.css` here is a small, neutral, from-scratch stylesheet covering exactly the
handful of shared classes (`public-status*`, `auth-field*`, `hq-button*`, `hq-card`,
`hq-signin*`) that the ported components need and that used to live in dateza's global sheet.
`src/features/hq/hq.css` / `hq-founder-shell.css` (HQ's own neutral styling, already
brand-agnostic) came across unchanged.

## Local setup

```
cp .env.example .env   # then point each brand's apiBase at wherever its Rails backend runs
npm install
npm run dev             # http://localhost:5183
npm run check            # lint + typecheck + test — 61/61 tests passing as of this commit
npm run build             # production build — verified working locally
```

`VITE_HQ_BRANDS` (see `.env.example`) is the only environment-specific thing this app needs: a
JSON array of `{ slug, label, apiBase }`. `slug` must match the brand's slug in D8N's `Brand`
table.

## What's left before this could actually be deployed

1. **CORS.** `~/pro/d8n`'s `config/initializers/cors.rb` reads `D8N_CORS_ORIGINS` (an env var,
   not code) and needs this app's eventual origin (e.g. `https://hq.d8n.tech`) added to it on
   each brand's backend before sign-in from a real browser will work there. This is an ops
   config change on a live production box — explicitly **not** done here, needs sign-off.
2. **A real domain + deploy target.** Nothing has been deployed. Vercel (matching the other
   D8N frontends) or any static host works — this is a plain Vite SPA build (`dist/`), no
   server runtime required beyond serving static files with SPA fallback routing (every path
   under `/hq/*` and `/sign-in` needs to resolve to `index.html`).
3. **Decide on token persistence.** Right now tokens are memory-only (mirrors dateza's
   ADR-0002): a reload signs every brand out. That's the safe default carried over
   unchanged — revisit only with the same security sign-off ADR-0002 required, not unilaterally
   from this app.
4. **Design pass.** `src/index.css` is intentionally minimal/functional, not a finished visual
   identity for a company-wide tool three brands' operators will use daily. The `hq.css` /
   `hq-founder-shell.css` styling carried over from dateza already does most of the real work;
   this is a smaller gap than it sounds.
5. **The backend follow-up** scoped in `HQ-STANDALONE-PLAN.md` (single cross-brand session via
   an `AdminAssignment`-validated brand selector on `base_controller.rb`) is still worth doing
   eventually to drop the "sign in once per brand" friction — not a blocker, just not started,
   and deliberately out of scope for this session (`~/pro/d8n` was left untouched throughout).

## Repo layout

Same shape as the dateza source it came from — `src/features/hq/`, `src/lib/hq/` are almost
entirely unmodified. New/rewritten pieces live in `src/features/auth/`, `src/lib/api/`,
`src/lib/brands.ts`, `src/app/`, and the app root (`App.tsx`, `main.tsx`, `index.css`).
