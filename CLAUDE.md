# CLAUDE.md

## What this is

Estate liquidation appraisal co-pilot — mobile-first Next.js app. Operators photograph items, AI triages/values them.

Read `docs/` for product spec, architecture, and brand guidelines.

## Stack

Next.js (App Router), Drizzle ORM, Neon Postgres, Clerk auth, Cloudflare R2, Vercel

## Commands

```
npm run dev       # Start dev server
npm run build     # Production build
npm run lint      # ESLint
```

## Corrections

- Use Drizzle, not Prisma
- Use Neon serverless driver, not pg/node-postgres
- SSE for real-time streaming, not WebSockets
- HEIC→JPEG conversion happens client-side (heic2any), not server-side
- Users bring their own AI API keys — do not hardcode or share keys
- Mobile-first: design for phone viewports first, desktop second
