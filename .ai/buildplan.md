# Build Plan — A2B Manager

## Current State

**All 7 phases complete.** 482 unit tests + 23 E2E tests. Full item lifecycle from upload through resolution, plus settings UI, cost tracking, and production polish.

### What exists

- **Estate lifecycle**: CRUD, inline edit, status transitions (active → resolving → closed), delete
- **API routes**: Full REST surface — estates, items, item photos, triage, settings, usage — all with auth, ownership checks, Zod validation
- **Pages**: Dashboard, estate list, create form, estate detail, item detail, upload, settings (with usage dashboard)
- **Item & photo pipeline**: Multi-photo upload (1–5), client-side HEIC→JPEG, R2 storage, signed URLs
- **AI triage engine**: Multi-provider (Anthropic, OpenAI, Google), SSE streaming, structured results, batch triage
- **Routing & Resolution**: Tier-based guidance, disposition tracking, auto-resolve, forward-only transitions, estate summary, filters
- **Settings & Cost Tracking**: Provider/model selection, API key management (encrypted), test-key validation, cost calculator, usage dashboard
- **Polish**: Toast notifications, loading skeletons, error boundaries, empty state CTAs, mobile UX (44px targets, swipeable cards, camera shortcut), lazy images, cursor-based pagination, DB indexes, rate limiting, security audit tests

### Test infrastructure

- Vitest + jsdom + Testing Library + jest-dom, Clerk mocks, test factories
- Playwright with Clerk testing integration (chromium + mobile Chrome)
- Security audit regression suite (401/403 across all API routes)

---

## Completed Phases

| Phase | Name | Tests Added | Total |
|-------|------|-------------|-------|
| 1 | Foundation | 35 | 35 |
| 2 | Estate CRUD | 67 | 102 |
| 3 | Item & Photo Pipeline | 103 | 205 |
| 4 | AI Triage Engine | 87 | 292 |
| 5 | Routing & Resolution | 99 | 391 |
| 6 | Settings UI & Cost Tracking | 43 | 434 |
| 7 | Polish & Production | 48 + 23 E2E | 482 + 23 E2E |

See `.ai/context/History.md` for the full phase-by-phase build log with every checklist item, deviation, and decision.

---

## What's Out of v1

Per Architecture.md, deferred to future work:

- Estate-level reporting dashboards (revenue vs. estimates)
- Estate merging
- Platform listing integrations (eBay, Mercari, Facebook Marketplace)
- Push/browser notifications
- Multi-user roles and permissions
- Offline support

---

## Next Steps

No active phase. The v1 build is complete. New work should be tracked as individual issues or a new phase added below.

---

## Notes

- Deployment excluded from Phase 7 per user request — production deploy deferred
- Pull-to-refresh skipped — native browser behavior covers Server Component pages
- Thumbnail generation deferred — R2 signed URLs + `loading="lazy"` sufficient for v1
- E2E tests require Clerk testing token — some tests skip without real API keys/seeded data
