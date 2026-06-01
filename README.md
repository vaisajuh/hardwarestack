# HardwareStack

PC hardware bottleneck calculator with upgrade recommendations. Select your CPU, GPU, and RAM to see which component is holding back your system at 1080p, 1440p, or 4K — and get a direct upgrade suggestion with links to Google Shopping and PCPartPicker.

Live at **[www.hardwarestack.com](https://www.hardwarestack.com)**

## Stack

- **Next.js 16** (App Router, React Server Components)
- **Prisma 7** + **PostgreSQL** (Neon, production)
- **Tailwind CSS v4** + **shadcn/ui v4**
- **Recharts** — utilization gauge charts
- Deployed on **Fly.io** (Docker, standalone bundle)

## Local development

```bash
# 1. Install dependencies
npm install
npx prisma generate       # generates client into lib/generated/prisma/

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local — set DATABASE_URL to your local Postgres instance

# 3. Apply schema and seed (or push local DB to prod, see scripts/)
npx prisma migrate dev

# 4. Start dev server
npm run dev               # http://localhost:3000
```

Other useful commands:

```bash
npm run build             # production build (standalone)
npm run lint              # ESLint
npx prisma studio         # GUI for the database
```

## Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (pooled for app runtime) |
| `DIRECT_URL` | Direct connection string — required for Prisma migrations (bypasses PgBouncer) |
| `NEXT_PUBLIC_AMAZON_AFFILIATE_TAG` | Amazon Associates tag used in affiliate links |
| `REVALIDATE_TOKEN` | Secret for `POST /api/revalidate` cache invalidation endpoint |
| `ANTHROPIC_API_KEY` | Claude API key — scraper pipeline only, never exposed to the browser |

See `.env.example` for the full list.

## Data pipeline

Scraping lives entirely outside this app in `scripts/scraper/` — a standalone Node.js pipeline that:

1. Fetches hardware specs from retail sources
2. Uses a local LLM to map retail product names to canonical CPU/GPU entries
3. Inserts `RetailLink` rows (ASIN → canonical component) into the database

The app itself never imports Playwright or runs scraping logic (would crash the Fly.io deployment).

After the scraper runs, call `POST /api/revalidate` with the `x-revalidate-token` header to flush the Next.js cache.

## Database scripts

```bash
scripts/db-push-to-prod.sh   # dump local DB and restore to production (Neon)
scripts/db-reset-prod.sh     # truncate all production tables
scripts/prod-restart.sh      # restart Fly.io machines
```

All scripts auto-load `.env.local`. Run them with `bash scripts/<name>.sh`.

## Deployment

```bash
fly deploy                            # build image and deploy to Fly.io
fly secrets set DATABASE_URL="..."    # set/update production secrets
fly secrets set DIRECT_URL="..."
fly secrets set REVALIDATE_TOKEN="..."
```

The `Dockerfile` runs `npx prisma generate` before `npm run build` so the generated Prisma client is bundled in the standalone output. `next.config.ts` is set to `output: "standalone"` — do not remove this.
