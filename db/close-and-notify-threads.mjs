#!/usr/bin/env node
// Debate-thread lifecycle background job (2026-08-24, ARCHITECTURE.md §12 /
// docs/BACKLOG.md). Two jobs in one script, both operating on the same
// "sweep every open thread" pass:
//
//  1. NATURAL EXPIRY (a real pre-existing gap, found while building this):
//     nothing anywhere in the app ever flipped forum_threads.status from
//     'open' to 'closed' when closes_at passed on its own -- the only two
//     code paths that ever closed a thread were a call-the-question vote
//     succeeding and an admin's force-close. A thread nobody ever called
//     the question on or reported just stayed 'open' forever, arguments/
//     votes still live, well past its stated 14-day window. This job
//     closes it and advances the proposal to 'referendum', same outcome
//     the other two paths already produce.
//  2. CALL-THE-QUESTION ELIGIBILITY: notifies a thread's active
//     participants the first time it crosses BOTH floors (migration 094)
//     that make calling-the-question available at all -- min active
//     participants and min hours open. Computing "did this just become
//     true" from two paths that vary in real time (elapsed hours) and on
//     writes (new arguments/votes) needs a periodic check somewhere; this
//     job is that somewhere, rather than scattering the check across every
//     write path that could move either number. ctq_eligible_notified_at
//     makes each thread eligible for at most one such notification.
//
// Idempotent by construction: a closed thread never matches either query
// again, and ctq_eligible_notified_at gates the second job. Safe to run as
// often as wanted -- see close-and-notify-threads.timer for the chosen
// cadence and why.
//
// Triggered by a systemd --user timer (this file + .service + .timer),
// same mechanism roster-refresh.sh already uses (systemctl --user,
// DEPLOY.md), not cron.
//
// One-time setup on the VPS, as the voteright user (mirrors roster-
// refresh.sh's own runbook):
//   1. Confirm DATABASE_URL and RESEND_API_KEY (and optionally
//      RESEND_FROM_EMAIL) are all set in app/.env.production -- this
//      script sources them directly since it's a separate process from
//      the running Next.js app and a systemd --user service does not
//      inherit an interactive shell's exported env vars.
//   2. mkdir -p ~/.config/systemd/user && cp db/close-and-notify-threads.service db/close-and-notify-threads.timer ~/.config/systemd/user/
//   3. export XDG_RUNTIME_DIR=/run/user/$(id -u)
//   4. systemctl --user daemon-reload
//   5. systemctl --user enable --now close-and-notify-threads.timer
//   6. Verify: systemctl --user list-timers close-and-notify-threads.timer
//
// To run it once immediately: systemctl --user start close-and-notify-threads.service
// Then check output: journalctl --user -u close-and-notify-threads.service
//
// Usage: node db/close-and-notify-threads.mjs [--url=<postgres url>]

import { createRequire } from "node:module";

const require = createRequire(new URL("../app/package.json", import.meta.url));
const { Client } = require("pg");

const args = process.argv.slice(2);

// Same env-file fallback chain roster-refresh.sh's read_env_var already
// established for standalone scripts (Next loads app/.env.production
// itself; this separate process doesn't get that for free) -- needed for
// BOTH DATABASE_URL and RESEND_API_KEY, since a systemd --user service
// does not inherit an interactive shell's exported env vars either. Without
// this, DATABASE_URL falls through to the hardcoded local-dev default
// below even in production, which is the wrong database entirely, not
// just a missing feature.
if (!process.env.DATABASE_URL || !process.env.RESEND_API_KEY) {
  const { readFileSync, existsSync } = await import("node:fs");
  for (const f of ["app/.env.production", "app/.env.local"]) {
    if (!existsSync(f)) continue;
    const contents = readFileSync(f, "utf8");
    if (!process.env.DATABASE_URL) {
      const m = contents.match(/^DATABASE_URL=(.*)$/m);
      if (m) process.env.DATABASE_URL = m[1].replace(/^["']|["']$/g, "");
    }
    if (!process.env.RESEND_API_KEY) {
      const m = contents.match(/^RESEND_API_KEY=(.*)$/m);
      if (m) process.env.RESEND_API_KEY = m[1].replace(/^["']|["']$/g, "");
    }
  }
}

const url = args.find((a) => a.startsWith("--url="))?.slice(6) ?? process.env.DATABASE_URL ?? "postgres://postgres:vr@localhost:5433/voteright";

const client = new Client({ connectionString: url });
await client.connect();

/* ── notification helpers (mirrors app/src/lib/notifications.ts's own
   sendPush/sendEmail -- duplicated rather than imported, same reasoning
   every other db/ingest/*.mjs script already has for not importing from
   app/src: this is a plain Node script outside Next's TS/module setup,
   not a place to add a TypeScript build step just to share two small HTTP
   calls) ── */

async function activeParticipantIds(threadId) {
  const { rows } = await client.query(
    `WITH active AS (
       SELECT user_id FROM arguments WHERE thread_id = $1 AND moderation_status = 'approved'
       UNION
       SELECT v.user_id FROM argument_agreement_votes v JOIN arguments a ON a.id = v.argument_id
        WHERE a.thread_id = $1
        GROUP BY v.user_id
       HAVING count(*) >= (SELECT call_the_question_min_agreement_votes FROM forum_threads WHERE id = $1)
     )
     SELECT user_id FROM active`,
    [threadId],
  );
  return rows.map((r) => r.user_id);
}

async function notifyUsers(userIds, type, { proposalId, threadId, detail } = {}) {
  const unique = [...new Set(userIds)];
  for (const userId of unique) {
    try {
      await client.query(
        `INSERT INTO notifications (user_id, type, proposal_id, thread_id, detail) VALUES ($1, $2, $3, $4, $5)`,
        [userId, type, proposalId ?? null, threadId ?? null, detail ?? null],
      );
    } catch (e) {
      console.error(`notification write failed for ${userId}: ${e.message}`);
      continue;
    }
    await Promise.all([sendPush(userId, type, proposalId), sendEmail(userId, type, proposalId)]);
  }
}

function copyFor(type, proposalTitle) {
  const title = proposalTitle ?? "A debate you're part of";
  if (type === "thread_closed") return { title: "Debate closed", body: `"${title}" has closed and is moving toward a referendum.` };
  return { title: "Debate can now be called to a close", body: `"${title}" has enough participants and has been open long enough for any active participant to vote to end debate early.` };
}

async function proposalTitleFor(proposalId) {
  if (!proposalId) return null;
  const { rows } = await client.query(`SELECT title FROM issue_proposals WHERE id = $1`, [proposalId]);
  return rows[0]?.title ?? null;
}

async function sendPush(userId, type, proposalId) {
  try {
    const { rows } = await client.query(`SELECT token FROM push_tokens WHERE user_id = $1`, [userId]);
    if (rows.length === 0) return;
    const { title, body } = copyFor(type, await proposalTitleFor(proposalId));
    const messages = rows.map((r) => ({ to: r.token, title, body, sound: "default" }));
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(messages),
    });
  } catch (e) {
    console.error(`push send failed for ${userId}: ${e.message}`);
  }
}

async function sendEmail(userId, type, proposalId) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const { rows } = await client.query(
      `SELECT notification_email FROM users WHERE id = $1 AND notification_email_verified_at IS NOT NULL`,
      [userId],
    );
    const to = rows[0]?.notification_email;
    if (!to) return;
    const { title, body } = copyFor(type, await proposalTitleFor(proposalId));
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL ?? "VoteRight <notifications@voteright.dpimatrix.com>",
        to,
        subject: title,
        text: `${body}\n\nManage notification preferences: ${process.env.SITE_URL ?? "https://voteright.dpimatrix.com"}/notifications`,
      }),
    });
  } catch (e) {
    console.error(`notification email send failed for ${userId}: ${e.message}`);
  }
}

let closedCount = 0;
let eligibleCount = 0;
let runStatus = "succeeded";
let runNote = null;

try {
  /* ── job 1: natural expiry ── */
  const { rows: expired } = await client.query(
    `SELECT id, proposal_id FROM forum_threads WHERE status = 'open' AND closes_at <= now()`,
  );
  for (const t of expired) {
    const activeIds = await activeParticipantIds(t.id);
    await client.query(`BEGIN`);
    try {
      // closed_early stays FALSE here -- this is the thread's OWN natural
      // date, not an early close by any definition either other path uses.
      await client.query(`UPDATE forum_threads SET status = 'closed' WHERE id = $1`, [t.id]);
      await client.query(`UPDATE issue_proposals SET status = 'referendum' WHERE id = $1`, [t.proposal_id]);
      await client.query(`COMMIT`);
    } catch (e) {
      await client.query(`ROLLBACK`);
      console.error(`failed to close thread ${t.id}: ${e.message}`);
      continue;
    }
    await notifyUsers(activeIds, "thread_closed", { proposalId: t.proposal_id, threadId: t.id });
    closedCount++;
  }

  /* ── job 2: call-the-question eligibility ── */
  const { rows: open } = await client.query(
    `SELECT id, proposal_id, opened_at, call_the_question_min_active AS min_active,
            call_the_question_min_open_hours AS min_hours
       FROM forum_threads
      WHERE status = 'open' AND ctq_eligible_notified_at IS NULL`,
  );
  for (const t of open) {
    const hoursOpen = (Date.now() - new Date(t.opened_at).getTime()) / 3600_000;
    if (hoursOpen < t.min_hours) continue;
    const activeIds = await activeParticipantIds(t.id);
    if (activeIds.length < t.min_active) continue;
    await client.query(`UPDATE forum_threads SET ctq_eligible_notified_at = now() WHERE id = $1`, [t.id]);
    await notifyUsers(activeIds, "ctq_eligible", { proposalId: t.proposal_id, threadId: t.id });
    eligibleCount++;
  }

  runNote = `closed ${closedCount} expired thread(s), notified ${eligibleCount} newly-CTQ-eligible thread(s)`;
  console.log(`close-and-notify-threads: ${runNote}`);
} catch (e) {
  runStatus = "failed";
  runNote = `unexpected error: ${e.message}`;
  console.error(`close-and-notify-threads failed: ${e.message}`);
}

// Admin observability (2026-08-29, found live -- this job previously had
// none at all): logs to the same ingestion_runs ledger the data-feed
// ingesters and checkpoint-and-publish.sh already use, so a silently
// broken timer (the DATABASE_URL bug this exact deploy already hit once,
// a revoked RESEND_API_KEY, the systemd timer itself getting disabled)
// shows up in the admin freshness panel instead of only being visible via
// journalctl on the VPS directly. data_through is deliberately just
// TODAY's UTC date, not a real timestamp -- the column is DATE-typed (day
// granularity), which can't distinguish "ran 5 minutes ago" from "ran 14
// hours ago." That's coarser than this job's actual 15-minute cadence,
// but it still catches the failure mode that matters most -- a
// misconfiguration that fails EVERY run -- within at most a few days via
// the same cadence-based staleness multiplier queries.ts already applies
// to checkpoint-publish for the identical reason.
try {
  await client.query(
    `INSERT INTO ingestion_runs (source, finished_at, status, rows_upserted, data_through, note)
     VALUES ('close-and-notify-threads', now(), $1, $2, (now() AT TIME ZONE 'utc')::date, $3)`,
    [runStatus, closedCount + eligibleCount, runNote],
  );
} catch (e) {
  console.error(`close-and-notify-threads: failed to log run outcome: ${e.message}`);
}

await client.end();
if (runStatus === "failed") process.exitCode = 1;
