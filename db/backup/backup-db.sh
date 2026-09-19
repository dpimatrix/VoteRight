#!/usr/bin/env bash
# Local full database backup for VoteRight's own PostgreSQL DB, with
# grandfather-father-son retention. Runs on the VPS itself, same posture as
# checkpoint-and-publish.sh/ingest-and-log.sh — nothing pushed anywhere;
# this is step 1 of "local backup", the Windows-side pull script
# (windows-pull-backups.ps1) is step 2, which gets a copy off this box.
#
# Honesty note: pg_dump is a FULL logical dump every time — Postgres has no
# built-in incremental-dump mode the way some databases do. Real incremental/
# point-in-time recovery needs WAL archiving (archive_mode + archive_command
# in postgresql.conf), which needs root-level Postgres config access the
# `voteright` OS user doesn't have. This script's "incremental" is therefore
# a retention *schedule* (frequent dailies, sparser long-term tiers), not a
# true block/WAL-level incremental — genuinely useful (protects against
# accidental deletes, bad migrations, app bugs) but NOT continuous
# point-in-time recovery. If that's ever wanted, it's a separate,
# root-level project — ask and this can be scoped out.
#
# Retention (GFS-style, evaluated on every run so no separate cron entry is
# needed per tier):
#   - every dump: kept 14 days
#   - Sunday's dump: kept 90 days
#   - 1st-of-month's dump: kept 365 days
#
# One-time setup on the VPS, as the voteright user:
#   1. chmod +x db/backup/backup-db.sh (git doesn't reliably preserve the
#      executable bit through a Windows-authored commit)
#   2. mkdir -p ~/backups/db
#   3. Add to crontab (03:00 ET, ahead of the 06:00 checkpoint cron and clear
#      of the 15-min thread-sweep timer):
#        0 3 * * * /home/voteright/repo/db/backup/backup-db.sh >> ~/backups/backup-db.log 2>&1
#   (a systemd --user unit pair, backup-db.service/.timer, is also provided
#   if you'd rather use that instead of plain cron — see README.md)
#
# Usage: ./backup-db.sh
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

BACKUP_DIR="${VOTERIGHT_BACKUP_DIR:-$HOME/backups/db}"
mkdir -p "$BACKUP_DIR"

# Same fragile-.env lesson already learned by checkpoint-and-publish.sh and
# ingest-and-log.sh (duplicate keys, quote-wrapped values) — reusing the
# exact same extraction helper rather than the plain grep -m1 | cut this
# whole project moved off of.
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
if [ -z "${DATABASE_URL:-}" ]; then
  echo "FAILED: DATABASE_URL not found in app/.env.production" >&2
  exit 1
fi

TODAY="$(date -u +%F)"
DUMP_FILE="$BACKUP_DIR/voteright-${TODAY}.dump"

# Custom format (-Fc): compressed, and unlike a plain .sql dump it supports
# pg_restore's selective/parallel restore (restore one table, or use -j for
# a faster full restore) instead of forcing a single sequential psql replay.
if ! pg_dump -Fc "$DATABASE_URL" -f "$DUMP_FILE.tmp"; then
  echo "FAILED: pg_dump exited non-zero" >&2
  rm -f "$DUMP_FILE.tmp"
  exit 1
fi
mv "$DUMP_FILE.tmp" "$DUMP_FILE"
echo "OK: $DUMP_FILE ($(du -h "$DUMP_FILE" | cut -f1))"

# --- Retention ---
# Delete dumps older than 14 days, EXCEPT: a Sunday dump (kept 90 days) or a
# 1st-of-month dump (kept 365 days). Evaluated from each file's own embedded
# date, not mtime, so this stays correct even if a run is late/retried.
DAY_MS=86400
NOW_EPOCH="$(date -u +%s)"
for f in "$BACKUP_DIR"/voteright-*.dump; do
  [ -e "$f" ] || continue
  fdate="$(basename "$f" .dump | sed 's/^voteright-//')"
  fepoch="$(date -u -d "$fdate" +%s 2>/dev/null)" || continue
  age_days=$(( (NOW_EPOCH - fepoch) / DAY_MS ))
  dow="$(date -u -d "$fdate" +%u)"   # 7 = Sunday
  dom="$(date -u -d "$fdate" +%d)"   # 01 = first of month
  if [ "$age_days" -le 14 ]; then
    continue
  elif [ "$dom" = "01" ] && [ "$age_days" -le 365 ]; then
    continue
  elif [ "$dow" = "7" ] && [ "$age_days" -le 90 ]; then
    continue
  else
    echo "Pruning old dump: $f (age ${age_days}d)"
    rm -f "$f"
  fi
done
