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

## Posture (updated 2026-07-29 — real data, B2 cleared, promotion underway)

The seed described below is fictional-by-design only for **local dev** (`db/seed.sql`);
production has run on real Montgomery County data since the D1 cutover (2026-07-18) —
real officeholders, real 2026 candidates, real votes, real independent-expenditure
filings. Counsel cleared public alignment-score display for real candidates on
2026-07-28 (item B2, verbal, 1st Amendment basis — no written opinion yet).

Vercel Deployment Protection was found to already be **off** on 2026-07-29 (no SSO wall
on the production URL) — owner decided to leave it off and begin promoting the URL now
that B2 is cleared, rather than wait on the remaining items below. Those items (A1, A2,
B1, C1 baseline, F2) are still open and should inform what gets promoted/claimed publicly
in the meantime — e.g. avoid characterizing this as a fully counsel-cleared launch.

## Before *full* public launch (remaining, post-B2)

| Gate | Where |
|---|---|
| Counsel items still open | docs/COUNSEL-REVIEW.md (A1 initial, A2, B1, C1 baseline, F2) — B2 cleared 2026-07-28 |
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
