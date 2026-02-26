# Build Plan — A2B Manager

## Current State

v1 + dashboard redesign complete. 538 unit tests + 17 E2E tests (4 skipped in item-resolution). Full item lifecycle from upload through resolution, plus purpose-built dashboard landing page. See `.ai/context/History.md` for build log.

## Completed — Dashboard Redesign (2026-02-25)

Replaced the old active-estates-only filtered view with a purpose-built landing page (`bdcda1a`).

### What shipped
- **KPI stat tiles** — 2x2 mobile / 4-across desktop grid: Active Estates, Pending Triage, Pending Disposition, Total Estimated Value. Backed by `getDashboardStats` aggregate query.
- **Needs Attention section** — Estate-level cards with reason badges (Needs Disposition, Stale, Low Confidence). Priority-ordered, deduplicated per estate. Backed by `getAttentionEstates` union query with configurable stale-days threshold.
- **Recent & Active Estates** — Blended ranking by recency ÷ pending work volume, capped at 4 cards with "View all → /estates". Backed by `getRankedEstates`.
- **New components** — `AttentionCard`, `DashboardEstateCard`, `ReasonBadge` with full test coverage.
- **Types & queries** — `dashboard-types.ts`, `dashboard-queries.ts` with unit tests.
- Lightweight value summaries (item counts, estimated value, pending counts) woven into stat and estate cards — no separate reporting feature needed.

## Next — Google Address Autocomplete

Replace the plain-text address input with a Google Places Autocomplete combobox so estate addresses are real, consistently formatted locations.

### Decisions
- **Google Places API (New)** with app-level API key (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` env var)
- **Formatted string only** — store `formatted_address` in existing `text` column, no schema migration
- **Graceful degradation** — falls back to plain text input when API key is not configured

### Plan
1. Add `@googlemaps/js-api-loader` + `use-places-autocomplete` dependencies
2. Build `AddressAutocomplete` component — combobox dropdown, mobile-first, dark-only styling, `data-1p-ignore`
3. Detects missing API key → renders standard text input as fallback
4. Wire into create form (`/estates/new/create-estate-form.tsx`) and edit form (`estate-detail.tsx`)
5. Unit tests for the new component (selection, fallback, empty states)
6. E2E coverage for estate creation with autocomplete (if feasible to mock the Google SDK in Playwright)

### Future Directions
- **Thumbnail generation** — deferred in v1; `loading="lazy"` + R2 signed URLs sufficient for now
- **Upload-page inline triage** — deferred; triage currently only from item detail page
- **E2E item-resolution tests** — 4 tests in `e2e/item-resolution.test.ts` are skipped, need implementation
