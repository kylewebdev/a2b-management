# Build Plan — A2B Manager

---

## Current State

The codebase has **foundation plumbing in place** (Phase 1 complete). What exists:

- 7 page routes (all placeholder content, no real data or forms)
- Shell component (mobile bottom nav + desktop sidebar) with Clerk `<UserButton>`
- Tailwind v4 dark theme with all brand tokens
- Plus Jakarta Sans font, TypeScript strict mode, path aliases
- **Database**: Drizzle ORM schema with 3 tables (estates, items, item_photos) and 3 enums, Neon HTTP client
- **Authentication**: Clerk middleware protecting all routes, `<ClerkProvider>` with dark theme, sign-in/sign-up public routes
- **Test infrastructure**: Vitest + jsdom + Testing Library, Clerk mocks, test factories, live DB helpers — 35 tests passing

What does **not** exist yet:

- API routes (zero)
- Image storage (no R2 integration)
- AI integration (no provider adapters)
- Any business logic, forms, or real data flow

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
| 6 | Settings & Cost Tracking | AI provider config, API key management, token usage dashboard |
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
- [ ] `npm run db:push` — **user action required** (set DATABASE_URL in .env.local first)
- [ ] Manual verification: dev server redirects to Clerk sign-in, UserButton visible after auth

---

## Phase 2 — Estate CRUD

**Goal:** Operators can create, view, edit, and manage estates with real data.

### 2.1 API Routes

- [ ] `POST /api/estates` — create estate (validate name + address required; attach user_id from Clerk session)
- [ ] `GET /api/estates` — list estates for authenticated user (support `?status=` filter)
- [ ] `GET /api/estates/[id]` — get single estate (verify ownership)
- [ ] `PATCH /api/estates/[id]` — update estate fields (name, address, client_name, notes, status)
- [ ] `DELETE /api/estates/[id]` — delete estate (only if no items, or soft-delete)

### 2.2 API Route Tests

- [ ] `src/app/api/estates/__tests__/route.test.ts`:
  - **POST /api/estates**
    - Creates estate with valid data → 201, returns estate with id
    - Rejects missing name → 400 with validation error
    - Rejects missing address → 400 with validation error
    - Attaches authenticated user_id automatically
    - Rejects unauthenticated request → 401
  - **GET /api/estates**
    - Returns only estates belonging to authenticated user
    - Filters by `?status=active` correctly
    - Returns empty array when user has no estates
    - Does not leak other users' estates
  - **GET /api/estates/[id]**
    - Returns estate when user owns it
    - Returns 404 for non-existent estate
    - Returns 403 when user doesn't own the estate
  - **PATCH /api/estates/[id]**
    - Updates name, address, client_name, notes
    - Advances status: active → resolving → closed
    - Rejects invalid status transitions (closed → active)
    - Returns 403 for non-owner
  - **DELETE /api/estates/[id]**
    - Deletes estate with no items
    - Returns error when estate has items (or soft-deletes)
    - Returns 403 for non-owner

### 2.3 Estate List Page (`/estates`)

- [ ] Fetch estates from API on load
- [ ] Display as card list: name, address, status badge, item count, created date
- [ ] Status badges use tier-style color coding: active (green), resolving (amber), closed (muted)
- [ ] Empty state: "No estates yet. Time to start digging." with CTA to create
- [ ] Link to create new estate

### 2.4 Create Estate Page (`/estates/new`)

- [ ] Form: name (required), address (required), client name (optional), notes (optional)
- [ ] Submit → POST to API → redirect to estate detail page
- [ ] Validation: inline errors, required field indicators
- [ ] Mobile-optimized form layout

### 2.5 Component Tests

- [ ] `src/app/estates/__tests__/estate-list.test.tsx`:
  - Renders estate cards when data is present
  - Shows empty state when no estates exist
  - Status badges render correct colors per status
- [ ] `src/app/estates/new/__tests__/create-estate.test.tsx`:
  - Form renders all fields
  - Submit with valid data calls API
  - Displays validation errors for missing required fields
  - Submit button disabled while request is in flight

### 2.6 Estate Detail Page (`/estates/[id]`)

- [ ] Header: estate name, address, status badge
- [ ] Edit button → inline editing or modal for estate fields
- [ ] Status controls: advance estate through lifecycle (active → resolving → closed)
- [ ] Items section (empty for now, placeholder for Phase 3)
- [ ] Summary stats placeholder (item counts, value totals — wired up in later phases)

### 2.7 Dashboard (`/`)

- [ ] Show active estates (status = active) as primary content
- [ ] Quick-access cards: estate name, address, item count
- [ ] "New Estate" button
- [ ] Empty state when no active estates

### 2.8 Deliverable

Full estate lifecycle management. Create an estate, see it in the list, open it, edit it, change its status, delete it. All data persists in Neon. **All API and component tests pass.**

---

## Phase 3 — Item & Photo Pipeline

**Goal:** Operators can upload photos to an estate, creating items with photos stored in R2.

### 3.1 R2 Integration

- [ ] Install `@aws-sdk/client-s3` (S3-compatible client for R2)
- [ ] Create `src/lib/r2.ts` — R2 client with upload, delete, and signed URL generation

### 3.2 R2 Tests

- [ ] `src/lib/__tests__/r2.test.ts`:
  - `uploadFile()` — sends file to R2, returns key (use MSW to mock S3 endpoint)
  - `deleteFile()` — deletes file by key
  - `getSignedUrl()` — returns a signed URL with correct expiration
  - Handles upload errors gracefully (network failure, invalid credentials)
  - Rejects files exceeding size limit
  - Generates correct R2 key format (includes estate_id and item_id in path)

### 3.3 Client-Side HEIC Conversion

- [ ] Install `heic2any`
- [ ] Create `src/lib/heic-convert.ts` — utility that checks file type and converts HEIC/HEIF → JPEG

### 3.4 HEIC Conversion Tests

- [ ] `src/lib/__tests__/heic-convert.test.ts`:
  - HEIC file is detected and converted to JPEG blob
  - JPEG file passes through unchanged
  - PNG file passes through unchanged
  - WebP file passes through unchanged
  - Conversion preserves reasonable file size (not bloating 10x)
  - Returns correct MIME type after conversion
  - Handles conversion failure gracefully (corrupted file)

### 3.5 Photo Upload API

- [ ] `POST /api/estates/[id]/items` — accept multipart form data (1-5 photos)
  - Create an `item` record (status: pending, tier: null)
  - Upload each photo to R2
  - Create `item_photo` records linking to the item
  - Return the created item with photo URLs
- [ ] `POST /api/upload` — standalone upload endpoint if needed for re-uploads or additional photos

### 3.6 Upload API Tests

- [ ] `src/app/api/estates/[id]/items/__tests__/route.test.ts`:
  - **POST** with 1 photo → creates item + 1 item_photo record, returns item
  - **POST** with 5 photos → creates item + 5 item_photo records
  - Rejects 0 photos → 400
  - Rejects > 5 photos → 400
  - Rejects non-image files → 400
  - Rejects request for non-existent estate → 404
  - Rejects request for non-owned estate → 403
  - Item created with status `pending`, tier `null`
  - Photos stored in R2 with correct keys
  - item_photo records have correct sort_order (1, 2, 3...)
- [ ] `src/app/api/estates/[id]/items/__tests__/list.test.ts`:
  - **GET** returns items for estate with photo URLs
  - Returns empty array for estate with no items
  - Does not return items from other estates
- [ ] `src/app/api/items/[id]/__tests__/route.test.ts`:
  - **GET** returns item with photos and all fields
  - **PATCH** updates notes, disposition
  - Returns 403 for non-owner

### 3.7 Upload Page (`/estates/[id]/upload`)

- [ ] Photo picker: tap to open native file selector (accept images, including HEIC)
- [ ] Multi-select: 1-5 photos per item
- [ ] Preview thumbnails before upload
- [ ] Upload progress indicator (per-photo and overall)
- [ ] After upload: show item card with thumbnails, "Pending triage" status
- [ ] Quick action: upload another item immediately (rapid-fire workflow)
- [ ] Back to estate detail link

### 3.8 Upload Component Tests

- [ ] `src/app/estates/[id]/upload/__tests__/upload.test.tsx`:
  - File picker accepts image types
  - Selected photos show as preview thumbnails
  - Upload button disabled with 0 photos selected
  - Upload button disabled with > 5 photos selected
  - Shows "Preparing photos..." during HEIC conversion
  - Shows progress indicator during upload
  - Shows success state with item card after upload completes
  - "Upload Another" button resets the form

### 3.9 Item List on Estate Detail

- [ ] `GET /api/estates/[id]/items` — list items for estate
- [ ] Estate detail page shows item cards: thumbnail, tier badge, status, value estimate
- [ ] Items sortable/filterable by tier, status
- [ ] Tier badge colors match brand tokens (tier-1 gray, tier-2 amber, tier-3 blue, tier-4 red)
- [ ] Pending items shown with "awaiting triage" indicator

### 3.10 Item Detail Page (`/estates/[id]/items/[itemId]`)

- [ ] `GET /api/items/[id]` — get item with photos and triage data
- [ ] Photo gallery: swipeable on mobile, thumbnails + large view
- [ ] Triage results section (empty until Phase 4 wires it up)
- [ ] Operator notes field (editable, saves via PATCH)
- [ ] Disposition status (wired in Phase 5)

### 3.11 Deliverable

End-to-end photo workflow: navigate to estate → upload photos → item created with photos stored in R2 → item visible in estate detail → item detail shows photos. HEIC files convert seamlessly. **All R2, HEIC, API, and component tests pass.**

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

### 4.4 User Settings Storage

- [ ] Create `settings` table in schema (or use Clerk user metadata):
  - `user_id` (string, Clerk ID)
  - `ai_provider` (enum: anthropic/openai/google)
  - `ai_model` (string — specific model ID)
  - `api_key_anthropic` (encrypted string, nullable)
  - `api_key_openai` (encrypted string, nullable)
  - `api_key_google` (encrypted string, nullable)
- [ ] `GET /api/settings` — return current provider config (never return raw API keys to client — only masked versions)
- [ ] `PUT /api/settings` — update provider, model, or API keys
- [ ] API key encryption: encrypt at rest in the database, decrypt only server-side when making AI calls

### 4.5 Settings API Tests

- [ ] `src/app/api/settings/__tests__/route.test.ts`:
  - **GET** returns provider and model, API keys masked (e.g., `sk-...XYZ`)
  - **GET** returns defaults when no settings saved yet
  - **PUT** saves provider selection
  - **PUT** saves and encrypts API key
  - **PUT** rejects invalid provider name
  - Encrypted key in DB does not match plaintext input
  - Decrypted key matches original input (round-trip encryption test)

### 4.6 Triage API with SSE

- [ ] `POST /api/items/[id]/triage` — trigger triage:
  - Load item photos from R2
  - Load user's AI settings (provider, model, API key)
  - Call the appropriate provider adapter
  - Return immediately with 202 Accepted
- [ ] `GET /api/items/[id]/triage/stream` — SSE endpoint:
  - Open SSE connection
  - Stream AI response tokens as they arrive
  - On completion: parse structured result, update item record (tier, ai_identification, ai_valuation, ai_raw_response, ai_provider, tokens_used, status → triaged)
  - Close SSE connection

### 4.7 Triage API Tests

- [ ] `src/app/api/items/[id]/triage/__tests__/route.test.ts`:
  - **POST** triggers triage, returns 202
  - Rejects item with no photos → 400
  - Rejects when user has no AI settings / API key → 400 with clear message
  - Rejects non-owned item → 403
  - Item status updates to `triaged` after completion
  - Item record populated: tier, ai_identification, ai_valuation, ai_raw_response, tokens_used
- [ ] `src/app/api/items/[id]/triage/__tests__/stream.test.ts`:
  - SSE connection opens with correct headers (`Content-Type: text/event-stream`)
  - Streams chunks in SSE format (`data: ...\n\n`)
  - Sends `[DONE]` event on completion
  - Handles provider error mid-stream (sends error event, closes connection)

### 4.8 Triage UI

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

### 4.9 Triage UI Tests

- [ ] `src/app/estates/[id]/items/[itemId]/__tests__/triage-display.test.tsx`:
  - Shows "Triage" button for pending items
  - Triage button triggers API call
  - Streaming text renders incrementally (simulate SSE with mock)
  - On completion, structured result displays: tier badge, value range, identification
  - Tier badge shows correct color for each tier (1-4)
  - "Request more photos" section appears when AI requests them
  - Listing guidance section appears only for tier 3+

### 4.10 Batch Triage

- [ ] Support triggering triage on multiple items sequentially
- [ ] Estate detail: "Triage All Pending" button that processes untriaged items in queue
- [ ] Progress indicator: "Triaging item 3 of 12..."

### 4.11 Deliverable

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

## Phase 6 — Settings & Cost Tracking

**Goal:** Operators configure AI providers, manage API keys, and monitor token spend.

### 6.1 Settings Page (`/settings`)

- [ ] **Provider Selection:** Toggle between Anthropic, OpenAI, Google
- [ ] **Model Selection:** Dropdown of available models per provider (e.g., Claude Sonnet vs Opus, GPT-4o vs GPT-4o-mini, Gemini Flash vs Pro)
- [ ] **API Key Management:**
  - Input field per provider (masked after save)
  - "Test Key" button — makes a minimal API call to verify the key works
  - Keys encrypted at rest
- [ ] **Account section:** Clerk UserButton, sign-out

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

* Settings page (Phase 6) can be partially built alongside Phase 4,
  since AI provider config is needed for triage to work. The minimum
  viable settings (provider + API key) should be built during Phase 4.
  The full dashboard and cost tracking are Phase 6.
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
