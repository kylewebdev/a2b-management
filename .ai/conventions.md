# Conventions — A2B Manager

## Non-Obvious Decisions

- `<img>` not `next/image` for R2 signed URLs (avoids remote pattern config)
- Server Components query DB directly for reads — API routes only for client mutations
- Tailwind v4 CSS-based config via `@theme inline` in globals.css (no tailwind.config.ts)
- `app_settings` is a singleton row (always id=1)
- Clerk user IDs stored as `text` not `uuid`
- R2 client uses `getBucket()` function (not const) so tests can set env vars after module load
- PATCH routes build update payload explicitly (not blindly passing parsed.data)
- Only `status: "routed"` accepted directly; `"resolved"` is implicit via disposition
- Status transitions enforced via whitelist map (forward-only, irreversible)
- Triage is manual only (no auto-trigger after upload)

## Gotchas

- Next.js 16 async params: `params: Promise<{...}>` pattern on all pages
- Zod v4 `.pipe()` doesn't work well — use wrapper functions for update validation
- Zod optional fields need `.nullable()` for JSON roundtrip (client sends `null` not `undefined`)
- S3 mocks use `class` syntax (not `vi.fn().mockImplementation`) for `new` compatibility
- Drizzle table mocks route by reference: `if (table === itemPhotos)` — import real schema tables
- `vi.hoisted()` needed for mock functions used inside `vi.mock()` factories
- DB/FormData tests need `// @vitest-environment node` directive
