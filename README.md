# AIchemy

Transmute AI concepts to discover new ones — an alchemy-themed take on Infinite
Craft. Every recipe is **permanent**: the same pair always yields the same result,
for every player, forever.

## Stack

- **Next.js 16** (App Router) · TypeScript · Tailwind v4 · Framer Motion · Zustand
- **Postgres** (Prisma ORM) · **Redis** (ioredis) — 4-tier cache for instant lookups
- **Claude** (Anthropic) for generating genuinely new combinations, with a
  deterministic offline mock fallback so the app runs with **zero** API cost.

## Quick start

Prerequisites: Node 20+, Docker Desktop.

```bash
cp .env.example .env          # optionally add ANTHROPIC_API_KEY
npm install
npm run setup                 # docker up + prisma generate + db push + seed
npm run dev                   # http://localhost:3000
```

`npm run setup` starts Postgres (host port **5433**) and Redis (host port **6380**)
via Docker, pushes the schema, and seeds the 8 starter concepts. The non-standard
host ports avoid clashing with other local Postgres/Redis instances.

Without an `ANTHROPIC_API_KEY`, combinations are produced by a deterministic local
generator (results are labelled as offline mocks). Add a key to `.env` to enable
real Claude-generated concepts — no other change needed.

## How it works

Combining two concepts resolves through a strict lookup chain so a pair is ever
generated at most once (see [`lib/combine.ts`](lib/combine.ts)):

1. **In-process LRU** (~0ms)
2. **Redis** (<10ms)
3. **Postgres** (<50ms)
4. **Claude generation** — the only path that hits the model; result is then
   persisted to Postgres and warmed into Redis + memory.

Pairs are normalized alphabetically (`normalizePair` in [`lib/pair.ts`](lib/pair.ts))
so `LLM + Memory` and `Memory + LLM` are the same recipe. Permanence is enforced by
a unique `pairKey` on the `Recipe` table.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run setup` | One-shot: docker up + generate + db push + seed |
| `npm run db:up` / `db:down` | Start / stop Postgres + Redis |
| `npm run db:push` | Sync Prisma schema to the database |
| `npm run db:seed` | Seed starter concepts |
| `npm run db:studio` | Open Prisma Studio |

## API

| Endpoint | Description |
| --- | --- |
| `POST /api/combine` | `{ leftId, rightId }` → result concept + cache source + discovery flags |
| `GET /api/concepts` | Starter concepts (`?all=true` for every known concept) |

## Roadmap

This is Milestone 1 — the core craft loop. Planned on top of this foundation:
graph view, rarity-driven premium animations, achievements, daily challenges,
statistics dashboard, personal timeline, category progress, background recipe
pre-generation, SSE queue for slow generations, offline support, and the admin
dashboard.
