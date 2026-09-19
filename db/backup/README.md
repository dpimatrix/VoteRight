# Local backups (VoteRight + Safariis)

Built 2026-09-19 in response to a real gap: this project had **no backup
strategy at all** since the 2026-07-29 move off Neon — the VPS's Postgres DB
and the local-disk debate-media files were a single point of failure with
zero recovery path. This closes that gap in two layers.

## What this actually protects against, and what it doesn't

| Layer | Protects against | Does NOT protect against |
|---|---|---|
| VPS-local backups (`backup-db.sh`, `backup-media.sh`) | Accidental `DELETE`, a bad migration, an app bug that corrupts data, human error | The VPS itself being lost/destroyed (same disk) |
| Windows-side pull (`windows-pull-backups.ps1`) | The above, **plus** VPS/disk loss, since a copy now lives on a different machine entirely | This Windows machine being off/unreachable when a pull is scheduled (a missed pull just means yesterday's copy is what's local — not silent data loss, just a stale window) |
| Neither layer | True point-in-time recovery (restoring to "3:47pm yesterday" between daily dumps) — see the honesty note in `backup-db.sh`. Would need WAL archiving (Postgres) / binlog (MySQL), which needs root-level DB config changes. Ask if this is ever actually wanted — it's a real, separate, more involved project. | |

**A backup that's never been restored is a hypothesis, not a backup.** See
"Testing a restore" below — do this at least once now, not only when there's
a real emergency.

## VoteRight side (this repo)

- `backup-db.sh` — nightly full `pg_dump` (custom format) of VoteRight's own
  Postgres DB, GFS retention (14 daily / 90-day Sundays / 365-day
  1st-of-month).
- `backup-media.sh` — every-6-hours **true incremental** snapshot of
  `app/debate-media/` via `rsync --link-dest` (unchanged files cost zero
  extra disk; each snapshot is still a complete, directly restorable copy).
  Keeps the last 60 snapshots.
- `backup-db.service`/`.timer` and `backup-media.service`/`.timer` — systemd
  `--user` units matching this project's existing pattern
  (`close-and-notify-threads.*`, `roster-refresh.*`). Plain crontab lines
  work just as well if you'd rather not use systemd — see each script's own
  header comment for the crontab form.

### One-time VPS setup (as the `voteright` user)

```bash
chmod +x db/backup/backup-db.sh db/backup/backup-media.sh
mkdir -p ~/backups/db ~/backups/files
which rsync   # confirm it's installed; if not, ask the owner (needs root: dnf install rsync)
which pg_dump # confirm it resolves for this user

# Either systemd --user timers:
mkdir -p ~/.config/systemd/user
cp db/backup/backup-db.service db/backup/backup-db.timer \
   db/backup/backup-media.service db/backup/backup-media.timer \
   ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now backup-db.timer backup-media.timer

# ...or plain cron (see each script's header for the exact line):
crontab -e
```

## Safariis side (separate app/cPanel account — NOT deployed from here)

`safariis-backup-db.sh.template` and `safariis-backup-files.sh.template`
mirror the VoteRight scripts' shape and conventions, but are templates only
— I don't have Safariis' actual database name, credentials, or file layout,
and the `voteright` OS user almost certainly can't reach Safariis' files or
DB anyway (cPanel accounts are isolated from each other by default). To
actually use them:

1. Copy both `.template` files into wherever Safariis' own code/deploy
   lives, drop the `.template` suffix.
2. Fill in the two blanks each one flags (`SAFARIIS_DB_NAME` and `SRC`).
3. Create `~/.my.cnf` under Safariis' own account with the DB credentials
   (MySQL's own standard mechanism — keeps the password out of the script,
   crontab, and git, same discipline as everything else in this project).
4. Set up cron under Safariis' own account, same shape as VoteRight's:
   nightly DB dump, daily-or-so file snapshot (less need for VoteRight's
   6-hour cadence unless Safariis' user-generated content changes that
   often).

Both scripts write into `~/backups/db` and `~/backups/files` under
whichever account runs them — same relative layout as VoteRight's, so
`windows-pull-backups.ps1` (below) can pull both the same way.

## Windows side — getting a copy off the VPS entirely

`windows-pull-backups.ps1` — `scp -r`'s both accounts' `~/backups/` down to
`C:\Backups\VPS\voteright\` and `C:\Backups\VPS\safariis\`. Fill in the
placeholders at the top of the script (VPS hostname, Safariis' SSH username),
set up key-based SSH auth so it can run unattended, then wire it into Windows
Task Scheduler on a daily trigger a few hours after the VPS-side jobs run.
Full instructions are in the script's own header comment.

No `rsync` is installed on this machine (`scp -r` re-copies everything each
run rather than only what changed) — fine at current data volumes, worth
revisiting if pulls start taking a long time or the backup volume grows a
lot (installing `rsync` for Windows, e.g. via WSL, would make this a real
delta-sync).

## Testing a restore

Don't skip this. A concrete first test, doable without touching production:

```bash
# On the VPS (or download a .dump file and do this anywhere with Postgres):
createdb voteright_restore_test
pg_restore -d voteright_restore_test ~/backups/db/voteright-<date>.dump
psql voteright_restore_test -c "SELECT count(*) FROM politicians;"
# Compare against production's real count — then drop the test DB.
dropdb voteright_restore_test
```

For media: pick a random file from a recent snapshot in
`~/backups/files/voteright-media/latest/`, confirm it actually plays/opens
correctly (not just that the file exists at the right size).

Worth doing this once now, and then periodically (e.g. whenever the backup
scripts themselves change) — not just trusting that "it ran without an
error" means a restore would actually work.
