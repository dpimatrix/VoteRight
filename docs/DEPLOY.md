# VoteRight — Deployment

Status: v1.0 · target decided, assets ready · the owner executes the two account steps

## Decision: Vercel (app) + Neon (Postgres)

For a solo-operated Next.js 16 monolith with one Postgres, **Vercel + Neon** is the
lowest-operations choice: first-class Next hosting, a managed Postgres with a real free
tier, nothing to patch, and the only wiring is `DATABASE_URL`. The considered
alternative — **Fly.io** (app + Postgres under one vendor, Docker-native, region `iad`
next to Maryland) — is the right move later if you want everything in one place or
long-running workers (Phase 3's STT/moderation jobs); nothing below locks you out of it.

## One-time setup (~15 minutes, your accounts)

### 1. Neon (database)

1. Create a project at neon.tech (region: US East). Copy the **pooled** connection
   string (it ends in `?sslmode=require...`).
2. Apply schema and seed from your machine:

```sh
psql "<NEON_CONNECTION_STRING>" -f docs/SCHEMA.sql
psql "<NEON_CONNECTION_STRING>" -f db/seed.sql
```

(No local psql? `docker run --rm -v .:/w -w /w postgres:16-alpine psql "<CONN>" -f docs/SCHEMA.sql` etc.)

### 2. Vercel (app)

1. vercel.com → Add New Project → import `dpimatrix/VoteRight`.
2. **Root Directory: `app`** (the monolith lives in a subdirectory).
3. Environment variables:
   - `DATABASE_URL` = the Neon pooled string
   - `ADMIN_TOKEN` = a long random value (NOT `dev-admin`)
4. Deploy. Every push to `main` redeploys.

### 3. Post-deploy checks

- `/` shows the ballot; `/matches` scores after setting priorities; a candidate page
  shows promise records and the published finding.
- `/admin` rejects a wrong token and accepts `ADMIN_TOKEN`.
- Phone check works over the public URL (the dev-only `allowedDevOrigins` issue does not
  exist in production builds).

## Posture while this deployment carries sample data

The seed is **fictional by design** (ARCHITECTURE.md §2.3) and every page carries the
sample-data disclosure — but a public URL is a public statement. Until real data
operations begin:

- Turn on **Vercel Deployment Protection** (password or Vercel authentication) so the
  preview is shareable by choice, not discoverable.
- Do not promote the URL.

## Before any *public* launch (not this deployment)

| Gate | Where |
|---|---|
| Counsel items for Phases 1–2 | docs/COUNSEL-REVIEW.md (A1 initial, A2, B1, B2, C1) |
| ~~Real admin auth replacing `ADMIN_TOKEN`~~ **DONE** — TOTP (authenticator app) + signed 12 h sessions; production fails closed unless `ADMIN_TOTP_SECRET`/`ADMIN_SESSION_SECRET` are set (generate: `node app/scripts/gen-admin-secret.mjs`) | app/src/lib/adminAuth.ts |
| Real data operations replacing the fictional seed | db/seed.sql structural parts survive |
| MODPA notice/retention pages | ARCHITECTURE.md §10 |

## Notes

- `db.ts` reads `DATABASE_URL` only; Neon's `sslmode=require` in the URL is honored by
  node-postgres. No code changes needed between local and hosted.
- Vercel runs route handlers/SSR serverless; the pg Pool per instance is fine at pilot
  scale. If connection counts ever bite, switch `DATABASE_URL` to Neon's pooler (default
  in the pooled string) — already recommended above.
- Fly.io later: `fly launch` in `app/` with a standard Next Dockerfile, `fly postgres
  create`, same two env vars.
