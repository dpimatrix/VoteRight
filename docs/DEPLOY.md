# VoteRight — Deployment

Status: v2.0 (2026-07-29) — **migrated off Vercel/Neon to the owner's own VPS**

## Current hosting: self-hosted VPS (dpimatrix.com server)

Production is now `https://voteright.dpimatrix.com`, running on the same VPS as the
owner's other app (Safariis) — AlmaLinux 8.10 + cPanel/WHM, root/SSH access. Reason for
the move: Vercel's Deployment Protection (a dashboard-only setting, invisible in git)
was found silently re-enabled on 2026-07-29, blocking real visitors with no trace of
who/when/why — the owner already ran equivalent infrastructure for Safariis and
preferred consolidating onto it.

- **App**: Next.js (`app/`) built and run via `npm run build && npm start` under
  Node.js 22 (installed as cPanel's own `ea-nodejs22` package, not system-wide), as a
  **systemd `--user` service** (`~/.config/systemd/user/voteright.service`) under a
  dedicated `voteright` OS user — bound to `127.0.0.1:3001`, `Restart=always`.
  `loginctl enable-linger voteright` keeps it running independent of login sessions.
- **Database**: self-hosted **PostgreSQL 17** (matching what Neon ran), same OS user's
  own `voteright` role/database. The real production data was migrated via `pg_dump`
  (custom format) from Neon and `pg_restore --no-owner --no-privileges` (needed —
  Neon's dump references its internal `neon_superuser` role, which doesn't exist
  locally). Row counts verified to match exactly post-restore.
- **Reverse proxy + TLS**: Apache (already running for Safariis) proxies
  `voteright.dpimatrix.com` → `127.0.0.1:3001` via a per-domain "userdata" include
  (`/etc/apache2/conf.d/userdata/{std,ssl}/2_4/voteright/voteright.dpimatrix.com/proxy.conf`
  — NOT WHM's global Include Editor, which would affect every site on the box). That
  include explicitly excludes `/.well-known/pki-validation/` and
  `/.well-known/acme-challenge/` from the proxy — without that exclusion, AutoSSL's
  domain-validation file gets swallowed by the app's catch-all route and 404s.
  cPanel's AutoSSL issues/renews the real Let's Encrypt cert (had to un-exclude the
  domain from AutoSSL via `uapi --user=voteright SSL toggle_dcv_domain
  domain=voteright.dpimatrix.com enable=1` first — it starts excluded by default).
- **DNS/CDN**: `dpimatrix.com`'s authoritative nameservers are Cloudflare (not WHM),
  so the `voteright` A record was added there, **Proxied** (orange cloud, hides the
  VPS's real IP — deliberately not "DNS only", which would remove that protection for
  no benefit). SSL/TLS mode: **Full (strict)** — encrypts Cloudflare↔origin using the
  real AutoSSL cert, not just visitor↔Cloudflare.
- **Deploys**: manual, via the owner's existing SCP-based workflow (same pattern as
  Safariis) — deliberately **not** automated via GitHub Actions (considered and
  declined; no CI secrets/deploy keys configured for this).
- **Secrets**: `app/.env.production` on the VPS carries `ADMIN_TOTP_SECRET` /
  `ADMIN_SESSION_SECRET` copied over from Vercel's values (so the owner's already-
  enrolled authenticator keeps working) plus the new local `DATABASE_URL`.

**Vercel/Neon are paused, not deleted** — kept as a rollback path. The section below
is retained as history/reference for that setup, not the active posture.

## Superseded — original Vercel/Neon decision (kept for history)

### Decision: Vercel (app) + Neon (Postgres)

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

## Posture (updated 2026-07-29 — real data, B2 cleared, self-hosted, promotion underway)

The seed described below is fictional-by-design only for **local dev** (`db/seed.sql`);
production has run on real Montgomery County data since the D1 cutover (2026-07-18) —
real officeholders, real 2026 candidates, real votes, real independent-expenditure
filings. Counsel cleared public alignment-score display for real candidates on
2026-07-28 (item B2, verbal, 1st Amendment basis — no written opinion yet).

No access wall in front of `https://voteright.dpimatrix.com` — publicly reachable by
design, consistent with the owner's 2026-07-29 decision to promote the URL now that B2
is cleared. Items A1, A2, B1, C1 baseline, and F2 are still open and should inform what
gets promoted/claimed publicly in the meantime — e.g. avoid characterizing this as a
fully counsel-cleared launch.

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
