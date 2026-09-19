#!/usr/bin/env bash
# Local full+incremental backup of VoteRight's debate-media directory
# (app/debate-media/ — audio/video debate arguments, see app/src/lib/media.ts).
# This IS genuinely incremental, unlike backup-db.sh's dump-schedule
# approximation: each snapshot uses `rsync --link-dest` against the previous
# one, so a file that hasn't changed since last run costs ZERO extra disk
# (hardlinked, not copied) while a new/changed file gets a real new copy.
# Every snapshot directory is still a complete, directly-browsable/restorable
# copy of the media directory as of that run — the classic rsnapshot/Time
# Machine pattern, not a diff you have to replay forward.
#
# One-time setup on the VPS, as the voteright user:
#   1. chmod +x db/backup/backup-media.sh
#   2. Confirm rsync is installed: `which rsync` (cPanel boxes normally have
#      it; if not, `dnf install rsync` needs root — ask the owner, don't try
#      to work around a missing rsync some other way).
#   3. mkdir -p ~/backups/files
#   4. Add to crontab (every 6 hours):
#        0 */6 * * * /home/voteright/repo/db/backup/backup-media.sh >> ~/backups/backup-media.log 2>&1
#
# Usage: ./backup-media.sh
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

if ! command -v rsync >/dev/null 2>&1; then
  echo "FAILED: rsync not found on PATH — see this script's own header comment" >&2
  exit 1
fi

SRC="${VOTERIGHT_MEDIA_DIR:-$(pwd)/app/debate-media}/"
BACKUP_ROOT="${VOTERIGHT_BACKUP_DIR:-$HOME/backups/files}/voteright-media"
LATEST_LINK="$BACKUP_ROOT/latest"
TIMESTAMP="$(date -u +%Y-%m-%dT%H-%M)"
NEW_SNAPSHOT="$BACKUP_ROOT/$TIMESTAMP"

if [ ! -d "$SRC" ]; then
  echo "OK: nothing to back up yet, $SRC does not exist"
  exit 0
fi

mkdir -p "$BACKUP_ROOT"

if [ -d "$LATEST_LINK" ]; then
  rsync -a --delete --link-dest="$LATEST_LINK" "$SRC" "$NEW_SNAPSHOT/"
else
  rsync -a "$SRC" "$NEW_SNAPSHOT/"
fi

# Repoint "latest" (a real directory, not a symlink, so --link-dest above can
# hardlink into it directly without following/resolving a symlink each time).
rm -rf "$LATEST_LINK"
cp -al "$NEW_SNAPSHOT" "$LATEST_LINK" 2>/dev/null || cp -r "$NEW_SNAPSHOT" "$LATEST_LINK"

echo "OK: $NEW_SNAPSHOT ($(du -sh "$NEW_SNAPSHOT" | cut -f1) apparent, hardlinks make the real incremental cost much smaller)"

# --- Retention: keep the last 60 snapshots (~15 days at 6h cadence). ---
# Hardlinking means this is much cheaper than 60x the directory's real size —
# only files that actually changed between consecutive snapshots consume new
# space — but it's not free, so still bounded rather than kept forever.
ls -1dt "$BACKUP_ROOT"/20* 2>/dev/null | tail -n +61 | while read -r old; do
  echo "Pruning old snapshot: $old"
  rm -rf "$old"
done
