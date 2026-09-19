# Pulls both VoteRight's and Safariis' VPS-local backups down to this
# Windows machine, so a copy exists off the VPS entirely (protects against
# VPS/disk loss, not just app-level mistakes - see db/backup/README.md for
# the full picture of what each layer protects against).
#
# Uses plain `scp -r` (no rsync on this machine - confirmed via `where rsync`
# returning nothing). This means every run re-copies everything rather than
# only what changed, which is fine for now given the VPS side already keeps
# backup volume bounded (retention/pruning in backup-db.sh/backup-media.sh),
# but worth revisiting if this gets slow - installing rsync for Windows
# (e.g. via WSL, or a prebuilt cwRsync binary) would let this become a real
# delta-sync instead.
#
# One-time setup:
#   1. Fill in $VpsHost / $VoterightUser / $SafariisUser below.
#   2. Generate (or reuse) an SSH key pair on this machine and add the
#      public key to BOTH accounts' ~/.ssh/authorized_keys on the VPS, so
#      this can run unattended (no password prompt) via Task Scheduler.
#   3. Test manually first: `powershell -File windows-pull-backups.ps1`
#   4. Wire into Task Scheduler: a daily trigger, a few hours after the VPS
#      side's own schedule (backup-db.sh runs 03:00 ET, backup-media.sh runs
#      every 6h) so this always pulls a complete, finished backup rather
#      than one mid-write - e.g. 07:00 ET is safely clear of both.
#      Action: powershell.exe -ExecutionPolicy Bypass -File
#              "C:\Users\pks\documents\voteright\db\backup\windows-pull-backups.ps1"
#
# Usage: powershell -File windows-pull-backups.ps1

$ErrorActionPreference = "Stop"

$VpsHost = "CHANGE_ME"          # e.g. srv2.safariis.com
$VoterightUser = "voteright"
$SafariisUser = "CHANGE_ME"     # Safariis' own cPanel/SSH username

$LocalRoot = "C:\Backups\VPS"
$LogFile = Join-Path $LocalRoot "pull-log.txt"

if ($VpsHost -eq "CHANGE_ME" -or $SafariisUser -eq "CHANGE_ME") {
    Write-Error "Edit this script and fill in `$VpsHost / `$SafariisUser first."
    exit 1
}

New-Item -ItemType Directory -Force -Path $LocalRoot | Out-Null

function Write-Log($msg) {
    $line = "$(Get-Date -Format o)  $msg"
    Write-Host $line
    Add-Content -Path $LogFile -Value $line
}

function Pull-Account($sshUser, $localSubdir) {
    $dest = Join-Path $LocalRoot $localSubdir
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
    Write-Log "Pulling ${sshUser}@${VpsHost}:backups/ -> $dest"
    # -r recursive; source path is relative to the SSH user's home dir.
    & scp -r "${sshUser}@${VpsHost}:backups/*" $dest 2>&1 | ForEach-Object { Write-Log $_ }
    if ($LASTEXITCODE -ne 0) {
        Write-Log "FAILED: scp exited $LASTEXITCODE for $sshUser"
        return $false
    }
    Write-Log "OK: $sshUser pull complete"
    return $true
}

$ok1 = Pull-Account $VoterightUser "voteright"
$ok2 = Pull-Account $SafariisUser "safariis"

if (-not ($ok1 -and $ok2)) {
    Write-Log "One or more pulls failed - see above. Not treating this as a silent success."
    exit 1
}

Write-Log "Both pulls completed successfully."
