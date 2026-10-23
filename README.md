# The Curious Brief

A personal news and knowledge platform: the news that matters, explained, connected and made yours.
Built with Next.js 15, React 19, TypeScript, Tailwind, Prisma and Recharts.

```
npm install          # installs deps and generates the Prisma client
npm run db:push      # creates the SQLite database (dev.db)
npm run dev          # http://localhost:3000 — first refresh runs automatically
```

Copy `.env.example` to `.env` and fill in the keys you have (see **Credentials**).

---

## What is implemented

| Area | Status | Notes |
|---|---|---|
| Live news ingestion | ✅ | 37 verified RSS feeds (India + global, news + official). Auto-refresh: breaking 15 min, general 30 min, analysis 6 h. |
| Clustering & dedupe | ✅ | Same-event reporting is grouped into one story; sources listed per story. |
| Importance engine | ✅ | Transparent factors (official source, corroboration, economic/policy consequence, scale, conflict, India relevance, freshness). Tiers: Must Know / Worth Understanding / Discover. "Why am I seeing this?" on every card. |
| Subject + region classification | ✅ | Keyword rules; 11 subjects; India / International / Cross-border. |
| Quick Read ⚡ | ✅ | Headline, 3 points, what happened, why care (only relevant audiences), bigger picture, "Here's the interesting part 👀", what's next, sources. AI-generated when a key is set; otherwise a labelled extractive summary. |
| Deep Dive 🧠 | ✅ | 9 sections: development, background + timeline, fundamentals, connecting the dots (with cause→effect chains), stakeholders, perspectives, what next + scenarios, "Now, what do you think?", further reading. Streams in while generating. |
| Today dashboard | ✅ | Greeting, date, refresh time, search, Daily Brief panel, five most consequential, by subject, Beyond My Bubble, Today's Deep Dive, Something Unexpected, Connect the Dots preview, Economic Pulse preview, Continue exploring. |
| My Daily Brief | ✅ | 5/10/20 min or open-ended queue; Must Know first; deliberate mix; progress + completion message. |
| All News | ✅ | Filters: subject, geography, grouping, source, date, sort, saved-only; pagination. |
| Beyond My Bubble | ✅ | Significant stories outside the reader's chosen subjects. |
| Connect the Dots 🕸️ | ✅ | Shared-entity links + AI classification (causal / correlated / plausible / speculative with rationale). Visual map + list view, node panel, progressive expansion, mobile-friendly SVG. |
| Economic Pulse 📊 | ✅ | 18 live official indicators (World Bank, ECB; RBI repo rate extracted from RBI releases). Reference period, previous value, source update date, fetch time, chart, explanation, why it matters, related news, "Explain this indicator". 4 more with a free FRED key. |
| The Week, Decoded | ✅ | Rolling 7-day synthesis: themes with citations, 10 biggest, economic pulse, business moves, marketing, power shifts, three ideas, watchlist (only events mentioned in reporting). Previous editions kept. |
| Ask Curio ✨ | ✅ | Source-grounded retrieval (stories + indicators), inline citations, follow-up questions, story context from the page you're on, floating button everywhere. |
| My Little Library 📚 | ✅ | Bookmarks, collections, notes, text highlights, search/filter, "Remember this?" resurfacing. |
| My Perspectives ✍️ | ✅ | Structured reflection template, timeline, edit/delete, Markdown/JSON export, optional AI review (assumptions, counterarguments, missing evidence, questions), revisit prompt. |
| Search & Explore | ✅ | Three modes (Latest News / Understand the Topic / Explore Connections), filters, official data, library + notes, browse subjects/countries/concepts/trending. |
| Personalisation & onboarding | ✅ | 4-step onboarding; settings for subjects, industries, geography, time budget, depth, tracked terms, reading mode, theme, font size, focus mode, notifications. Never hides important stories. |
| Auth & persistence | ✅ | Guest persistence on-device (bookmarks, progress, notes) with merge into an account on sign-up/sign-in. Email + password, bcrypt, signed cookie sessions. |
| Resume reading | ✅ | Scroll position and completion tracked per story and mode. |
| Dark theme, reduced motion, responsive | ✅ | Class-based dark mode, `prefers-reduced-motion` respected, mobile drawer nav, layouts stack at phone widths. |
| Source Health | ✅ | Per-feed status, last fetch, item counts, errors, excluded sources with reasons, job history. |

### Pending / partial
- **Email notifications**: preferences are stored; delivery needs an email provider (not configured).
- **Semantic search**: search is keyword-ranked (title/summary/entities); no embeddings yet.
- **Interactive timeline**: timelines render as a vertical list, not a draggable widget.
- **Monthly data for India (CPI, IIP, trade)**: no free machine-readable source without a key; World Bank gives annual actuals. RBI repo rate is parsed from RBI's own releases.

---

## External integrations

| Integration | Auth | Used for |
|---|---|---|
| RSS feeds (The Hindu, Mint, Economic Times, Indian Express, afaqs, RBI, PIB, SEBI, BBC, The Guardian, Al Jazeera, FT, The Economist, Marketing Week, Ars Technica, MIT Tech Review, ScienceDaily, Federal Reserve, ECB, WTO, UN News, WHO, NASA) | none | Headlines, publisher summaries, links, image references. Full list and status at `/sources`. |
| World Bank Open Data API | none | Annual GDP, CPI, unemployment, current account, trade, reserves, lending rate (India, World, US, Euro area, China). |
| ECB Data Portal | none | Daily euro reference rates (USD/INR derived, EUR/INR, EUR/USD), ECB policy rates. |
| FRED | optional key | Fed funds rate, US CPI monthly, US 10-year yield, Brent crude. |
| NVIDIA NIM (OpenAI-compatible) | `NVIDIA_API_KEY` | AI layer. Default model `nvidia/nemotron-3-ultra-550b-a55b` (verified on the free developer tier). |
| Anthropic | `ANTHROPIC_API_KEY` | Alternative AI provider (Claude via official SDK, structured outputs, server-side fallbacks). |

Evaluated and **not** integrated (no public feed or blocked): Reuters, Bloomberg, Business Standard, CNBC, IMF, OECD, HBR, Campaign India, Exchange4media, Moneycontrol. Reasons are listed on `/sources`.

---

## Credentials

| Variable | Required? | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | `file:./dev.db` locally; Postgres URL in production. |
| `AUTH_SECRET` | yes (prod) | Signs session cookies. |
| `NVIDIA_API_KEY` | one of the two | AI layer via NVIDIA (free). `NVIDIA_MODEL` selects the model. |
| `ANTHROPIC_API_KEY` | one of the two | AI layer via Anthropic. |
| `FRED_API_KEY` | optional | 4 extra US/global indicators. |
| `CRON_SECRET` | prod | Protects `/api/cron/refresh`. |

Without any AI key the site still works as a daily news reader: every card and quick read is a labelled, source-grounded extractive summary; AI-only features explain what is missing.

Check the AI connection any time: `npm run ai:check` (or `npm run ai:check:full` to generate a real quick read and deep dive).

---

## Refresh mechanisms

- **In-process scheduler** (`src/instrumentation.ts` → `src/lib/ingest/scheduler.ts`): runs inside `next dev` / `next start`. Intervals from `REFRESH_*_MINUTES`. On boot it refreshes if data is empty or stale, fetches indicators, and builds the weekly digest.
- **External cron** for serverless hosts: set `IN_PROCESS_SCHEDULER=false` and call
  `GET /api/cron/refresh?key=CRON_SECRET&job=news|econ|digest|all&cadence=breaking|general|analysis|all`.
  Example Vercel `vercel.json`:
  ```json
  { "crons": [
    { "path": "/api/cron/refresh?job=news&cadence=breaking", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/refresh?job=news&cadence=general", "schedule": "*/30 * * * *" },
    { "path": "/api/cron/refresh?job=econ", "schedule": "0 */12 * * *" },
    { "path": "/api/cron/refresh?job=digest", "schedule": "0 */6 * * *" } ] }
  ```
  (Vercel sends `Authorization: Bearer $CRON_SECRET` automatically; the route accepts it.)
- **Manual**: `npm run ingest` (`-- breaking|general|analysis|econ|digest|prune`).
- Pipeline: fetch → normalise → dedupe (per-source GUID) → cluster (title/keyword similarity, 60 h window) → classify → entity/keyword extraction → score → extractive quick read → link stories → rescore for freshness → AI enrichment of the top 20 → store. Stories older than 45 days are pruned unless saved or annotated.

---

## Deployment

### Database: switch to Postgres (Supabase)
1. In `prisma/schema.prisma` change `provider = "sqlite"` to `provider = "postgresql"`.
2. Set `DATABASE_URL` to the Supabase connection string (use the pooled URL on serverless).
3. `npx prisma db push` (or `prisma migrate deploy` after generating migrations).
No query changes are needed; the code uses only portable Prisma features.

### Long-lived host (Railway, Render, Fly, a VPS) — simplest
`npm run build && npm start`. The in-process scheduler keeps the news fresh. Set `AUTH_SECRET`, `DATABASE_URL`, `NVIDIA_API_KEY` (or Anthropic), optionally `FRED_API_KEY`.

### Vercel (serverless)
Set `IN_PROCESS_SCHEDULER=false`, add the cron config above, set `CRON_SECRET`, use Postgres. Deep-dive generation can take 1–2 minutes; use the Pro plan's longer function duration or lower `NVIDIA` output size.

### Node version
Node 18.18+ works; Node 20 LTS recommended.

---

## Project layout

```
src/app            routes (App Router): /, /brief, /news, /bubble, /connect, /pulse, /week, /curio,
                   /library, /perspectives, /explore, /settings, /sources, /onboarding, /signin, /signup,
                   /story/[slug] (quick read), /story/[slug]/deep, /connect/[slug], api/*
src/components     UI (cards, doodles, nav, map, charts, chat, editors)
src/lib/ingest     feed pipeline, classification, importance scoring, entities, scheduler
src/lib/ai         provider client (NVIDIA / Anthropic), quick read, deep dive, links, curio, digest, review
src/lib/econ       official indicator fetchers
src/lib            db, auth, queries, search, taxonomy, sources, types
prisma/schema.prisma
scripts/           ingest.ts, ai-check.ts
```

---

## Known limitations

- Open models on the free NVIDIA tier are rate-limited (roughly 40 requests/min); the pipeline enriches 20 stories per refresh at concurrency 3 and retries on 429. Stories further down the list get an AI quick read on demand ("Generate AI explanation").
- Deep dives take 1–2 minutes on `nemotron-3-ultra` with reasoning on; the page streams a loading state and fills in.
- AI output is validated against strict schemas and allowed to cite only URLs that exist in the sources, but like any model it can still misjudge nuance; the AI label and source list are always shown so the reader can inspect the evidence.
- Clustering is similarity-based; occasionally two outlets' versions of one event are shown as separate stories.
- Image rights: images are referenced from publisher feeds (not copied) and attributed; remove `imageUrl` usage if your deployment requires it.
- SQLite is for local use; use Postgres for anything multi-user or serverless.
