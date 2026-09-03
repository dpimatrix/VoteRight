#!/usr/bin/env bash
# Daily coverage-alert watchdog wrapper (2026-09-03) -- see
# notify-coverage-changes.mjs's own header for what this actually does.
# Same read_env_var extraction roster-refresh.sh already established
# (last-matching-line-wins + quote-stripping) -- this exact worktree/
# branch is named for the recurring bug class a naive `grep -m1 | cut`
# already caused twice before; reusing the proven-correct version rather
# than re-deriving it.
#
# One-time setup on the VPS, as the voteright user:
#   1. Confirm RESEND_API_KEY (and optionally RESEND_FROM_EMAIL, SITE_URL)
#      are set in app/.env.production -- same file the running app itself
#      already reads them from for voter-side notifications.
#   2. chmod +x db/ingest/notify-coverage-changes.sh (git doesn't reliably
#      preserve the executable bit through a Windows-authored commit)
#   3. mkdir -p ~/.config/systemd/user && cp db/ingest/notify-coverage-changes.service db/ingest/notify-coverage-changes.timer ~/.config/systemd/user/
#   4. export XDG_RUNTIME_DIR=/run/user/$(id -u)  # needed for --user systemctl outside an active login session
#   5. systemctl --user daemon-reload
#   6. systemctl --user enable --now notify-coverage-changes.timer
#   7. Verify: systemctl --user list-timers notify-coverage-changes.timer
#
# Run once immediately (don't wait for the schedule):
#   systemctl --user start notify-coverage-changes.service
#   journalctl --user -u notify-coverage-changes.service
#
# Usage: ./notify-coverage-changes.sh
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

export PATH="/opt/cpanel/ea-nodejs22/bin:$PATH"

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
RESEND_API_KEY="${RESEND_API_KEY:-}"
RESEND_FROM_EMAIL="${RESEND_FROM_EMAIL:-}"
SITE_URL="${SITE_URL:-}"
for envfile in app/.env.production app/.env.local; do
  [ -f "$envfile" ] || continue
  [ -z "$DATABASE_URL" ] && DATABASE_URL="$(read_env_var DATABASE_URL "$envfile")"
  [ -z "$RESEND_API_KEY" ] && RESEND_API_KEY="$(read_env_var RESEND_API_KEY "$envfile")"
  [ -z "$RESEND_FROM_EMAIL" ] && RESEND_FROM_EMAIL="$(read_env_var RESEND_FROM_EMAIL "$envfile")"
  [ -z "$SITE_URL" ] && SITE_URL="$(read_env_var SITE_URL "$envfile")"
done
export DATABASE_URL RESEND_API_KEY RESEND_FROM_EMAIL SITE_URL

echo "=== notify-coverage-changes $(date -u +%FT%TZ) ==="
node db/ingest/notify-coverage-changes.mjs || echo "notify-coverage-changes.mjs exited non-zero -- see ingestion_runs for detail"
echo "=== notify-coverage-changes done $(date -u +%FT%TZ) ==="
