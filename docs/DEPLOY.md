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
- **Deploys**: manual — `cd /home/voteright/repo && git pull`, **then `cd app`**
  before `npm run build` (as the `voteright` user, `export
  PATH="/opt/cpanel/ea-nodejs22/bin:$PATH"` first) — `package.json` lives in `app/`,
  not the repo root, so running `npm run build` from `repo/` itself fails outright
  with `ENOENT ... open '/home/voteright/repo/package.json'` (hit live 2026-08-15;
  this line previously read as if the build ran from repo root). **Run `npm install`
  before `npm run build` whenever the pulled commit touched `package.json`/
  `package-lock.json`** (hit live 2026-08-15, the first commit all deploy-session that
  added a new dependency: `npm run build` only runs `next build`, it never installs
  anything, so a newly-added package fails with `Module not found` until `npm install`
  actually puts it in `node_modules` — safe to run on every deploy regardless, it's a
  fast no-op when nothing changed). Then
  `systemctl --user restart voteright` (with `XDG_RUNTIME_DIR=/run/user/$(id -u)`
  exported first if it's a fresh shell). Deliberately **not** automated via GitHub
  Actions (considered and declined). **Copying files without a build+restart does
  nothing** — `next start` serves the pre-built `.next` folder, not the source files.
  **Apply migrations with `node db/migrate.mjs up`** (`DATABASE_URL` sourced from
  `app/.env.production` first) — corrected 2026-08-14: the `voteright` user is **not**
  in sudoers on this VPS, so the previously-documented `sudo -u postgres psql -f
  db/migrations/NNN_*.sql` fails outright (`voteright is not in the sudoers file`).
  `db/migrate.mjs` connects as the app's own `voteright` role via the same
  `DATABASE_URL` everything else uses, which already owns/can write every table the
  app itself writes to — no ownership-transfer step needed for that role. Prefer
  `git pull` over raw SCP now that the VPS repo
  is a real clone — SCPing individual files desyncs git's own bookkeeping from what's
  actually on disk (this happened once already; recovered via `git stash -u` + `git
  pull`, see the repo's commit history around 2026-07-30 for the full story).
  **A running `next start` also needs a restart to see NEW files added under
  `app/public/` even with no code/build change** (found live 2026-08-14: the Congress
  officeholder-photo ingester writes new files straight into `app/public/politicians/`
  on the VPS's own disk, no `npm run build` involved — every one of those files 404'd
  until the next restart, complete with a misleadingly cache-flavored `x-nextjs-cache:
  HIT` response header that has nothing to do with the real cause). Restart after ANY
  ingester run that can add new `public/` files, not just after a code deploy.
- **Secrets**: `app/.env.production` on the VPS carries `ADMIN_TOTP_SECRET` /
  `ADMIN_SESSION_SECRET` copied over from Vercel's values (so the owner's already-
  enrolled authenticator keeps working) plus the new local `DATABASE_URL`.
- **Debate audio/video (added 2026-08-14)**: uploaded media is transcoded server-side
  via ffmpeg and stored as plain files on local disk at `app/debate-media/` (gitignored,
  created automatically on first upload via `mkdir -p`-style recursive create — no
  manual setup needed unless `DEBATE_MEDIA_DIR` is overridden). Originally placed as a
  repo-root sibling (`../debate-media/`); moved under `app/` 2026-08-15 after a real
  build confirmed the `..`-traversing path left Next's build-time file tracer unable to
  statically bound it, sweeping unrelated compiled routes into the trace on every
  build (`next build`'s "Encountered unexpected file in NFT list" warning) — harmless
  for this deployment (no `output: 'standalone'` config, so nothing actually consumes
  those traces at runtime) but noisy and worth avoiding regardless.
  Deliberately **not** under `app/public/` — see ARCHITECTURE.md §9.1 for why; it's
  served through the gated `/api/debates/media/[id]` route instead.
  Requires **ffmpeg + ffprobe on the VPS**, installed self-serve (no root needed —
  `voteright` has no sudo) via a static build:
  `https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz`,
  extracted into `~/.local/bin` (confirmed already on `voteright`'s PATH for
  interactive shells). **`app/src/lib/media.ts` does NOT rely on that PATH** —
  systemd `--user` services don't source the login shell that adds `~/.local/bin`, so
  it resolves `~/.local/bin/ffmpeg` and `~/.local/bin/ffprobe` explicitly by default
  (override via `FFMPEG_PATH`/`FFPROBE_PATH` env vars if it's ever installed
  somewhere else). If uploads start failing in production with a "binary not found"-
  shaped error, check that assumption first — it's never been confirmed against the
  running systemd service specifically, only against an interactive shell.
  **Cloudflare's proxy caps request bodies independently of anything the app does**
  (100MB on Free/Pro plans) — confirm the zone's plan if real video uploads start
  getting cut off before the app ever sees them.
- **Audit checkpoints** (`db/checkpoint.mjs` + `db/checkpoint-and-publish.sh`,
  ARCHITECTURE.md §10): a daily VPS-side cron computes the current
  `signed_actions` chain head and commits it to `docs/audit-checkpoints/` — runs on
  the VPS itself, not GitHub Actions, since Postgres here isn't (and shouldn't be)
  publicly reachable the way Neon was. Needs a one-time git push credential set up on
  the VPS (a fine-grained GitHub token scoped to just this repo, Contents: Read and
  write) — see the comment header in `db/checkpoint-and-publish.sh` for the exact
  setup steps and crontab line.

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
