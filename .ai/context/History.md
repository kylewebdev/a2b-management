# Build History — A2B Manager

Phase-by-phase log of what was built and key decisions made along the way.

## Phase Summary

| Phase | Name | What it delivered |
|-------|------|-------------------|
| 1 | Foundation | DB schema (Drizzle + Neon), Clerk auth, Vitest setup, test factories |
| 2 | Estate CRUD | API routes, estate list/create/detail pages, inline edit, status transitions |
| 3 | Item & Photo Pipeline | Multi-photo upload, HEIC conversion, R2 storage, item detail with gallery |
| 4 | AI Triage Engine | Provider adapters (Anthropic/OpenAI/Google), SSE streaming, app settings, batch triage |
| 5 | Routing & Resolution | Tier-based guidance, disposition tracking, auto-resolve, estate summary/filters |
| 6 | Settings & Cost Tracking | Settings page UI, test-key validation, cost calculator, usage dashboard |
| 7 | Polish & Production | Toasts, skeletons, error boundaries, empty states, mobile UX, pagination, rate limiting, E2E tests |

## Notable Decisions

- **`@anthropic-ai/sdk`** not `anthropic` — the `anthropic` npm package is a stub
- **`app_settings.id`** uses `serial()` PK, singleton enforced by always querying id=1
- **"Routed" status is optional** — users can set disposition directly from `triaged` → `resolved`, skipping acknowledge
- **Upload page inline triage** was deferred — triage happens from item detail page only
- **Pull-to-refresh skipped** — native browser behavior covers Server Component pages
- **Thumbnail generation deferred** — `loading="lazy"` + R2 signed URLs sufficient for v1
- **Deployment excluded** from Phase 7 per user request

*v1 completed February 2026*
