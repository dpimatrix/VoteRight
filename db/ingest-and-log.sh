#!/usr/bin/env bash
# Weekly data ingestion (docs/DATA-OPS.md §6) - runs on the VPS itself via cron,
# NOT GitHub Actions. Mirrors db/checkpoint-and-publish.sh's reasoning exactly:
# Postgres here isn't publicly reachable (correctly so), and this repo is
# PUBLIC, so a self-hosted GitHub Actions runner would mean any PR could get
# code execution on this box -- a real GitHub-documented risk, not worth it
# for a job that's just as happy running from a same-box cron entry instead.
#
# Replaces .github/workflows/ingest.yml's `votes` job. Each ingest script
# already logs its own outcome to the ingestion_runs ledger (visible in
# /admin's Data-freshness panel), so this wrapper doesn't need its own
# separate logging step the way checkpoint-and-publish.sh does.
#
# One-time setup on the VPS, as the voteright user:
#   1. chmod +x db/ingest-and-log.sh (git doesn't reliably preserve the
#      executable bit through a Windows-authored commit)
#   2. Add to crontab (same schedule the GitHub Actions workflow used --
#      Wednesdays 11:00 UTC / ~06:00 ET, after Tuesday council sessions):
#        0 11 * * 3 /home/voteright/repo/db/ingest-and-log.sh >> ~/ingest.log 2>&1
#   3. First-run backfill lower bounds (--since-clip / --since dates) that the
#      old workflow_dispatch inputs provided are one-time, already-consumed --
#      every jurisdiction has rows now, so incremental mode covers all of them
#      going forward. No flags needed here.
#
# Usage: ./ingest-and-log.sh
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

export PATH="/opt/cpanel/ea-nodejs22/bin:$PATH"

# A standalone script doesn't get DATABASE_URL for free the way the running
# Next.js app does (Next loads app/.env.production itself; this script is a
# separate process) - pull it from the same file so this hits the real
# production database, not the local-dev default.
#
# read_env_var, not the plain grep -m1 | cut this used to be: found live
# 2026-08-15 running db/ingest/roster-refresh.sh for the first time against
# this SAME app/.env.production -- a variable in it was defined TWICE (an
# old value, then the real current one below it), and grep -m1 (first
# match) silently grabbed the stale one; another variable's value there is
# quote-wrapped, and a plain cut sent the literal quote characters through
# as part of the value. Both are completely normal things to end up with in
# a real, hand-edited .env file over time -- this script inherited the
# same fragile extraction roster-refresh.sh already moved off of for the
# identical reason, just never got the same fix applied here.
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
if [ -f app/.env.production ]; then
  export DATABASE_URL="$(read_env_var DATABASE_URL app/.env.production)"
fi

status=0

run_step() {
  echo "── $* ──"
  if ! "$@"; then
    echo "FAILED: $*"
    status=1
  fi
}

run_step node db/migrate.mjs up
run_step node db/ingest/votes.mjs
run_step node db/ingest/council-sponsorships.mjs
run_step node db/ingest/council-sponsorships-pg.mjs
run_step node db/ingest/council-sponsorships-fairfax.mjs
run_step node db/ingest/council-sponsorships-arlington.mjs
run_step node db/ingest/council-sponsorships-dc.mjs

exit "$status"
