# AI Assistant Instructions — A2B Manager

Estate liquidation appraisal co-pilot — mobile-first Next.js app. Operators photograph items, AI triages/values them.

## Getting Started

1. Read this file before starting any task.
2. Check `.ai/buildplan.md` for the current state and what to work on next.
3. Check `.ai/conventions.md` for project patterns and hard rules.
4. Reference docs live in `.ai/context/` — Architecture, Brand, Project spec, and build History.

## Stack

Next.js 16 (App Router, Turbopack), Drizzle ORM, Neon Postgres, Clerk auth, Cloudflare R2, Vercel, @anthropic-ai/sdk, openai, @google/generative-ai, Tailwind CSS v4, Zod v4, TypeScript strict mode

## Commands

```
npm run dev           # Start dev server
npm run build         # Production build
npm run lint          # ESLint
npm run db:push       # Push schema to Neon
npm run db:studio     # Open Drizzle Studio
npm test              # Run vitest (482 unit tests)
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
npm run test:e2e      # Playwright E2E (23 tests)
```

## Corrections — Hard Rules

These override any assumptions. Follow them exactly:

- **Drizzle, not Prisma** — Drizzle ORM with Neon serverless HTTP driver
- **SSE for streaming, not WebSockets** — AI triage results stream via Server-Sent Events
- **HEIC→JPEG client-side** — `heic2any` in the browser, never server-side
- **Users bring their own AI keys** — never hardcode or share API keys
- **Mobile-first** — design for phone viewports first, desktop second
- **Estates indexed by address** — address is the primary identifier, name is optional
- **`data-1p-ignore`** — use on all non-credential form inputs to prevent password manager interference
- **Dark-only theme** — no light mode, no toggle
- **Tests first** — write the test, then make it pass

## Workflow

1. **Read** the relevant plan section or issue before writing code.
2. **Implement** in small, focused commits.
3. **Test** — all tests must pass before work is considered done.
4. **Update** the buildplan when completing a step.

## Current State

All 7 build phases complete. **482 unit tests + 23 E2E tests.** See `.ai/buildplan.md` for details and `.ai/context/History.md` for the full phase-by-phase build log.
