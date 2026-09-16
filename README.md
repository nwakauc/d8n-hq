# D8N HQ

Standalone, cross-brand operator console for D8N — HookUs, DateZA, Date9ja — from one build,
one deploy, no per-brand duplication.

Extracted from `~/pro/dateza/src/features/hq` + `src/lib/hq`. See `HQ-EXTRACTION-PLAN.md` for
the architecture (why it holds one Bearer token per brand instead of one shared session), what
changed in the port, and what's left before this can be deployed for real.

## Quick start

```
cp .env.example .env   # point VITE_HQ_BRANDS at your brands' API hosts
npm install
npm run dev
```

## Scripts

- `npm run dev` — local dev server (http://localhost:5183)
- `npm run check` — lint + typecheck + test (what CI should run)
- `npm run build` — production build to `dist/`
