# Build Plan — A2B Manager

---

## Current State

**Phases 1–2 complete.** Estate CRUD is fully functional end-to-end. What exists:

- **Estate lifecycle**: Create, list, view, inline edit, status transitions (active → resolving → closed), delete — all with persistent data in Neon
- **API routes**: POST/GET `/api/estates`, GET/PATCH/DELETE `/api/estates/[id]` with auth, ownership checks, Zod validation, status transition enforcement
- **Pages**: Dashboard (active estates), estate list, create form, estate detail with inline editing
- **Shared components**: StatusBadge (color-coded per status), EstateCard (linked card with name/address, badge, item count, date)
- **Validation**: Zod schemas shared between API and client forms; `parseUpdateEstate()` wrapper for update payloads
- **Auth helpers**: `getAuthUserId()`, `jsonError()`, `jsonSuccess()` in `src/lib/api.ts`
- **Data model**: Address is the primary identifier; estate name is optional (added later to help sell the estate sale). `estates.name` column is nullable.
- Shell component (mobile bottom nav + desktop sidebar) with Clerk `<UserButton>`
- Tailwind v4 dark theme with all brand tokens
- **Database**: Drizzle ORM schema with 3 tables (estates, items, item_photos) and 3 enums, Neon HTTP client
- **Authentication**: Clerk middleware protecting all routes, `<ClerkProvider>` with dark theme
- **Test infrastructure**: Vitest + jsdom + Testing Library + jest-dom, Clerk mocks, test factories — **102 tests passing**

What does **not** exist yet:

- Image storage (no R2 integration)
- AI integration (no provider adapters)
- Item creation or photo upload
- Settings page functionality

---

## Testing Philosophy

**Write the test first, then make it pass.** Every piece of business logic — API routes, database operations, AI adapters, utilities — gets tested before the UI that consumes it is built.

- **Unit tests** for pure logic: schema validation, data transforms, utility functions, AI response parsing
- **Integration tests** for API routes: real HTTP requests against handlers with a test database
- **Component tests** for interactive UI: forms, upload flows, streaming displays
- **E2E tests** for critical user journeys: estate creation, photo upload → triage, item resolution

Tests are not an afterthought bolted on at the end. Each phase includes a "Tests" section that defines what must pass before the phase is considered complete. The test suite is the **proof that the phase works**.

---

## Phase Overview

| Phase | Name | Goal |
|-------|------|------|
| 1 | Foundation | Database, auth, test infra, and environment — the plumbing everything else depends on |
| 2 | Estate CRUD | Create, read, update, delete estates with real data flowing end-to-end |
| 3 | Item & Photo Pipeline | Photo upload, HEIC conversion, R2 storage, item creation |
| 4 | AI Triage Engine | Multi-provider AI integration, SSE streaming, structured triage results |
| 5 | Routing & Resolution | Tier-based routing UX, disposition tracking, item lifecycle completion |
| 6 | Settings UI & Cost Tracking | Full settings page UI, token usage dashboard (app-level settings API built in Phase 4) |
| 7 | Polish & Production | Error handling, loading states, empty states, mobile UX refinement, deploy |

Each phase builds on the last. No phase should start until the previous phase is functional and **all tests pass**.

---

## Phase 1 — Foundation

**Goal:** Database connected, auth protecting routes, test infrastructure ready, environment configured.

### 1.1 Environment Setup

- [x] Create `.env.example` documenting every required variable
- [x] Add `!.env.example` to `.gitignore` so template is tracked
- [x] Variables: `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, R2 vars (commented out for Phase 3)

> **Note:** Dropped `DATABASE_URL_TEST` — live DB tests use the same `DATABASE_URL` and truncate between runs. No `.env.local` created (user provides their own).

### 1.2 Test Infrastructure

- [x] Install vitest, @vitejs/plugin-react, @testing-library/react, @testing-library/dom, @testing-library/user-event, jsdom, msw, vite-tsconfig-paths
- [x] Create `vitest.config.ts` with tsconfigPaths + react plugins, jsdom env, setup file, V8 coverage
- [x] Create `src/test/setup.ts` — global Clerk mock, afterEach restoreAllMocks
- [x] Create `src/test/helpers.ts` — `mockClerkUser()`, `createTestEstate()`, `createTestItem()`, `createTestItemPhoto()`, `resetFactoryCounter()`
- [x] Create `src/test/db.ts` — `getTestDb()` and `cleanDb()` for live DB tests
- [x] Add scripts: test, test:watch, test:coverage, test:ui, db:generate, db:migrate, db:push, db:studio
- [x] Add `"types": ["vitest/globals"]` to tsconfig.json
- [x] `npm test` passes

> **Note:** Playwright deferred to Phase 7 as planned. MSW imported but not activated yet (Phase 2+).

### 1.3 Database

- [x] Install `drizzle-orm`, `@neondatabase/serverless`, `drizzle-kit`
- [x] Create `src/db/schema.ts` — 3 tables (estates, items, item_photos), 3 enums (estate_status, item_status, item_tier)
- [x] Create `src/db/index.ts` — Neon HTTP driver + Drizzle client with relational schema
- [x] Create `drizzle.config.ts`
- [x] All 8 db scripts in package.json

> **Note:** `drizzle-kit push` not run — requires user's DATABASE_URL. User runs `npm run db:push` after setting up `.env.local`.

### 1.4 Database Tests

- [x] `src/db/__tests__/schema.test.ts` — 20 tests covering table structure, column counts, nullability, types, FK cascades, enum values (all pass, no DB needed)
- [x] `src/db/__tests__/queries.test.ts` — 9 tests covering insert/retrieve, defaults, FK validation, cascade deletes, status/tier filtering (auto-skip without DATABASE_URL)

### 1.5 Authentication

- [x] Install `@clerk/nextjs`, `@clerk/themes`
- [x] Create `src/middleware.ts` — clerkMiddleware with public routes for sign-in/sign-up
- [x] Wrap root layout with `<ClerkProvider appearance={{ baseTheme: dark }}>`
- [x] Add `<UserButton>` to Shell: desktop sidebar (bottom, border-top section) and mobile nav (fourth item)
- [x] `afterSignOutUrl="/sign-in"` on both UserButtons

> **Note:** Next.js 16 shows deprecation warning about middleware → proxy convention. Middleware still works; we'll migrate in a future phase if needed.

### 1.6 Auth Tests

- [x] `src/middleware.test.ts` — 15 tests covering: config export, route matcher setup, public routes (sign-in, sign-up + subpaths), protected routes (/, /estates/*, /settings, /api/*)

### 1.7 Deliverable

- [x] `npm test` — **35 tests pass**, 9 skipped (live DB tests without DATABASE_URL)
- [x] `npm run build` — clean production build, no errors
- [x] `npm run db:push` — **user action required** (set DATABASE_URL in .env.local first)
- [x] Manual verification: dev server redirects to Clerk sign-in, UserButton visible after auth

---

## Phase 2 — Estate CRUD

**Goal:** Operators can create, view, edit, and manage estates with real data.

### 2.1 API Routes

- [x] `POST /api/estates` — create estate (address required, name optional; attach user_id from Clerk session)
- [x] `GET /api/estates` — list estates for authenticated user (support `?status=` filter)
- [x] `GET /api/estates/[id]` — get single estate (verify ownership)
- [x] `PATCH /api/estates/[id]` — update estate fields (name, address, client_name, notes, status)
- [x] `DELETE /api/estates/[id]` — delete estate (only if no items)

### 2.2 API Route Tests

- [x] `src/app/api/estates/__tests__/route.test.ts` — 10 tests (POST: valid→201, missing name→400, missing address→400, unauth→401, attaches userId; GET: returns estates, empty array, filters by status, invalid status→400, unauth→401)
- [x] `src/app/api/estates/[id]/__tests__/route.test.ts` — 15 tests (GET: own→200, missing→404, non-owner→403, unauth→401; PATCH: update fields, valid transitions, invalid transitions→400, non-owner→403, empty body→400; DELETE: empty→200, has items→409, non-owner→403, missing→404)

### 2.3 Estate List Page (`/estates`)

- [x] Server Component queries DB directly (no API round-trip)
- [x] Display as card grid: name or address as title (MapPin icon), status badge, item count (Package icon), date
- [x] Status badges: active (green), resolving (amber), closed (muted)
- [x] Empty state: "No estates yet. Time to start digging." with green CTA
- [x] "New Estate" button in header

### 2.4 Create Estate Page (`/estates/new`)

- [x] Form: address (required), estate name (optional — added later is fine), client name (optional), notes (optional)
- [x] Client-side Zod validation with inline error messages per field
- [x] Submit → POST to API → redirect to estate detail page
- [x] Disabled button + "Creating..." text while in flight
- [x] Green asterisk on address (only required field)
- [x] `data-1p-ignore` + `autoComplete="off"` to prevent password manager interference

### 2.5 Component Tests

- [x] `src/components/__tests__/status-badge.test.tsx` — 6 tests (renders correct text, applies correct CSS classes per status)
- [x] `src/components/__tests__/estate-card.test.tsx` — 7 tests (name, address, badge, item count plural/singular, link href, date)
- [x] `src/app/estates/__tests__/estate-list.test.tsx` — 5 tests (cards render, empty state, CTA link, header button, status badges)
- [x] `src/app/estates/new/__tests__/create-estate-form.test.tsx` — 5 tests (all fields render, validation errors, fetch called, redirect, button disabled)

### 2.6 Estate Detail Page (`/estates/[id]`)

- [x] Header: name or address as title (MapPin only when name present), status badge
- [x] Metadata: clientName, notes if present
- [x] Edit button → inline form (address first, estate name second) with `data-1p-ignore` (PATCH to API, router.refresh())
- [x] Status advancement: "Start Resolving" / "Close Estate" with confirmation dialog (hidden when closed)
- [x] Delete button (only shown when itemCount === 0, with confirm dialog)
- [x] Items section placeholder: "No items yet. Grab your camera."
- [x] Server Component: auth → query estate with item count → notFound for missing/non-owner

### 2.7 Dashboard (`/`)

- [x] Server Component queries active estates for authenticated user
- [x] "New Estate" button in header
- [x] Active estates as EstateCards in responsive grid
- [x] Empty state: "No active estates. Time to start digging."

### 2.8 Validation Layer

- [x] `src/lib/validations/estate.ts` — Zod schemas shared between API and client: createEstateSchema, parseUpdateEstate
- [x] `src/lib/validations/__tests__/estate.test.ts` — 13 tests (create: valid, missing fields, trim, empty strings, optional→null; update: partial, status enum, empty object)
- [x] `src/lib/api.ts` — getAuthUserId, jsonError, jsonSuccess helpers
- [x] `src/lib/__tests__/api.test.ts` — 6 tests

### 2.9 Deliverable

- [x] `npm test` — **102 tests pass** (9 skipped for live DB)
- [x] `npm run build` — clean production build
- [x] `npm run lint` — no errors

> **Deviations from plan:**
> - **Name is optional** — estates are indexed by address; name is added later to help sell the estate sale. DB column changed from `notNull` to nullable.
> - **Address-first field order** — address is the primary identifier, shown first in all forms and as the card/detail title when no name exists.
> - Zod v4 (installed version) doesn't support `.pipe()` chaining well; used `parseUpdateEstate()` wrapper function instead of `updateEstateSchema` for update validation
> - Zod optional fields use `.nullable()` so JSON `null` values pass through (client sends `parsed.data` with nulls back to API)
> - Added `@testing-library/jest-dom/vitest` to test setup for DOM matchers (toBeInTheDocument, toHaveAttribute)
> - Pages use Server Components querying DB directly (not API routes) for data fetching — API routes only for client mutations
> - Status transitions have confirmation dialogs ("Start Resolving? This cannot be undone.") since transitions are forward-only
> - Status transition validation uses a whitelist map: `{ active: ["resolving"], resolving: ["closed"], closed: [] }`
> - `data-1p-ignore` attributes on all form inputs to prevent 1Password from treating estate forms as credential forms

---

## Phase 3 — Item & Photo Pipeline

**Goal:** Operators can upload photos to an estate, creating items with photos stored in R2.

### 3.1 R2 Integration

- [x] Install `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` (S3-compatible client for R2)
- [x] Create `src/lib/r2.ts` — R2 client with upload, delete, batch delete, and signed URL generation

### 3.2 R2 Tests

- [x] `src/lib/__tests__/r2.test.ts` (12 tests):
  - `uploadFile()` — sends file to R2 via PutObjectCommand
  - `deleteFile()` — deletes file by key
  - `deleteFiles()` — batch delete
  - `getSignedViewUrl()` — returns signed URL with 3600s expiry
  - Rejects files exceeding 15MB size limit
  - Generates correct R2 key format (`estates/{estateId}/items/{itemId}/{uuid}.{ext}`)
  - Propagates S3 errors

> **Note:** Used `vi.mock` instead of MSW for S3 mocking — matches existing `@/db` mock pattern. Added `@aws-sdk/s3-request-presigner` for signed URL generation (uses GetObjectCommand, not PutObjectCommand).

### 3.3 Client-Side HEIC Conversion

- [x] Install `heic2any`
- [x] Create `src/types/heic2any.d.ts` — type declaration (no `@types/heic2any` exists)
- [x] Create `src/lib/heic-convert.ts` — `isHeicFile()`, `convertHeicToJpeg()`, `prepareFilesForUpload()`

### 3.4 HEIC Conversion Tests

- [x] `src/lib/__tests__/heic-convert.test.ts` (12 tests):
  - HEIC/HEIF detected by MIME type and extension (including `application/octet-stream`)
  - JPEG, PNG, WebP pass through unchanged
  - Converted result is JPEG File with `.jpg` extension
  - Handles conversion failure
  - Mixed file types handled correctly

### 3.5 Photo Upload API

- [x] `POST /api/estates/[id]/items` — accept multipart FormData (1-5 photos), create item + upload to R2 + create item_photos
- [x] `GET /api/estates/[id]/items` — list items with first-photo thumbnails (signed URLs)
- [x] `GET /api/items/[id]` — get item with all photos and signed URLs
- [x] `PATCH /api/items/[id]` — update notes/disposition
- [x] `DELETE /api/items/[id]` — delete item, clean up R2 files

> **Note:** Dropped the standalone `POST /api/upload` endpoint — not needed since upload is always tied to item creation. Added DELETE endpoint for items per user request.

### 3.6 Upload API Tests

- [x] `src/app/api/estates/[id]/items/__tests__/route.test.ts` (15 tests):
  - POST with 1 photo, 5 photos
  - Rejects 0 photos, >5 photos, non-image files
  - 404/403/401 auth guards
  - Item created with status `pending`, tier `null`
  - GET returns items with thumbnail URLs, empty array, null thumbnails
- [x] `src/app/api/items/[id]/__tests__/route.test.ts` (15 tests):
  - GET returns item with photos and signed URLs
  - PATCH updates notes, disposition, rejects invalid JSON
  - DELETE removes item and R2 files, handles no-photo case
  - 404/403/401 auth guards for all methods

> **Note:** Combined GET items list tests into the main items route test file. Used table reference comparison for mock routing.

### 3.7 Upload Page (`/estates/[id]/upload`)

- [x] Photo picker with native file selector (accepts images + HEIC)
- [x] Multi-select: 1-5 photos per item
- [x] Preview thumbnails with remove button per photo
- [x] Upload state machine: idle → preparing → uploading → success/error
- [x] Success state with "Upload Another" (reset) and "Back to Estate" CTAs
- [x] Server component with auth + estate ownership check

### 3.8 Upload Component Tests

- [x] `src/app/estates/[id]/upload/__tests__/upload-form.test.tsx` (10 tests):
  - File input accepts image types + HEIC
  - Preview thumbnails on selection
  - Upload button disabled/enabled based on selection
  - Success state after upload
  - "Upload Another" resets form
  - Remove button per photo
  - Error state on upload failure

### 3.9 Item List on Estate Detail

- [x] Estate detail page queries items with first photo per item, generates signed URLs
- [x] "Upload Photos" CTA button (accent green, links to upload page) — shown for active estates only
- [x] `<ItemCard>` grid when items exist, empty state when no items
- [x] Tier badge colors match brand tokens
- [x] Pending items shown with "Awaiting triage" text

- [x] `src/app/estates/[id]/__tests__/estate-detail-items.test.tsx` (6 tests)

> **Note:** Sorting/filtering deferred to Phase 5 — not needed until items have tiers assigned by AI.

### 3.10 Item Detail Page (`/estates/[id]/items/[itemId]`)

- [x] Photo gallery with main image + thumbnail strip (clickable)
- [x] Triage placeholder ("Results will appear here after AI analysis")
- [x] Valuation placeholder
- [x] Editable notes field with save button (appears on change)
- [x] Disposition placeholder
- [x] Tier + status badges, back-to-estate link
- [x] Delete item button with confirmation

- [x] `src/app/estates/[id]/items/[itemId]/__tests__/item-detail.test.tsx` (10 tests)

### 3.11 Shared Components

- [x] `src/components/tier-badge.tsx` — null→"Pending" (muted), "1"→tier-1, "2"→tier-2, "3"→tier-3, "4"→tier-4
- [x] `src/components/item-card.tsx` — thumbnail (or placeholder), tier badge, status, AI identification or "Awaiting triage"
- [x] `src/lib/validations/item.ts` — `MAX_PHOTOS`, `MIN_PHOTOS`, `MAX_FILE_SIZE`, `ALLOWED_MIME_TYPES`, `updateItemSchema`

- [x] `src/components/__tests__/tier-badge.test.tsx` (5 tests)
- [x] `src/components/__tests__/item-card.test.tsx` (8 tests)
- [x] `src/lib/validations/__tests__/item.test.ts` (10 tests)

### 3.12 Config & Helpers

- [x] `next.config.ts` — `serverActions.bodySizeLimit: "20mb"` for large uploads
- [x] `src/test/helpers.ts` — added `createMockFile()` factory

### 3.13 Deliverable

End-to-end photo workflow: navigate to estate → tap Upload Photos → select photos → HEIC auto-converts → item created with photos stored in R2 → item visible on estate detail as card → tap item → photo gallery + notes + triage placeholders. Delete item supported. **205 tests passing (103 new), clean build, no lint errors.**

---

## Phase 4 — AI Triage Engine

**Goal:** Photos trigger AI analysis. Results stream back in real-time with identification, tier, and valuation.

### 4.1 AI Provider Interface

- [ ] Create `src/lib/ai/types.ts` — shared types:
  - `TriageRequest` — photos (as base64 or URLs), estate context, system prompt
  - `TriageResult` — identification, tier, confidence, value range, comps, listing guidance
  - `AIProvider` interface — `triage(request): AsyncIterable<string>` for streaming
- [ ] Create `src/lib/ai/prompt.ts` — system prompt derived from Project.md principles (identification, tier classification, valuation, comps, confidence, additional photo requests, listing guidance for tier 3+)

### 4.2 Provider Adapters

- [ ] Create `src/lib/ai/providers/anthropic.ts` — Claude adapter (vision API with streaming)
- [ ] Create `src/lib/ai/providers/openai.ts` — GPT-4o adapter (vision API with streaming)
- [ ] Create `src/lib/ai/providers/google.ts` — Gemini adapter (vision API with streaming)
- [ ] Create `src/lib/ai/index.ts` — factory function: `getProvider(name, apiKey, model) → AIProvider`
- [ ] Each adapter:
  - Accepts photos as base64-encoded images
  - Sends standardized system prompt + photos
  - Returns async iterable of text chunks (streaming)
  - Reports token usage after completion

### 4.3 AI Provider Tests

- [ ] `src/lib/ai/__tests__/prompt.test.ts`:
  - System prompt includes all required sections (identification, tier, valuation, comps, confidence, listing guidance)
  - Prompt is under token limit for all providers
  - Estate context is correctly interpolated into prompt
- [ ] `src/lib/ai/__tests__/provider-factory.test.ts`:
  - `getProvider("anthropic", key, model)` returns Anthropic adapter
  - `getProvider("openai", key, model)` returns OpenAI adapter
  - `getProvider("google", key, model)` returns Google adapter
  - Throws on unknown provider name
  - Throws on missing API key
- [ ] `src/lib/ai/providers/__tests__/anthropic.test.ts`:
  - Sends correct request format to Claude API (MSW mock)
  - Streams response chunks as async iterable
  - Parses token usage from response
  - Handles API errors (401 invalid key, 429 rate limit, 500 server error)
  - Handles network timeout
- [ ] `src/lib/ai/providers/__tests__/openai.test.ts`:
  - Same test pattern as Anthropic adapter
- [ ] `src/lib/ai/providers/__tests__/google.test.ts`:
  - Same test pattern as Anthropic adapter
- [ ] `src/lib/ai/__tests__/parse-triage.test.ts`:
  - Parses well-formed AI response into structured `TriageResult`
  - Extracts tier classification (1-4) correctly
  - Extracts value range (low, high)
  - Extracts confidence level
  - Handles malformed response gracefully (returns partial result + raw text)
  - Handles response with missing sections (e.g., no comps for Tier 1 item)

### 4.4 Two-Tier Settings Architecture

There are two levels of settings in this app:

1. **App-level settings** (`/settings` page, stored in DB) — Shared configuration that affects how the app works for everyone. Any logged-in user who changes these is changing them for all users. Examples: default AI provider, default model, API keys for AI providers.
2. **User-level settings** (Clerk user metadata, managed via Clerk `<UserButton>`) — Personal to each user. Examples: profile, display name, auth preferences, notification prefs. Clerk handles this out of the box.

Phase 4 builds the **app-level settings** needed for AI triage to work. The full settings page UI and cost tracking are Phase 6.

### 4.5 App Settings Storage

- [ ] Add `app_settings` table to `src/db/schema.ts` — singleton row pattern (single row, upsert on write):
  - `id` (integer, primary key, always `1`)
  - `ai_provider` (enum: anthropic/openai/google, default: anthropic)
  - `ai_model` (string — specific model ID, nullable)
  - `api_key_anthropic` (encrypted string, nullable)
  - `api_key_openai` (encrypted string, nullable)
  - `api_key_google` (encrypted string, nullable)
  - `updated_at` (timestamp)
  - `updated_by` (text — Clerk user ID of who last changed settings)
- [ ] Create `src/lib/crypto.ts` — encrypt/decrypt helpers for API keys (AES-256-GCM, key from `ENCRYPTION_SECRET` env var)
- [ ] `GET /api/settings` — return current app settings (API keys masked, e.g., `sk-...XYZ`)
- [ ] `PUT /api/settings` — upsert app settings (provider, model, API keys)
- [ ] API key encryption: encrypt at rest in DB, decrypt only server-side when making AI calls

### 4.6 Settings API Tests

- [ ] `src/lib/__tests__/crypto.test.ts`:
  - Encrypt → decrypt round-trip returns original value
  - Encrypted value is not plaintext
  - Different inputs produce different ciphertext
  - Decrypt with wrong secret throws
- [ ] `src/app/api/settings/__tests__/route.test.ts`:
  - **GET** returns provider and model, API keys masked (e.g., `sk-...XYZ`)
  - **GET** returns defaults when no settings saved yet (first run)
  - **PUT** saves provider selection
  - **PUT** saves and encrypts API key
  - **PUT** rejects invalid provider name
  - **PUT** records `updated_by` with the current user's Clerk ID
  - Encrypted key in DB does not match plaintext input
  - Decrypted key matches original input (round-trip encryption test)

### 4.7 Triage API with SSE

- [ ] `POST /api/items/[id]/triage` — trigger triage:
  - Load item photos from R2
  - Load app settings from DB (provider, model, decrypt API key)
  - Call the appropriate provider adapter
  - Return immediately with 202 Accepted
- [ ] `GET /api/items/[id]/triage/stream` — SSE endpoint:
  - Open SSE connection
  - Stream AI response tokens as they arrive
  - On completion: parse structured result, update item record (tier, ai_identification, ai_valuation, ai_raw_response, ai_provider, tokens_used, status → triaged)
  - Close SSE connection

### 4.8 Triage API Tests

- [ ] `src/app/api/items/[id]/triage/__tests__/route.test.ts`:
  - **POST** triggers triage, returns 202
  - Rejects item with no photos → 400
  - Rejects when no app settings / API key configured → 400 with clear message
  - Rejects non-owned item → 403
  - Item status updates to `triaged` after completion
  - Item record populated: tier, ai_identification, ai_valuation, ai_raw_response, tokens_used
- [ ] `src/app/api/items/[id]/triage/__tests__/stream.test.ts`:
  - SSE connection opens with correct headers (`Content-Type: text/event-stream`)
  - Streams chunks in SSE format (`data: ...\n\n`)
  - Sends `[DONE]` event on completion
  - Handles provider error mid-stream (sends error event, closes connection)

### 4.9 Triage UI

- [ ] After upload, auto-trigger triage (or manual "Triage" button)
- [ ] Item detail page: real-time streaming text area showing AI response as it arrives
- [ ] On completion: structured display of:
  - Identification (what it is)
  - Tier badge (color-coded)
  - Confidence indicator
  - Value range
  - Comparable sales
  - Additional photo requests (if any)
  - Listing guidance (tier 3+ only)
- [ ] Upload page: after uploading photos, show streaming triage inline so operator doesn't need to navigate away

### 4.10 Triage UI Tests

- [ ] `src/app/estates/[id]/items/[itemId]/__tests__/triage-display.test.tsx`:
  - Shows "Triage" button for pending items
  - Triage button triggers API call
  - Streaming text renders incrementally (simulate SSE with mock)
  - On completion, structured result displays: tier badge, value range, identification
  - Tier badge shows correct color for each tier (1-4)
  - "Request more photos" section appears when AI requests them
  - Listing guidance section appears only for tier 3+

### 4.11 Batch Triage

- [ ] Support triggering triage on multiple items sequentially
- [ ] Estate detail: "Triage All Pending" button that processes untriaged items in queue
- [ ] Progress indicator: "Triaging item 3 of 12..."

### 4.12 Deliverable

Upload photos → AI analyzes them → results stream in real-time → item gets tier classification, identification, and valuation. Works with at least one AI provider (Anthropic Claude recommended as primary). **All provider, parsing, API, SSE, and component tests pass.**

---

## Phase 5 — Routing & Resolution

**Goal:** Items move through the full pipeline: triage → route → resolve. Operators track disposition.

### 5.1 Routing UX

- [ ] After triage, item status advances to `routed`
- [ ] Item detail shows routing guidance based on tier:
  - **Tier 1:** "Tag and move on. Bulk lot, donate, or dispose."
  - **Tier 2:** "Price tag it. AI suggests: $XX–$XX"
  - **Tier 3:** "Pull for research. Take full photo set." + listing platform recommendation
  - **Tier 4:** "Secure this item. Potential high value." + specialist/auction guidance
- [ ] Color-coded visual treatment per tier on the item card

### 5.2 Disposition Tracking

- [ ] `PATCH /api/items/[id]` — update disposition field
- [ ] Disposition options by tier:
  - **Tier 1:** Bulk lot, Donated, Trashed
  - **Tier 2:** Sold onsite, Listed online
  - **Tier 3:** Listed (eBay, Mercari, FB Marketplace, other), Sold, Unsold
  - **Tier 4:** Consigned to auction, Sold through dealer, Appraised, Held
- [ ] Sold items: capture actual sale price for revenue tracking
- [ ] Item status advances to `resolved` when disposition is set

### 5.3 Routing & Disposition Tests

- [ ] `src/lib/__tests__/disposition.test.ts`:
  - Returns correct disposition options for each tier
  - Tier 1 items cannot be set to "Consigned to auction"
  - Tier 4 items include all specialist options
  - Setting a disposition advances item status to `resolved`
  - Sold disposition requires a sale price
  - Sale price must be a positive number
- [ ] `src/app/api/items/[id]/__tests__/disposition.test.ts`:
  - **PATCH** with valid disposition → updates item, status → resolved
  - **PATCH** with disposition mismatched to tier → 400
  - **PATCH** with "sold" disposition but no price → 400
  - **PATCH** on already-resolved item → 400 (or allows override with flag)
  - Returns 403 for non-owner
- [ ] `src/app/estates/[id]/items/[itemId]/__tests__/routing.test.tsx`:
  - Tier 1 item shows "Tag and move on" guidance
  - Tier 2 item shows price tag suggestion with value range
  - Tier 3 item shows listing platform recommendation
  - Tier 4 item shows "Secure this item" warning
  - Disposition dropdown shows only valid options for the item's tier
  - Selecting disposition and confirming updates the item

### 5.4 Estate Detail Enhancements

- [ ] Item count by tier (visual breakdown)
- [ ] Status breakdown: pending / triaged / routed / resolved
- [ ] Filter items by tier and status
- [ ] Estimated total value (sum of AI value estimates)
- [ ] Unresolved items list — what still needs attention

### 5.5 Estate Summary Tests

- [ ] `src/app/estates/[id]/__tests__/estate-summary.test.tsx`:
  - Tier breakdown shows correct counts (e.g., "5 Tier 1, 3 Tier 2, 1 Tier 3")
  - Status breakdown shows correct counts
  - Total estimated value sums correctly across items
  - Unresolved items list shows only items not yet resolved
  - Filters correctly narrow the displayed items
  - Empty estate shows zero counts, not errors

### 5.6 Estate Lifecycle Automation

- [ ] When all items in an estate are `resolved`, prompt operator to close the estate
- [ ] "Close Estate" confirmation with summary stats
- [ ] Closed estates move to archive view

### 5.7 Lifecycle Tests

- [ ] `src/lib/__tests__/estate-lifecycle.test.ts`:
  - Estate with all items resolved → `canClose` returns true
  - Estate with any unresolved items → `canClose` returns false
  - Estate with zero items → `canClose` returns false (nothing to close)
  - Closing an estate sets status to `closed` and updated_at timestamp

### 5.8 Deliverable

Full item lifecycle: upload → triage → route → resolve. Operators can track every item from photo to final disposition. Estate-level progress is visible at a glance. **All disposition, routing, summary, and lifecycle tests pass.**

---

## Phase 6 — Settings UI & Cost Tracking

**Goal:** Full settings page UI and token usage dashboard. The app-level settings API and storage were built in Phase 4 — this phase adds the polished UI and cost tracking.

> **Two-tier settings recap:** App-level settings (AI provider, model, API keys) live in the `app_settings` DB table and are shared across all users. User-level settings (profile, auth) are managed by Clerk via `<UserButton>`. See Phase 4.4 for details.

### 6.1 Settings Page (`/settings`)

- [ ] **Provider Selection:** Toggle between Anthropic, OpenAI, Google (reads/writes `app_settings` via API)
- [ ] **Model Selection:** Dropdown of available models per provider (e.g., Claude Sonnet vs Opus, GPT-4o vs GPT-4o-mini, Gemini Flash vs Pro)
- [ ] **API Key Management:**
  - Input field per provider (masked after save)
  - "Test Key" button — makes a minimal API call to verify the key works
  - Keys encrypted at rest (encryption built in Phase 4)
- [ ] **Info banner:** "These settings affect all users of this app." — to make the shared nature clear

### 6.2 Token Usage Dashboard

- [ ] `GET /api/usage` — aggregate token stats
- [ ] Track per-triage: provider, model, tokens used, estimated cost
- [ ] Display on settings page:
  - Total tokens used (lifetime)
  - Tokens this session / today
  - Estimated cost (based on known per-token pricing)
  - Per-estate breakdown
- [ ] Cost warning: alert when approaching configurable spend threshold

### 6.3 Settings & Usage Tests

- [ ] `src/app/api/usage/__tests__/route.test.ts`:
  - **GET** returns aggregated token counts
  - Groups usage by provider and model
  - Calculates estimated cost correctly for each provider's pricing
  - Per-estate breakdown sums correctly
  - Returns zeros for user with no triage history
- [ ] `src/lib/__tests__/cost-calculator.test.ts`:
  - Anthropic token pricing: input tokens × rate + output tokens × rate = correct cost
  - OpenAI token pricing: same pattern with different rates
  - Google token pricing: same pattern with different rates
  - Handles zero tokens without error
  - Rounds to 2 decimal places (cents)
- [ ] `src/app/settings/__tests__/settings-page.test.tsx`:
  - Provider selector renders all three options
  - Selecting a provider shows its available models
  - API key input is masked after save
  - "Test Key" button triggers validation call
  - Test key success shows green confirmation
  - Test key failure shows error message
  - Token usage dashboard renders with correct totals
  - Cost warning appears when threshold exceeded

### 6.4 Deliverable

Full settings page: choose provider, enter API key, test it, see cost breakdown. Operators understand their AI spend. **All usage, cost, and settings tests pass.**

---

## Phase 7 — Polish & Production

**Goal:** Production-ready app with polished UX, error handling, E2E coverage, and deployment.

### 7.1 Loading & Error States

- [ ] Skeleton loading states for all list pages (estates, items)
- [ ] Error boundaries for failed data fetches
- [ ] Toast/notification system for success/error feedback
- [ ] Retry logic for failed API calls

### 7.2 Empty States (Brand Voice)

- [ ] Dashboard, no active estates: "No active estates. Time to start digging."
- [ ] Estate detail, no items: "No items yet. Grab your camera."
- [ ] Settings, no API key: "Add your API key to start triaging."
- [ ] All empty states include actionable CTA button

### 7.3 Mobile UX Refinement

- [ ] Touch targets: minimum 44px tap areas on all interactive elements
- [ ] Swipe gestures on item cards (swipe to set disposition)
- [ ] Pull-to-refresh on list pages
- [ ] Camera/file picker optimization for mobile browsers
- [ ] Test on iOS Safari and Android Chrome

### 7.4 Performance

- [ ] Image optimization: generate thumbnails (R2 or client-side) for list views
- [ ] Lazy load images below the fold
- [ ] Pagination or infinite scroll for large item lists
- [ ] Database query optimization: indexes on estate_id, user_id, status, tier

### 7.5 Security

- [ ] Verify all API routes check Clerk authentication
- [ ] Verify estate/item ownership checks (user can only access their own data)
- [ ] API key encryption verified
- [ ] Input sanitization on all form fields
- [ ] Rate limiting on AI triage endpoints
- [ ] R2 signed URLs with expiration (no public bucket access)

### 7.6 E2E Tests (Playwright)

- [ ] Install and configure Playwright (`npx playwright install`)
- [ ] Create `e2e/` directory with test files
- [ ] `e2e/auth.test.ts`:
  - Unauthenticated user is redirected to sign-in
  - After sign-in, user lands on dashboard
- [ ] `e2e/estate-lifecycle.test.ts`:
  - Create a new estate → appears in estate list
  - Open estate → shows detail page with correct info
  - Edit estate fields → changes persist
  - Change status active → resolving → closed
- [ ] `e2e/upload-and-triage.test.ts`:
  - Navigate to estate → upload page
  - Select photos → upload completes → item appears in estate
  - Trigger triage → streaming response appears → tier badge shown
  - Item detail page shows full triage result
- [ ] `e2e/item-resolution.test.ts`:
  - Set disposition on triaged item → status changes to resolved
  - All items resolved → estate shows close prompt
  - Close estate → estate appears in closed/archive list
- [ ] `e2e/settings.test.ts`:
  - Select AI provider → save → persists on reload
  - Enter API key → masked on reload
  - Token usage shows after triaging items

### 7.7 Security Tests

- [ ] `src/lib/__tests__/security.test.ts`:
  - API key encryption round-trip: encrypt → decrypt → matches original
  - Encrypted value is not plaintext
  - Different keys produce different ciphertext
  - Cannot decrypt with wrong secret
- [ ] `e2e/security.test.ts`:
  - Direct API calls without auth token → 401
  - API calls with valid token but wrong user's resource → 403
  - Settings API never returns unmasked API keys
  - R2 signed URLs expire after timeout

### 7.8 Deployment

- [ ] Vercel project setup with environment variables
- [ ] Neon production database branch
- [ ] Cloudflare R2 production bucket
- [ ] Clerk production instance
- [ ] Custom domain (if applicable)
- [ ] Verify build passes: `npm run build` clean, no errors
- [ ] Verify full test suite passes: `npm test` and `npm run test:e2e`

### 7.9 Deliverable

Ship it. Production-deployed, auth-protected, mobile-optimized estate liquidation co-pilot. **All unit, integration, component, and E2E tests pass. Coverage targets met.**

---

## Dependency Map

```
Phase 1 (Foundation + Test Infra)
  └─▶ Phase 2 (Estate CRUD)
        └─▶ Phase 3 (Item & Photo Pipeline)
              ├─▶ Phase 4 (AI Triage Engine)
              │     └─▶ Phase 5 (Routing & Resolution)
              └─────────▶ Phase 5 (Routing & Resolution)
                            └─▶ Phase 6 (Settings & Cost Tracking)*
                                  └─▶ Phase 7 (Polish & Production)

* App-level settings storage and API are built in Phase 4 (required for
  AI triage to work). Phase 6 adds the full settings page UI and cost
  tracking dashboard. User-level settings are handled by Clerk.
```

---

## Test Coverage Targets

| Category | Target | Measured By |
|----------|--------|-------------|
| `src/db/` — schema & queries | > 90% | Vitest coverage |
| `src/lib/` — utilities, AI adapters, R2 | > 85% | Vitest coverage |
| API routes (`src/app/api/`) | > 85% | Vitest coverage |
| Components (interactive) | > 70% | Vitest + RTL |
| Critical user journeys | 5 E2E flows | Playwright pass/fail |

---

## What's Explicitly Out of v1

Per Architecture.md, these are deferred:

- Estate-level reporting dashboards (revenue vs. estimates)
- Estate merging
- Platform listing integrations (eBay, Mercari, Facebook Marketplace)
- Push/browser notifications
- Multi-user roles and permissions
- Offline support

---

## Estimated Scope per Phase

| Phase | New Files (approx) | Key Dependencies Added |
|-------|-------------------|----------------------|
| 1 | ~12 | drizzle-orm, @neondatabase/serverless, drizzle-kit, @clerk/nextjs, vitest, @testing-library/react, @testing-library/user-event, jsdom, msw |
| 2 | ~14 | — |
| 3 | ~16 | @aws-sdk/client-s3, heic2any |
| 4 | ~20 | anthropic, openai, @google/generative-ai |
| 5 | ~12 | — |
| 6 | ~8 | — |
| 7 | ~14 | playwright, @playwright/test |

---

*Version 1.1 — February 2026*
