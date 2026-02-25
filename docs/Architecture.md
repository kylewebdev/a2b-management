# Architecture — Estate Liquidation Appraisal Co-Pilot

---

## Overview

A mobile-first web application that serves as an AI-powered co-pilot for estate liquidation. Field operators photograph items using their phone's native camera, upload photos through the browser, and receive real-time AI triage results — identification, tier classification, valuation, and routing guidance.

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | Next.js (App Router) | Full-stack React framework; handles frontend, API routes, and server logic in one codebase |
| **Database** | Neon Postgres (cloud) | Serverless Postgres with branching, scales to zero, no infra management |
| **ORM** | Drizzle | Type-safe, lightweight, edge-compatible; pairs well with Next.js and Neon |
| **Auth** | Clerk.js | Drop-in auth with user management; simple now, supports multi-user later |
| **Image Storage** | Cloudflare R2 | S3-compatible object storage; no egress fees, cost-effective for high photo volume |
| **Deployment** | Vercel | Native Next.js host; automatic deployments, serverless functions, edge network |
| **Real-time** | Server-Sent Events (SSE) | One-way streaming from server to client for AI triage results; simpler than WebSockets for this use case |

---

## Users & Auth

### Current State
- Single manager account (business owner / trained supervisor)
- Clerk.js handles sign-in, session management, and user metadata
- Simple email/password or OAuth — Clerk provides both out of the box

### Future State
- Multiple manager accounts sharing access to the same estates
- Role-based access if needed (manager vs. field operator)
- Clerk organizations/multi-tenancy support is available when needed

---

## Data Model (Core Entities)

### Estate
The top-level container. One estate = one property/job site.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| name | string | Human-readable label |
| address | string | Property address |
| status | enum | `active`, `resolving`, `closed` |
| client_name | string? | Optional client reference |
| notes | text? | Access notes, job context |
| created_at | timestamp | |
| updated_at | timestamp | |
| user_id | string | Clerk user ID (owner) |

### Item
A single item within an estate, created from a photo upload.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| estate_id | UUID | FK → Estate |
| tier | enum? | `1`, `2`, `3`, `4` — null until triaged |
| status | enum | `pending`, `triaged`, `routed`, `resolved` |
| ai_identification | jsonb? | Structured ID result from AI |
| ai_valuation | jsonb? | Value range, comps, confidence |
| ai_raw_response | text? | Full AI response for reference |
| ai_provider | string? | Which provider/model was used |
| tokens_used | integer? | Token count for this triage |
| disposition | string? | Final outcome (sold, donated, trashed, listed, consigned) |
| notes | text? | Operator notes |
| created_at | timestamp | |
| updated_at | timestamp | |

### ItemPhoto
Photos associated with an item. Multiple photos per item (front, back, marks, damage).

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| item_id | UUID | FK → Item |
| r2_key | string | Cloudflare R2 object key |
| original_filename | string | Original file name from upload |
| mime_type | string | image/jpeg, image/webp, etc. |
| size_bytes | integer | File size |
| sort_order | integer | Display order within the item |
| created_at | timestamp | |

---

## Image Upload Pipeline

### Flow
1. Operator taps "Upload" on the item screen
2. Phone's native file picker opens (gallery)
3. Operator selects 1–5 photos for that item
4. **Client-side HEIC conversion**: if any selected files are HEIC/HEIF, the browser converts them to JPEG using `heic2any` before upload — takes ~1-2s per photo, operator sees a "Preparing photos..." indicator
5. Converted JPEGs are uploaded to the Next.js API route
6. API route streams files to Cloudflare R2, creates `ItemPhoto` records
7. Once all photos are stored, the item is queued for AI triage

### Why Client-Side Conversion
- Operators upload 2–5 photos at a time — conversion is fast and imperceptible
- Avoids Vercel serverless compute costs (at ~150 items × 2 photos per estate, server-side conversion adds meaningful function execution time)
- All AI vision APIs accept JPEG — no compatibility issues downstream

### Upload UX
- Per-item workflow: select photos → upload → repeat for next item
- Progress indicator during conversion and upload
- Photos display as thumbnails after upload, before triage begins

---

## AI Triage Engine

### Multi-Provider Architecture

The system supports multiple AI providers and models, configurable by the user.

```
┌─────────────────────────────────────────┐
│            AI Provider Interface         │
│  (common request/response contract)      │
├──────────┬──────────┬──────────┬────────┤
│ Anthropic│  OpenAI  │  Google  │ Future │
│ (Claude) │ (GPT-4o) │ (Gemini) │  ...   │
└──────────┴──────────┴──────────┴────────┘
```

Each provider adapter implements a shared interface:
- Accept photos + system prompt + estate context
- Return structured triage result (identification, tier, valuation, comps, confidence)
- Report token usage

### Provider Configuration (Settings Page)
- **Select active provider** — Anthropic, OpenAI, Google, etc.
- **Select model** — each provider exposes its available models (fast/cheap vs. capable/expensive)
- **API key management** — user provides their own API keys (stored encrypted)
- **Token usage dashboard** — running totals per estate, per session, and cumulative; helps the user monitor costs

### Triage Prompt
A standardized system prompt (derived from Project.md principles) is sent with every request:
- Item identification (brand, maker, era, materials)
- Tier classification (1–4) with rationale
- Value range based on sold comps
- Confidence level
- Additional photo requests if needed
- Listing guidance for Tier 3+

### Real-Time Streaming
- When photos are uploaded and triage begins, the server opens an SSE connection
- AI responses stream token-by-token to the client
- The operator sees the triage result build in real-time
- Multiple items can be in-flight — each item's result streams independently

---

## Application Structure

### Pages / Routes

```
/                         → Dashboard (active estates list)
/estates                  → Estate list (all statuses)
/estates/new              → Create new estate
/estates/[id]             → Estate detail (items list, status summary)
/estates/[id]/upload      → Photo upload screen for this estate
/estates/[id]/items/[id]  → Individual item detail (photos, triage result, disposition)
/settings                 → AI provider config, API keys, token usage, account
```

### API Routes

```
POST   /api/estates                → Create estate
GET    /api/estates                → List estates
GET    /api/estates/[id]           → Get estate detail
PATCH  /api/estates/[id]           → Update estate
DELETE /api/estates/[id]           → Delete estate

POST   /api/estates/[id]/items     → Create item + upload photos
GET    /api/estates/[id]/items     → List items for estate
GET    /api/items/[id]             → Get item detail
PATCH  /api/items/[id]             → Update item (disposition, notes, tier override)

POST   /api/items/[id]/triage      → Trigger AI triage for item
GET    /api/items/[id]/triage/stream → SSE endpoint for real-time triage results

POST   /api/upload                 → Upload photos to R2
GET    /api/settings               → Get AI provider settings
PUT    /api/settings               → Update AI provider settings
GET    /api/usage                  → Token usage stats
```

---

## Key Design Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| HEIC conversion | Client-side (`heic2any`) | 2–5 photos at a time is fast on-device; avoids Vercel compute costs |
| AI provider architecture | Multi-provider with shared interface | User chooses speed/cost tradeoff; not locked to one vendor |
| API key storage | User-provided, encrypted in DB | User controls their own AI spend; no shared API key to manage |
| Real-time updates | SSE (not WebSockets) | Unidirectional streaming is all we need; simpler infrastructure on Vercel |
| Image storage | Cloudflare R2 | Zero egress fees; S3-compatible; cost-effective at scale |
| Database | Neon serverless Postgres | Scales to zero; no connection pooling headaches with serverless |
| ORM | Drizzle | Type-safe, lightweight, edge-ready; less overhead than Prisma |
| Auth | Clerk.js | Minimal setup; handles the boring stuff; multi-tenant ready when needed |
| Deployment | Vercel | First-class Next.js support; zero-config deploys |

---

## v1 Scope

### In
- Clerk authentication (single user, expandable)
- Estate CRUD with lifecycle statuses (active → resolving → closed)
- Photo upload (multi-select from gallery, per-item batches of 1–5)
- Client-side HEIC → JPEG conversion with progress indicator
- AI triage with real-time streaming results
- Multi-provider AI configuration (Anthropic, OpenAI, Google)
- Model selection per provider (fast/cheap ↔ capable/expensive)
- Token usage tracking and display in settings
- Tier classification (1–4) and routing labels
- Item management (view items, update disposition status, operator notes)

### Out (Future)
- Estate-level reporting dashboards (item counts by tier, value summaries)
- Revenue tracking (actual sold prices vs. estimates)
- Estate merging
- Platform listing integrations (eBay, Mercari, Facebook Marketplace)
- Push notifications / browser notifications
- Multi-user roles and permissions

---

## Infrastructure Diagram

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│   Operator    │     │   Vercel     │     │   Neon Postgres  │
│   (Phone)     │────▶│   Next.js    │────▶│   (Database)     │
│              │     │   App        │     │                  │
│  Native cam  │     │              │     └──────────────────┘
│  + Browser   │     │  API Routes  │
│              │     │  SSE Stream  │     ┌──────────────────┐
│  HEIC→JPEG   │     │              │────▶│  Cloudflare R2   │
│  (client)    │     │              │     │  (Photo Storage)  │
└──────────────┘     │              │     └──────────────────┘
                     │              │
                     │              │     ┌──────────────────┐
                     │              │────▶│  AI Providers    │
                     │              │     │  Claude / GPT /   │
                     │              │     │  Gemini / etc.    │
                     └──────────────┘     └──────────────────┘

                     ┌──────────────┐
                     │   Clerk.js   │
                     │   (Auth)     │
                     └──────────────┘
```

---

## Notes

- **No offline support needed** — Starlink backup ensures connectivity at all sites
- **Mobile-first UI** — all screens must be optimized for phone-sized viewports; operators will rarely use desktop
- **Speed is the priority** — the intake pipeline should feel instant; triage results should begin streaming within seconds of upload
- **Cost transparency** — token usage is always visible so the operator can make informed decisions about model selection

---

*Version: 1.0 — Initial architecture from brainstorming session, 2026-02-24*
