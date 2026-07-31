#!/usr/bin/env bash
# Daily tamper-evidence checkpoint (ARCHITECTURE.md Section 10) - computes the
# current signed_actions chain head and commits+pushes it to the public repo.
# Runs on the VPS itself via cron, NOT GitHub Actions - Postgres here isn't
# publicly reachable (correctly so), so the checkpoint has to be computed
# locally, where the database actually lives.
#
# Logs its outcome to the same ingestion_runs ledger the data-feed ingesters
# use (source='checkpoint-publish', via db/checkpoint-log.mjs) so a silently
# broken cron job -- expired token, git push failing, the VPS cron itself
# disabled -- shows up in the admin freshness panel instead of just going
# quiet. Deliberately NOT `set -e`: every exit path below must still reach
# the logging call at the end, including failure paths.
#
# One-time setup on the VPS, as the voteright user:
#   1. Create a fine-grained GitHub personal access token scoped to ONLY this
#      repo, with Contents: Read and write - nothing else.
#   2. git config --global credential.helper store
#   3. echo "https://<github-username>:<token>@github.com" > ~/.git-credentials
#      chmod 600 ~/.git-credentials
#   4. chmod +x db/checkpoint-and-publish.sh (git doesn't reliably preserve the
#      executable bit through a Windows-authored commit)
#   5. Add to crontab: 0 6 * * * /home/voteright/repo/db/checkpoint-and-publish.sh
#
# Usage: ./checkpoint-and-publish.sh
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

export PATH="/opt/cpanel/ea-nodejs22/bin:$PATH"

# A standalone script doesn't get DATABASE_URL for free the way the running
# Next.js app does (Next loads app/.env.production itself; this script is a
# separate process) - pull it from the same file so this hits the real
# production database, not the local-dev default.
if [ -f app/.env.production ]; then
  export DATABASE_URL="$(grep -m1 '^DATABASE_URL=' app/.env.production | cut -d= -f2-)"
fi

log_and_exit() {
  CHECKPOINT_STATUS="$1" CHECKPOINT_NOTE="$2" CHECKPOINT_DATE="$(date -u +%F)" node db/checkpoint-log.mjs
  exit "$3"
}

if ! node db/checkpoint.mjs; then
  log_and_exit failed "node db/checkpoint.mjs failed (see cron output for detail)" 1
fi

if [ -z "$(git status --porcelain docs/audit-checkpoints/)" ]; then
  log_and_exit succeeded "no new checkpoint needed today" 0
fi

if ! git add docs/audit-checkpoints/; then
  log_and_exit failed "git add failed" 1
fi
if ! git commit -m "Daily audit checkpoint: $(date -u +%F)"; then
  log_and_exit failed "git commit failed" 1
fi
if ! git push origin main; then
  log_and_exit failed "checkpoint computed and committed locally, but git push failed -- it is NOT actually published/visible yet" 1
fi

log_and_exit succeeded "checkpoint computed, committed, and pushed" 0
