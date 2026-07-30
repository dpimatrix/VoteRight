#!/usr/bin/env bash
# Daily tamper-evidence checkpoint (ARCHITECTURE.md Section 10) - computes the
# current signed_actions chain head and commits+pushes it to the public repo.
# Runs on the VPS itself via cron, NOT GitHub Actions - Postgres here isn't
# publicly reachable (correctly so), so the checkpoint has to be computed
# locally, where the database actually lives.
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
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

export PATH="/opt/cpanel/ea-nodejs22/bin:$PATH"

# A standalone script doesn't get DATABASE_URL for free the way the running
# Next.js app does (Next loads app/.env.production itself; this script is a
# separate process) - pull it from the same file so this hits the real
# production database, not the local-dev default.
if [ -f app/.env.production ]; then
  export DATABASE_URL="$(grep -m1 '^DATABASE_URL=' app/.env.production | cut -d= -f2-)"
fi

node db/checkpoint.mjs

if [ -z "$(git status --porcelain docs/audit-checkpoints/)" ]; then
  echo "No new checkpoint file - nothing to publish."
  exit 0
fi

git add docs/audit-checkpoints/
git commit -m "Daily audit checkpoint: $(date -u +%F)"
git push origin main
