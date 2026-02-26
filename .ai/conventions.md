# Conventions — A2B Manager

## Code Style

- TypeScript strict mode, path alias `@/*` → `./src/*`
- Plus Jakarta Sans font via `next/font/google`
- `lucide-react` for icons
- `<img>` not `next/image` for R2 signed URLs (avoids remote pattern config)
- No emojis in code or UI unless explicitly requested

## File Organization

```
src/app/           — App Router pages, API routes, loading/error boundaries
src/components/    — Shared components (Shell, StatusBadge, TierBadge, ItemCard, etc.)
src/components/toast/ — Context-based toast system
src/db/            — schema.ts (4 tables, 4 enums), index.ts (Drizzle client)
src/lib/           — Utilities (api.ts, r2.ts, sse.ts, crypto.ts, pagination.ts, etc.)
src/lib/ai/        — AI types, prompt, parser, provider adapters, factory
src/lib/hooks/     — React hooks (use-triage-stream.ts)
src/lib/validations/ — Zod schemas shared between API and client
src/test/          — setup.ts, helpers.ts (factories), db.ts (test DB helpers)
src/middleware.ts   — Clerk auth gate
e2e/               — Playwright E2E tests
.ai/context/       — Architecture, Brand, Project spec, History docs
```

## Data Model

- 4 tables: `estates`, `items`, `item_photos`, `app_settings`
- 4 enums: `estate_status`, `item_status`, `item_tier`, `ai_provider`
- Address is the primary estate identifier; name is nullable
- Clerk user IDs are strings (`user_2abc`), stored as `text` not `uuid`
- `app_settings` is a singleton row (always id=1)
- Items track `inputTokens`/`outputTokens` for cost calculation

## Page & Component Patterns

- All pages wrap content in `<Shell>` for consistent nav
- Server Components query DB directly for reads — API routes only for client mutations
- Pages use `params: Promise<{...}>` pattern (Next.js 16 async params)
- Tailwind v4 CSS-based config via `@theme inline` in globals.css (no tailwind.config.ts)
- Dark theme brand tokens defined in globals.css `@theme` block
- Mobile: bottom nav bar; Desktop (md+): left sidebar
- Two-column layouts on `lg+` for estate detail and item detail
- `loading.tsx` at each route level for streaming/suspense skeletons
- `error.tsx` at root/estate/item levels with `reset()` + back navigation

## Validation

- Zod schemas shared between API and client forms
- Zod v4 `.pipe()` doesn't work well — use wrapper functions for update validation
- Zod optional fields need `.nullable()` for JSON roundtrip (client sends `null` not `undefined`)
- Disposition constrained to `z.enum()` — no freeform strings
- Status transitions enforced via whitelist map (forward-only, irreversible)
- Input length limits: `.max(500)` estates, `.max(2000)` item notes, `.max(500)` API keys

## API Patterns

- Auth helpers in `src/lib/api.ts`: `getAuthUserId()`, `jsonError()`, `jsonSuccess()`
- All routes check Clerk auth + ownership
- `fetchWithRetry()` with exponential backoff (retries 5xx/network only)
- Rate limiting on triage endpoints (5 req/60s per user, 429 + Retry-After)
- PATCH routes build update payload explicitly (not blindly passing parsed.data)
- Only `status: "routed"` accepted directly; `"resolved"` is implicit via disposition

## AI & Triage

- Multi-provider: Anthropic, OpenAI, Google — factory function `getProvider(name, apiKey, model)`
- SSE streaming for triage results via `createSSEStream()` + `sseResponse()`
- Triage is manual only (no auto-trigger after upload)
- API keys encrypted at rest (AES-256-GCM in `src/lib/crypto.ts`)
- Cost calculator keyed by `"provider/model"` string, falls back to provider default

## R2 / Photos

- R2 key format: `estates/{estateId}/items/{itemId}/{uuid}.{ext}`
- Items are groups of 1–5 photos
- Signed URLs with 3600s expiry
- `getFileBuffer()` for downloading photos from R2 for AI triage
- R2 client uses `getBucket()` function (not const) so tests can set env vars after module load

## Testing

- Vitest + jsdom + Testing Library + jest-dom
- `@testing-library/jest-dom/vitest` imported in setup.ts for DOM matchers
- Global toast mock in setup.ts to prevent context errors in component tests
- Toast-specific tests use `vi.unmock("@/components/toast")`
- DB tests use `// @vitest-environment node` directive; auto-skip without DATABASE_URL
- API route tests with FormData need `// @vitest-environment node`
- S3 mocks use `class` syntax (not `vi.fn().mockImplementation`) for `new` compatibility
- Drizzle table mocks route by reference: `if (table === itemPhotos)` — import real schema tables
- `vi.hoisted()` needed for mock functions used inside `vi.mock()` factories
- Vitest config `exclude: ["e2e/**"]` — prevents Playwright from running in vitest
- E2E: Playwright with `@clerk/testing`, chromium + mobile Chrome

## Naming

- camelCase for variables and functions
- PascalCase for components and types
- kebab-case for file names
- Test files: `__tests__/` directories next to source, named `*.test.ts(x)`
