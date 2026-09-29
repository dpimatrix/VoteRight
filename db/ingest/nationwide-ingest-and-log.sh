#!/usr/bin/env bash
# Weekly nationwide vote + candidate-filing ingestion (owner request,
# 2026-09-29 -- "how to truly maintain and operate the admin side").
#
# Real gap this closes: every nationwide-scope ingester built 2026-09-22
# through 2026-09-28 (congress-votes.mjs, senate-votes.mjs,
# state-legislature-votes.mjs, md-general-candidates.mjs,
# va-federal-candidates.mjs) had ZERO scheduling -- each was run by hand,
# once, ad hoc. Compare db/ingest-and-log.sh, which has run
# db/ingest/votes.mjs (the original Montgomery-only ingester) on a weekly
# cron since early in this project. The nationwide expansion inherited
# none of that automation discipline: as Congress keeps voting and
# candidate filings keep changing, nothing re-runs unless someone
# remembers to do it by hand. This script is that missing piece.
#
# All five scripts are independently idempotent (proven live, repeatedly,
# when each was built) and default to INCREMENTAL mode (no --full flag --
# the three vote ingesters only fetch roll calls since their own last-
# ingested vote date; the two candidate ingesters are cheap enough to
# just re-check their full public source every run and rely on their own
# UNIQUE-constraint idempotency, same as md/va's own verified behavior).
# Each already logs its own outcome to the ingestion_runs ledger --
# visible in /admin's Data-freshness panel -- so, same reasoning
# roster-refresh.sh's own header already documents, this wrapper doesn't
# need a separate logging step of its own.
#
# Deliberately NOT `set -e`, same as roster-refresh.sh: a transient
# failure in one script (an API outage, a rate limit) shouldn't stop the
# others from being attempted -- all five are independently safe to skip
# a cycle on their own and pick back up next week.
#
# Triggered by a systemd --user timer (this script's own
# nationwide-ingest-and-log.service + .timer), the same mechanism
# roster-refresh.sh already uses -- not cron, matching this project's
# newer convention (checkpoint-and-publish.sh predates it and stays on
# cron; no need to migrate that one).
#
# One-time setup on the VPS, as the voteright user:
#   1. Confirm CONGRESS_API_KEY and OPENSTATES_API_KEY are set in
#      app/.env.production (preferred) or app/.env.local (fallback) --
#      already required for roster-refresh.sh, so if that's running,
#      these are already in place. senate-votes.mjs/md-general-
#      candidates.mjs/va-federal-candidates.mjs need no API key at all
#      (public sources, no auth).
#   2. chmod +x db/ingest/nationwide-ingest-and-log.sh (git doesn't
#      reliably preserve the executable bit through a Windows-authored
#      commit)
#   3. mkdir -p ~/.config/systemd/user && cp db/ingest/nationwide-ingest-and-log.service db/ingest/nationwide-ingest-and-log.timer ~/.config/systemd/user/
#   4. export XDG_RUNTIME_DIR=/run/user/$(id -u)  # needed for --user systemctl outside an active login session
#   5. systemctl --user daemon-reload
#   6. systemctl --user enable --now nationwide-ingest-and-log.timer
#   7. Verify: systemctl --user list-timers nationwide-ingest-and-log.timer
#      (shows the next scheduled run) and systemctl --user status nationwide-ingest-and-log.timer
#
# To run it once immediately without waiting for the schedule (e.g. to
# verify the setup works): systemctl --user start nationwide-ingest-and-log.service
# Then check its output: journalctl --user -u nationwide-ingest-and-log.service
#
# Usage: ./nationwide-ingest-and-log.sh
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

export PATH="/opt/cpanel/ea-nodejs22/bin:$PATH"

# Same read_env_var() as roster-refresh.sh, reused verbatim -- it already
# fixed two real bugs found live running that script the first time
# (CONGRESS_API_KEY defined twice in app/.env.production, a plain
# grep -m1 silently grabbing the stale earlier value; OPENSTATES_API_KEY
# wrapped in quotes there, a plain cut sending the literal quote
# characters as part of the credential). Prefer .env.production (the
# real deploy's own values); only fall back to .env.local for a key
# that isn't there.
read_env_var() {
  local var_name="$1" file="$2" raw
  raw="$(grep "^${var_name}=" "$file" 2>/dev/null | tail -1 | cut -d= -f2-)"
  if [[ "$raw" == \"*\" && "$raw" == *\" ]]; then
    raw="${raw:1:-1}"
  elif [[ "$raw" == \'*\' && "$raw" == *\' ]]; then
    raw="${raw:1:-1}"
  fi
  echo "$raw"
}
DATABASE_URL="${DATABASE_URL:-}"
CONGRESS_API_KEY="${CONGRESS_API_KEY:-}"
OPENSTATES_API_KEY="${OPENSTATES_API_KEY:-}"
for envfile in app/.env.production app/.env.local; do
  [ -f "$envfile" ] || continue
  [ -z "$DATABASE_URL" ] && DATABASE_URL="$(read_env_var DATABASE_URL "$envfile")"
  [ -z "$CONGRESS_API_KEY" ] && CONGRESS_API_KEY="$(read_env_var CONGRESS_API_KEY "$envfile")"
  [ -z "$OPENSTATES_API_KEY" ] && OPENSTATES_API_KEY="$(read_env_var OPENSTATES_API_KEY "$envfile")"
done
export DATABASE_URL CONGRESS_API_KEY OPENSTATES_API_KEY

echo "=== nationwide-ingest-and-log $(date -u +%FT%TZ) ==="

echo "--- congress-votes.mjs (U.S. House) ---"
node db/ingest/congress-votes.mjs \
  || echo "congress-votes.mjs exited non-zero -- see ingestion_runs for detail; remaining scripts below still run regardless"

echo "--- senate-votes.mjs (U.S. Senate) ---"
node db/ingest/senate-votes.mjs \
  || echo "senate-votes.mjs exited non-zero -- see ingestion_runs for detail"

echo "--- state-legislature-votes.mjs (MD+VA) ---"
node db/ingest/state-legislature-votes.mjs --states=md,va \
  || echo "state-legislature-votes.mjs exited non-zero -- see ingestion_runs for detail"

echo "--- md-general-candidates.mjs ---"
node db/ingest/md-general-candidates.mjs \
  || echo "md-general-candidates.mjs exited non-zero -- see its own console output for detail"

echo "--- va-federal-candidates.mjs ---"
node db/ingest/va-federal-candidates.mjs \
  || echo "va-federal-candidates.mjs exited non-zero -- see its own console output for detail"

echo "=== nationwide-ingest-and-log done $(date -u +%FT%TZ) ==="
