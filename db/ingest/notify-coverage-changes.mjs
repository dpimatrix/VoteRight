#!/usr/bin/env node
// Coverage + mandate-publish admin alert watchdog (2026-09-03, owner
// request, migration 097). Closes a real "who's supposed to know?" gap
// found live-testing: a Pending seat flipping to Tracked (a `races` row
// appearing for the current cycle) previously required a staff member to
// remember to open /admin/race-coverage and notice -- nothing ever told
// anyone. Deliberately a SEPARATE watchdog script rather than modifying
// every individual ingester (congress.mjs, openstates-legislature.mjs,
// statewide-official-photos.mjs, or a future SBE candidate-field
// ingester) -- races can be created by any of them, by a future one not
// written yet, or by a one-off manual insert, and this works regardless
// of which. (The other half of this gap, a mandate crossing its publish
// threshold, is event-driven instead and lives inline in
// referenda.ts's certifyReferendum -- that transition only ever happens
// at one specific admin action, so there's a real call site to hook,
// unlike race creation.)
//
// Watermark-based, not a fixed lookback window: coverage_notification_state
// (migration 097) holds the single "last time we checked" timestamp, and
// this only ever reports races.created_at rows newer than that -- so a
// race created by ANY process, at ANY time, gets exactly one alert, never
// zero and never a repeat. races.created_at itself was also added in
// migration 097 (didn't exist before); its DEFAULT now() at migration
// time lines up with the watermark row's own DEFAULT now() in the same
// migration, so the very first run of this script doesn't flood admins
// with every already-tracked seat as if it were new.
//
// Usage: node db/ingest/notify-coverage-changes.mjs [--url=<postgres url>]
// Scheduled via notify-coverage-changes.timer (daily) -- see that file.

import { createRequire } from "node:module";
const require = createRequire(new URL("../../app/package.json", import.meta.url));
const { Client } = require("pg");
const { Resend } = require("resend");

const SOURCE = "coverage-notification-watchdog";
const args = process.argv.slice(2);
const url = args.find((a) => a.startsWith("--url="))?.slice(6) ?? process.env.DATABASE_URL ?? "postgres://postgres:vr@localhost:5433/voteright";

const client = new Client({ connectionString: url });
await client.connect();
const run = await client.query(`INSERT INTO ingestion_runs (source) VALUES ($1) RETURNING id`, [SOURCE]);
const runId = run.rows[0].id;

try {
  const state = await client.query(`SELECT last_notified_at FROM coverage_notification_state WHERE id = 1`);
  const since = state.rows[0].last_notified_at;
  const checkedAt = new Date();

  const newlyTracked = await client.query(
    `SELECT o.title, j.name AS jurisdiction_name
       FROM races r
       JOIN offices o ON o.id = r.office_id
       JOIN jurisdictions j ON j.ocd_id = o.jurisdiction_id
      WHERE r.created_at > $1
      ORDER BY j.name, o.title`,
    [since],
  );

  if (newlyTracked.rows.length > 0) {
    // Same admin_accounts + admin_screen_access join app/src/lib/adminNotify.ts
    // uses -- duplicated here rather than imported, since this standalone
    // script has no access to the Next.js app's module graph (same reason
    // every other ingester talks to Postgres directly instead of importing
    // app/src/lib/*). Kept deliberately simple: no HTML, no unsubscribe
    // link -- this is an internal operational alert to staff who explicitly
    // opted in by setting an email in /admin/admin-accounts, not a
    // user-facing notification.
    const recipients = await client.query(
      `SELECT DISTINCT a.email
         FROM admin_accounts a JOIN admin_screen_access s ON s.admin_id = a.id
        WHERE s.screen_key = 'race_coverage' AND a.disabled_at IS NULL AND a.email IS NOT NULL`,
    );
    if (recipients.rows.length > 0 && process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const list = newlyTracked.rows.map((r) => `- ${r.title} (${r.jurisdiction_name})`).join("\n");
      const siteUrl = process.env.SITE_URL ?? "https://voteright.dpimatrix.com";
      const body = `${newlyTracked.rows.length} seat(s) moved from Pending to Tracked since the last check:\n\n${list}\n\nReview: ${siteUrl}/admin/race-coverage`;
      await Promise.all(
        recipients.rows.map(async (r) => {
          // Same Resend gap notifications.ts/adminNotify.ts both document:
          // the SDK resolves with { error } on a rejected send rather than
          // throwing -- must inspect it explicitly.
          const { error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL ?? "VoteRight <notifications@voteright.dpimatrix.com>",
            to: r.email,
            subject: `${newlyTracked.rows.length} seat(s) now Tracked`,
            text: body,
          });
          if (error) console.error(`coverage alert email failed for ${r.email}: ${error.name} -- ${error.message}`);
        }),
      );
    } else if (recipients.rows.length === 0) {
      console.log("newly-tracked seats found, but no admin with race_coverage access has an alert email set -- nobody notified.");
    }
  }

  await client.query(`UPDATE coverage_notification_state SET last_notified_at = $1 WHERE id = 1`, [checkedAt]);
  await client.query(
    `UPDATE ingestion_runs SET finished_at = now(), status = 'succeeded', rows_upserted = $2, rows_skipped = 0
      WHERE id = $1`,
    [runId, newlyTracked.rows.length],
  );
  console.log(`${SOURCE}: ${newlyTracked.rows.length} newly-tracked seat(s) since ${since.toISOString()}`);
} catch (e) {
  await client.query(`UPDATE ingestion_runs SET finished_at = now(), status = 'failed', note = $2 WHERE id = $1`, [runId, String(e.message ?? e)]);
  console.error(`${SOURCE} FAILED: ${e.message ?? e}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
