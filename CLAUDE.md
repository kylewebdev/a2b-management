# CLAUDE.md

## What this is

Estate liquidation appraisal co-pilot — mobile-first Next.js app. Operators photograph items, AI triages/values them.

Read `docs/` for product spec, architecture, and brand guidelines.

## Stack

Next.js (App Router), Drizzle ORM, Neon Postgres, Clerk auth, Cloudflare R2, Vercel

## Commands

```
npm run dev       # Start dev server
npm run build     # Production build
npm run lint      # ESLint
npm run db:push   # Push schema to Neon
npm run db:studio # Open Drizzle Studio
```

## Testing

Tests are required for every phase. Write the test first, then make it pass. All tests must be green before a phase is complete.

```
npm test              # Run vitest
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
npm run test:e2e      # Playwright E2E (Phase 7+)
```

_(Playwright E2E wired up in Phase 7.)_

## Corrections

- Use Drizzle, not Prisma
- Use Neon serverless driver, not pg/node-postgres
- SSE for real-time streaming, not WebSockets
- HEIC→JPEG conversion happens client-side (heic2any), not server-side
- Users bring their own AI API keys — do not hardcode or share keys
- Mobile-first: design for phone viewports first, desktop second
- Estates are indexed by address, not name — name is optional (added later to help sell the estate sale)
- Use `data-1p-ignore` attribute on non-credential form inputs to prevent password manager interference

## Build Progress

Current phase: **3 — Item & Photo Pipeline** (not started)

See `docs/BuildPlan.md` for details.

## Phase Gate Protocol

When you finish a phase (all checklist items done and deliverable confirmed), do these three things before starting the next phase:

1. **Update `docs/BuildPlan.md`** — Check off completed items. Add notes on any deviations, decisions made, or tasks that turned out unnecessary. If the next phase needs adjustments based on what you learned, revise it now.
2. **Update this file's "Build Progress" and "Current State" section** — Bump the current phase. Add or revise any new commands, dependencies, corrections, or patterns that future sessions need to know.
3. **Tell the user** — Summarize what shipped, what changed from the plan, and what's next.
