# AI Assistant Instructions — A2B Manager

Estate liquidation appraisal co-pilot — mobile-first Next.js app. Operators photograph items, AI triages/values them.

Check `.ai/buildplan.md` for current state. Reference docs in `.ai/context/`.

## Hard Rules

- **SSE for streaming, not WebSockets** — AI triage results stream via Server-Sent Events
- **HEIC→JPEG client-side** — `heic2any` in the browser, never server-side
- **Users bring their own AI keys** — never hardcode or share API keys
- **Mobile-first** — design for phone viewports first, desktop second
- **Estates indexed by address** — address is the primary identifier, name is optional
- **`data-1p-ignore`** — use on all non-credential form inputs to prevent password manager interference
- **Dark-only theme** — no light mode, no toggle
- **Tests first** — write the test, then make it pass
