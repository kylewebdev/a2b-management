# A2B Manager

AI-powered estate liquidation appraisal co-pilot. Operators photograph items during estate cleanouts, and AI rapidly identifies, classifies, values, and routes each item through the correct disposition path.

**Core mission:** Move fast without leaving money on the table.

## Stack

- **Framework:** Next.js 16 (App Router) with React 19
- **Database:** Drizzle ORM + Neon Postgres (serverless HTTP driver)
- **Auth:** Clerk (middleware-protected routes, dark theme)
- **Storage:** Cloudflare R2 (S3-compatible, signed URLs)
- **AI:** Multi-provider — Anthropic, OpenAI, Google Gemini (BYOK)
- **Validation:** Zod v4 (shared schemas between API and client)
- **Styling:** Tailwind CSS v4, dark-only theme, mobile-first
- **Testing:** Vitest + Testing Library + jest-dom (305+ tests)

## Getting Started

```bash
# Install dependencies
npm install

# Copy env template and fill in your values
cp .env.example .env.local

# Push database schema to Neon
npm run db:push

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the app. You'll be redirected to Clerk sign-in on first visit.

### Environment Variables

See `.env.example` for the full list:

- `DATABASE_URL` — Neon Postgres connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` — Clerk auth
- `R2_*` — R2 storage credentials
- `ENCRYPTION_SECRET` — AES-256-GCM key for encrypting API keys at rest

## Commands

```bash
npm run dev           # Start dev server
npm run build         # Production build
npm run lint          # ESLint
npm test              # Run vitest
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
npm run db:push       # Push schema to Neon
npm run db:studio     # Open Drizzle Studio
```

## Project Structure

```
src/
  app/                  # App Router pages and API routes
    api/
      estates/          # POST/GET estates, GET/PATCH/DELETE estates/[id]
      items/[id]/       # GET/PATCH/DELETE items, POST triage, GET triage/stream
      settings/         # GET/PUT app-level settings
    estates/            # Estate list, create, detail, upload, item detail pages
    settings/           # Settings page
  components/           # Shared components (Shell, StatusBadge, TierBadge, etc.)
  db/
    schema.ts           # 4 tables, 4 enums
    index.ts            # Drizzle client (Neon HTTP)
  lib/
    ai/                 # AI types, prompt, parser, provider adapters, factory
    hooks/              # React hooks (use-triage-stream)
    validations/        # Zod schemas (estate, item, settings)
    api.ts              # Auth helpers (getAuthUserId, jsonError, jsonSuccess)
    crypto.ts           # AES-256-GCM encrypt/decrypt for API keys
    r2.ts               # R2 client (upload, delete, signed URLs)
    sse.ts              # SSE stream helpers
  test/                 # Test setup, helpers, factories
docs/                   # Project spec, architecture, brand guidelines, build plan
```

## How It Works

1. **Create an estate** — each estate is a job site identified by address
2. **Upload photos** — 1-5 photos per item, HEIC auto-converted client-side
3. **AI triage** — choose your AI provider in settings, then triage items individually or in batch
4. **Review results** — AI returns identification, tier (1-4), valuation range, comps, and listing guidance via SSE streaming
5. **Route & resolve** — disposition tracking based on tier (Phase 5, in progress)

### Tier System

| Tier | Action | Description |
|------|--------|-------------|
| 1 | Tag and move on | Bulk lot, donate, or dispose |
| 2 | Price tag it | AI-suggested pricing for estate sale |
| 3 | Pull for research | Needs full photo set and deeper analysis |
| 4 | Secure this item | Potential high value, route to specialist |

## Build Progress

**Phases 1-4 complete. Phase 5 (Routing & Resolution) next.**

See `docs/BuildPlan.md` for the full plan and checklist.

## License

Private.
