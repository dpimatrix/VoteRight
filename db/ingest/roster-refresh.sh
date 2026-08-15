#!/usr/bin/env bash
# Monthly roster refresh for Congress + state legislators (DATA-OPS.md §6/7
# cadence table: roster changes are slow-moving, monthly is the right
# frequency). Runs congress.mjs then openstates-legislature.mjs back to
# back -- both are idempotent, and both (2026-08-15) correctly retire a
# departed officeholder on top of adding new ones now, which is what makes
# this safe to run completely unattended instead of only by hand right
# after a known election.
#
# Each script already logs its own outcome to ingestion_runs (source=
# 'congress-gov-roster' / 'openstates-legislature-roster') -- no separate
# logging step needed here, unlike checkpoint-and-publish.sh's companion
# checkpoint-log.mjs (checkpoint.mjs doesn't self-log; these two already do).
#
# Deliberately NOT `set -e`: a transient failure in one script (e.g. an
# OpenStates outage) shouldn't stop the other from being attempted -- both
# are independently idempotent and safe to skip a cycle on their own.
#
# Triggered by a systemd --user timer (db/ingest/roster-refresh.timer +
# .service), the same mechanism the app itself already runs under
# (systemctl --user, DEPLOY.md) -- not cron, unlike checkpoint-and-publish.sh
# (that one predates this and stays on cron; no need to migrate it). A
# --user timer needs `loginctl enable-linger voteright` to fire while nobody
# is logged in, which DEPLOY.md says is already set up for the app service,
# so no new prerequisite there.
#
# One-time setup on the VPS, as the voteright user:
#   1. Confirm CONGRESS_API_KEY and OPENSTATES_API_KEY are set in
#      app/.env.production (preferred) or app/.env.local (fallback) -- this
#      script sources whichever file actually has each one, same file-based
#      pattern checkpoint-and-publish.sh already uses for DATABASE_URL. Free
#      keys, if not already on hand: https://api.congress.gov/sign-up/ and
#      https://openstates.org/api/register/
#   2. chmod +x db/ingest/roster-refresh.sh (git doesn't reliably preserve
#      the executable bit through a Windows-authored commit)
#   3. mkdir -p ~/.config/systemd/user && cp db/ingest/roster-refresh.service db/ingest/roster-refresh.timer ~/.config/systemd/user/
#   4. export XDG_RUNTIME_DIR=/run/user/$(id -u)  # needed for --user systemctl outside an active login session, same as any other systemctl --user call in DEPLOY.md
#   5. systemctl --user daemon-reload
#   6. systemctl --user enable --now roster-refresh.timer
#   7. Verify: systemctl --user list-timers roster-refresh.timer
#      (shows the next scheduled run) and systemctl --user status roster-refresh.timer
#
# To run it once immediately without waiting for the schedule (e.g. to
# verify the setup works): systemctl --user start roster-refresh.service
# Then check its output: journalctl --user -u roster-refresh.service
# (the service has no StandardOutput override -- systemd --user services
# default to the journal, which captures this with zero extra config)
#
# Usage: ./roster-refresh.sh
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

export PATH="/opt/cpanel/ea-nodejs22/bin:$PATH"

# Standalone scripts don't get env vars for free the way the running Next.js
# app does (Next loads app/.env.production itself; these are separate
# processes). Prefer .env.production (the real deploy's own values); only
# fall back to .env.local for a key that isn't there, rather than letting a
# stale dev value silently win over a real production one.
DATABASE_URL="${DATABASE_URL:-}"
CONGRESS_API_KEY="${CONGRESS_API_KEY:-}"
OPENSTATES_API_KEY="${OPENSTATES_API_KEY:-}"
if [ -f app/.env.production ]; then
  [ -z "$DATABASE_URL" ] && DATABASE_URL="$(grep -m1 '^DATABASE_URL=' app/.env.production | cut -d= -f2-)"
  [ -z "$CONGRESS_API_KEY" ] && CONGRESS_API_KEY="$(grep -m1 '^CONGRESS_API_KEY=' app/.env.production | cut -d= -f2-)"
  [ -z "$OPENSTATES_API_KEY" ] && OPENSTATES_API_KEY="$(grep -m1 '^OPENSTATES_API_KEY=' app/.env.production | cut -d= -f2-)"
fi
if [ -f app/.env.local ]; then
  [ -z "$DATABASE_URL" ] && DATABASE_URL="$(grep -m1 '^DATABASE_URL=' app/.env.local | cut -d= -f2-)"
  [ -z "$CONGRESS_API_KEY" ] && CONGRESS_API_KEY="$(grep -m1 '^CONGRESS_API_KEY=' app/.env.local | cut -d= -f2-)"
  [ -z "$OPENSTATES_API_KEY" ] && OPENSTATES_API_KEY="$(grep -m1 '^OPENSTATES_API_KEY=' app/.env.local | cut -d= -f2-)"
fi
export DATABASE_URL CONGRESS_API_KEY OPENSTATES_API_KEY

echo "=== roster-refresh $(date -u +%FT%TZ) ==="

echo "--- congress.mjs ---"
node db/ingest/congress.mjs || echo "congress.mjs exited non-zero -- see ingestion_runs for detail; openstates-legislature.mjs below still runs regardless"

echo "--- openstates-legislature.mjs ---"
# Full 48-state list from STATE_TERM_INFO (db/ingest/openstates-legislature.mjs) --
# that script has no implicit "all states" default by design, so this must
# be kept in sync by hand if a new state is ever added there.
node db/ingest/openstates-legislature.mjs --states=md,va,al,la,ms,nj,mi,mn,ks,nm,sc,az,ct,ga,id,me,ma,nh,ny,nc,ri,sd,vt,ak,ar,ca,co,de,fl,hi,il,in,ia,ky,mo,mt,nv,oh,ok,or,pa,tn,tx,ut,wa,wv,wi,wy \
  || echo "openstates-legislature.mjs exited non-zero -- see ingestion_runs for detail"

echo "=== roster-refresh done $(date -u +%FT%TZ) ==="
