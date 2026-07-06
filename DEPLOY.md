# Deploying AIchemy

Recommended topology: **data on Railway**, **app on Vercel or Netlify**.

- **Railway** — managed **Postgres** + **Redis** (source of truth; shared by everyone).
- **Vercel / Netlify** — hosts the Next.js app, connecting to Railway over the network.

Everything gameplay-relevant (concepts, recipes, first-discoverer names) lives in
Postgres, so it's automatically synced across all users and all app instances.

---

## 1. Provision data on Railway

1. New Project → **Add Postgres**. Copy its `DATABASE_URL`.
2. **Add Redis** (optional but recommended). Copy its `REDIS_URL`.
   - Redis is a cache tier only; if omitted the app still runs (Postgres-backed).

## 2. Deploy the app

Set these environment variables on the host (Vercel/Netlify project settings):

| Var | Value |
| --- | --- |
| `DATABASE_URL` | Railway Postgres URL (add `?sslmode=require` if required) |
| `REDIS_URL` | Railway Redis URL (optional) |
| `DEEPSEEK_API_KEY` | your DeepSeek key (omit to run the offline mock generator) |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | `deepseek-v4-pro` |

**Vercel** — zero-config; `vercel.json` sets the build to
`prisma generate && prisma migrate deploy && next build`.

**Netlify** — `netlify.toml` sets the same build and enables `@netlify/plugin-nextjs`.

Both run the schema migration (`prisma migrate deploy`, using
`prisma/migrations/`) at build time. Seeding is a separate one-time step (below).

## 3. Seed the starter elements (once)

Against the production `DATABASE_URL`:

```bash
DATABASE_URL="<railway-postgres-url>" npm run db:seed
```

(Or run it from a Railway shell if you also deploy the app there.)

## 4. Hosting the app on Railway instead

`railway.json` is included: it starts with `npm run start:prod`
(`prisma migrate deploy && next start`) and health-checks `/api/health`.

---

## Notes & caveats

- **Health check:** `GET /api/health` returns `200` when Postgres is reachable,
  `503` otherwise.
- **Migrations:** the schema is versioned in `prisma/migrations/`. Deploys apply
  it with `prisma migrate deploy` (never `db push` in production).
- **Serverless caveat (Vercel/Netlify):** the in-process **prefetch queue** and
  **runtime metrics** (`lib/prefetch.ts`, `lib/metrics.ts`) are per-instance and
  best-effort. On serverless, background pre-generation kicked off after a
  response may be cut short, and metrics/cache aren't shared across instances.
  Correctness is unaffected (Postgres is authoritative); only the "instant first
  discovery" optimization and the live metrics degrade. For guaranteed background
  generation at scale, move the queue to a durable worker (e.g. Upstash QStash)
  or run the app on Railway (long-lived process).
- **Discoverer names** are anonymous and stored per-concept in Postgres, so the
  "first discovered by X" credit is visible to everyone.
