# VoteRight — Operations Calendar

Status: v1.0 · 2026-10-03

This is the one place that answers "what needs to happen, and how often, to
keep VoteRight running and trustworthy." Everything below was verified
directly against what's actually running (`db/*.timer`/`*.service`, the real
crontab entries documented in each script's own header, `.github/workflows/`)
rather than written from memory — if something here and the script it
describes ever disagree, the script is right and this doc is stale.

Every row is marked **Automated** (already running on its own; a human only
needs to glance at the result) or **Manual** (a human has to actually do
something). Today, every Manual row's role is **Owner** — there is one admin
account (`owner`) with all 15 screens granted. The grouping below mirrors the
4 sections the `/admin` dashboard is already organized into (Civic content &
coverage / Trust & safety / Money & compliance / Admin), so if this ever
splits across more than one person, those are the natural seams — see
"Dividing this across more than one person," at the bottom.

**The single tool that ties the automated half together**: the `/admin`
dashboard's own "Data freshness" panel (`ingestionFreshness()` in
`app/src/lib/queries.ts`) already watches every automated job's last-run
status and flags anything silently stale. Checking that panel is itself one
of the recurring tasks below — it's the fastest way to confirm the whole
automated layer is actually healthy without re-deriving this document from
scratch each time.

## Continuous / every 15 minutes

| What | Automated? | Mechanism |
|---|---|---|
| Debate thread lifecycle sweep (close expired threads past `closes_at`; notify newly call-the-question-eligible threads) | **Automated** | `close-and-notify-threads.timer` (systemd `--user`, every 15 min) |

Nothing for a human to do here day-to-day — just know it exists so a thread
that closes "on time" isn't mistaken for a manual action.

## Daily

| What | Automated? | Mechanism |
|---|---|---|
| Database backup (grandfather-father-son retention, self-pruning) | **Automated** | `backup-db.timer`, 03:00 ET |
| Debate-media backup (every 6 hours, so technically 4×/day) | **Automated** | `backup-media.timer`, 00/06/12/18:00 |
| Coverage-alert watchdog (emails admins when a Pending seat flips to Tracked) | **Automated** | `notify-coverage-changes.timer`, 04:00 |
| Audit-checkpoint commit + push (`signed_actions` chain head → `docs/audit-checkpoints/`) | **Automated** | `checkpoint-and-publish.sh` via crontab, 06:00 UTC |
| Production smoke test against the live site | **Automated** | `.github/workflows/prod-smoke.yml`, 08:17 ET |
| **Off-VPS backup pull** (copies the VPS's own backups to this Windows machine — the one layer that survives total VPS/disk loss) | **Manual — Owner** (not yet automated; `windows-pull-backups.ps1` exists but is **not currently registered in Task Scheduler** on this machine, confirmed live) | Run `powershell -File db/backup/windows-pull-backups.ps1` yourself, or finish the one-time Task Scheduler setup in that script's own header so this line moves to Automated |
| **Argument moderation queue** (`/admin/moderation`) — content sits unpublished until reviewed; this is the one queue with a real-time user-facing cost to leaving it unattended | **Manual — Owner** | Clear anything pending; also glance at reported threads on the same screen |
| Glance at `/admin` dashboard's **Data freshness** panel | **Manual — Owner** | Catches a silently-broken automated job (any red/stale tile) same-day instead of same-month |

## Weekly

| What | Automated? | Mechanism |
|---|---|---|
| Nationwide vote + candidate-filing ingestion (Congress House+Senate votes, MD+VA state legislature votes, MD general candidates, VA federal candidates) | **Automated** | `nationwide-ingest-and-log.timer`, Saturdays 10:00 |
| Montgomery-area ingestion (council votes, migrations auto-applied, council-sponsorships ×5: Montgomery/PG/Fairfax/Arlington/DC) | **Automated** | `db/ingest-and-log.sh` via crontab, Wednesdays 11:00 UTC |
| **Vote → position coding** (`/admin/positions`) — turning the week's freshly-ingested roll calls into scored, cited positions | **Manual — Owner** | This is deliberate, judgment-by-judgment human work (never batch-inferred) — budget real time weekly, right after Saturday's ingest run lands |
| **Position-coding confirmation queue** (`/admin/coding`) — confirming/rejecting model-suggested codings | **Manual — Owner** | |
| **Priority topics & axes review queue** (`/admin/priority-axes`) — anything draft/in-review | **Manual — Owner** | |
| **Race coverage** (`/admin/race-coverage`) — re-check the gap list now that the week's ingest ran; triage by the "residents waiting" count, not the raw total | **Manual — Owner** | |
| **Referenda & mandates pipeline** (`/admin/mandates`) — anything newly "ready to schedule" or needing certification | **Manual — Owner** | |
| **Integrity disputes** (`/admin/disputes`) — open disputes, 14-day reply-window tracking | **Manual — Owner** | |
| **Anomaly review** (`/admin/anomalies`) — Sybil/coordinated-manipulation flags | **Manual — Owner** | |
| **Outside money & endorsements** (`/admin/transparency`) — curate anything newly filed/announced | **Manual — Owner** | |
| **Privacy requests** (`/admin/privacy`) — confirm nothing is approaching its 45-day (or 60-day appeal) statutory deadline | **Manual — Owner** | Check more often than weekly once any single request is within ~10 days of deadline |

## Monthly

| What | Automated? | Mechanism |
|---|---|---|
| Roster refresh (Congress.gov + OpenStates — retires departed officeholders, adds new ones) | **Automated** | `roster-refresh.timer`, 1st of month, 03:00 |
| Review `ingestion_runs` for silent failures beyond what the daily freshness glance already catches | **Manual — Owner** | Per `docs/DATA-OPS.md` §7 |
| **Jurisdiction demand** (`/admin/jurisdiction-demand`) — even below the 12-signal auto-alert threshold, worth a look; use "Research this jurisdiction" on anything close | **Manual — Owner** | |
| **Accountability campaigns** (`/admin/accountability`) — curation pass | **Manual — Owner** | |
| **Membership subscriptions** (`/admin/subscriptions`) — mostly self-service via Stripe; scan for anomalies | **Manual — Owner** | |
| **Payment verification** (`/admin/payments`) — reconcile any mailed checks received | **Manual — Owner** | More often if check volume picks up |

## Quarterly / periodic (not calendar-driven)

| What | Automated? | Mechanism |
|---|---|---|
| Bias-audit sampling + acceptance gates | **Manual — Owner** | Per `docs/SCORING.md` |
| Post-launch legal-cadence items | **Manual — Owner** | Per `docs/COUNSEL-REVIEW.md`'s own table |
| **Admin accounts audit** (`/admin/admin-accounts`) — confirm every granted screen still makes sense, especially if more than one admin ever exists | **Manual — Owner** | Cheap insurance even solo; the real payoff is once a second person has an account |
| Coverage-expansion checklist — re-run **every time** a new jurisdiction tier is added (new state, new office type, new region), not on a calendar | **Manual — Owner** | `docs/DATA-OPS.md` §8's own table — roster existing ≠ evidence pipeline existing |

## Ad-hoc / event-triggered (happens when something happens, not on a schedule)

| Trigger | What happens | Role |
|---|---|---|
| Any `git push` to `main` | Typecheck + test | **Automated** (`ci.yml`) |
| A code/content change ships | `git pull` + build + migrate + restart (web); `eas update` (mobile, only if mobile-facing code changed) | **Manual — Owner**, self-serve per `docs/DEPLOY.md` |
| A new county/jurisdiction needs onboarding | Research real office structure + officeholders (citable sources only), write a migration, verify live, deploy | **Manual — Owner** (or delegated research, same citation bar either way) |
| A resident disputes a claim | Work the dispute through its reply-window timeline | **Manual — Owner**, `/admin/disputes` |
| A privacy request arrives | Work it within the MODPA statutory clock | **Manual — Owner**, `/admin/privacy` |
| A new admin needs access | Create the account, grant exactly the screens needed | **Manual — Owner**, `/admin/admin-accounts` |

## Dividing this across more than one person

Everything "Manual — Owner" above is already gated by the same per-screen
permission model (`admin_screen_access` / `SCREEN_KEYS` in
`app/src/lib/adminAuth.ts`) the dashboard's own 4 groups are built from. If
this ever needs more than one person, that's the natural split, already
built and ready to grant selectively:

- **Civic content & coverage** — priority axes, position coding, vote→position
  coding, mandates, accountability, race coverage, jurisdiction demand
- **Trust & safety** — disputes, moderation, anomalies
- **Money & compliance** — payments, subscriptions, transparency, privacy
- **Admin** — admin accounts

No code change needed to make that split real — just grant a new admin
account the screens for one group instead of all 15.
