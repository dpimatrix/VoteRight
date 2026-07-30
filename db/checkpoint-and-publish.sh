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
#   3. Push once by hand when prompted for username/token, so the credential
#      gets cached in ~/.git-credentials (chmod 600 that file).
#   4. Add to crontab: 0 6 * * * /home/voteright/repo/db/checkpoint-and-publish.sh
#
# Usage: ./checkpoint-and-publish.sh
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

export PATH="/opt/cpanel/ea-nodejs22/bin:$PATH"
node db/checkpoint.mjs

if [ -z "$(git status --porcelain docs/audit-checkpoints/)" ]; then
  echo "No new checkpoint file - nothing to publish."
  exit 0
fi

git add docs/audit-checkpoints/
git commit -m "Daily audit checkpoint: $(date -u +%F)"
git push origin main
