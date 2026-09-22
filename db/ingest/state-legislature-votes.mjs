#!/usr/bin/env node
// State legislature roll-call votes (docs/DATA-OPS.md Section 8's last real
// vote-coverage gap: Congress is done as of congress-votes.mjs +
// senate-votes.mjs, but all 50 state legislatures still have zero scored
// votes despite the roster existing since db/ingest/openstates-legislature.mjs).
//
// Source: OpenStates v3's /bills endpoint with ?include=votes -- the SAME
// API + the SAME identity anchor (politicians.openstates_id, an
// 'ocd-person/{uuid}' string) the roster ingester already established, so
// matching here is direct and unambiguous (no name-matching heuristics
// needed at all, unlike votes.mjs or senate-votes.mjs). Verified live
// before writing this: each vote's per-legislator entry carries a nested
// `voter.id` in the identical ocd-person/... format the roster's own
// `/people` endpoint returns.
//
// Real complication OpenStates has that Congress.gov doesn't: no universal
// per-state session-name convention (openstates-legislature.mjs's own
// STATE_TERM_INFO table exists because of this exact problem for rosters).
// Sidestepped here rather than solved: /bills accepts NO session filter and
// instead supports sort=updated_desc, returning each state's most recently
// active bills across every session -- exactly what an incremental
// ingester needs, with no per-state session mapping required.
//
// SCOPE OF THIS FIRST PASS, DELIBERATELY NARROW (same discipline as every
// other ingester's own first pass in this project): Maryland + Virginia
// only, matching the exact states openstates-legislature.mjs itself
// started with before widening to 48. A real state (MD) has 26,430 total
// historical bills in OpenStates alone -- scaling to all 50 states needs
// real per-state verification of data quality and rate-limit behavior
// under sustained load, not a blind --states=all run. Widening is a
// disclosed next step, not attempted here.
//
// Not every vote entry resolves to a matched person even within OpenStates
// itself -- some carry only a bare voter_name ("Speaker", or occasionally a
// real legislator's surname with no voter object at all, confirmed live)
// with no voter.id to match against. Skipped and counted, never guessed,
// same as every unmapped-identity case elsewhere in this project.
//
// Usage: node db/ingest/state-legislature-votes.mjs [--full] [--states=md,va] [--url=<postgres url>]
import { createRequire } from "node:module";
const require = createRequire(new URL("../../app/package.json", import.meta.url));
const { Client } = require("pg");

const SOURCE = "state-legislature-votes";

// slug -> { openstatesName, jurisdictionId } -- deliberately just the 2
// states this first pass covers, not the full 50-state table
// openstates-legislature.mjs maintains for roster term-length verification
// (a different concern from this script's).
const STATES = {
  md: { openstatesName: "Maryland", jurisdictionId: "ocd-division/country:us/state:md" },
  va: { openstatesName: "Virginia", jurisdictionId: "ocd-division/country:us/state:va" },
};

const args = process.argv.slice(2);
const full = args.includes("--full");
const stateSlugs = (args.find((a) => a.startsWith("--states="))?.slice(9) ?? "md,va").split(",");
const url = args.find((a) => a.startsWith("--url="))?.slice(6) ?? process.env.DATABASE_URL ?? "postgres://postgres:vr@localhost:5433/voteright";

const API_KEY = process.env.OPENSTATES_API_KEY;
if (!API_KEY) {
  console.error("OPENSTATES_API_KEY is not set (app/.env.local or the environment) -- aborting, never guessing.");
  process.exit(1);
}

// Same throttle+retry shape as openstates-legislature.mjs's own
// fetchWithRetry -- this project already hit real 429s against this exact
// API under sustained load once, hardening this the same way rather than
// re-learning it.
const MIN_INTERVAL_MS = 1100;
let lastCallAt = 0;
async function throttle() {
  const wait = MIN_INTERVAL_MS - (Date.now() - lastCallAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCallAt = Date.now();
}
async function fetchWithRetry(u, attempts = 6) {
  for (let i = 1; i <= attempts; i += 1) {
    try {
      await throttle();
      const res = await fetch(u, { headers: { "X-API-KEY": API_KEY }, signal: AbortSignal.timeout(30000) });
      if (res.status === 429) throw Object.assign(new Error("429"), { rateLimited: true });
      if (!res.ok) throw new Error(`${res.status}`);
      return await res.json();
    } catch (e) {
      if (i === attempts) throw e;
      const wait = e.rateLimited ? 15000 * i : 2000 * i;
      console.error(`  (retry ${i}/${attempts - 1} after ${e.message} -- waiting ${wait}ms)`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

// Observed live: yes/no/not voting/excused/absent -- no distinct
// present/abstain-shaped value has been seen from this API, unlike
// Congress's Present. Anything else genuinely new is skipped + counted.
const VOTE_MAP = { yes: "yea", no: "nay", "not voting": "absent", excused: "absent", absent: "absent" };

const client = new Client({ connectionString: url });
await client.connect();
const run = await client.query(`INSERT INTO ingestion_runs (source) VALUES ($1) RETURNING id`, [SOURCE]);
const runId = run.rows[0].id;

try {
  const pols = await client.query(`SELECT openstates_id, id FROM politicians WHERE openstates_id IS NOT NULL`);
  const byOpenstatesId = new Map(pols.rows.map((p) => [p.openstates_id, p.id]));

  let upserted = 0;
  let skippedBills = 0;
  let skippedVoters = 0;
  const skippedOptions = new Set();
  let dataThrough = null;
  const perStateStats = {};

  for (const slug of stateSlugs) {
    const state = STATES[slug];
    if (!state) {
      console.error(`unknown state slug "${slug}" -- not in STATES, refusing to guess a jurisdiction name. Skipped.`);
      continue;
    }
    let since = "1900-01-01";
    if (!full) {
      const { rows } = await client.query(
        `SELECT (max(voted_at) - interval '5 days')::date::text AS since
           FROM voting_records WHERE jurisdiction_id = $1 AND bill_external_id LIKE 'os-vote-%'`,
        [state.jurisdictionId],
      );
      since = rows[0]?.since ?? since;
    }

    let stateUpserted = 0;
    let page = 1;
    let stop = false;
    while (!stop) {
      const u = new URL("https://v3.openstates.org/bills");
      u.searchParams.set("jurisdiction", state.openstatesName);
      u.searchParams.set("sort", "updated_desc");
      u.searchParams.set("include", "votes");
      u.searchParams.set("per_page", "20");
      u.searchParams.set("page", String(page));
      const body = await fetchWithRetry(u);
      const bills = body.results ?? [];
      if (bills.length === 0) break;

      let sawAnyRecentVote = false;
      for (const bill of bills) {
        for (const voteEvent of bill.votes ?? []) {
          const votedAt = voteEvent.start_date;
          if (!votedAt) {
            skippedBills += 1;
            continue;
          }
          if (votedAt >= since) sawAnyRecentVote = true;
          if (votedAt < since) continue; // this specific vote event predates the cutoff; other votes on the same bill (or other bills on this page) might not
          if (!dataThrough || votedAt > dataThrough) dataThrough = votedAt;

          const rollId = `os-vote-${voteEvent.id}`;
          const title = `${bill.identifier}: ${bill.title}`.slice(0, 500);
          const sourceUrl = bill.openstates_url ?? `https://openstates.org/${slug}/bills/`;

          for (const vv of voteEvent.votes ?? []) {
            const openstatesId = vv.voter?.id;
            if (!openstatesId) {
              skippedVoters += 1;
              continue;
            }
            const polId = byOpenstatesId.get(openstatesId);
            if (!polId) {
              skippedVoters += 1;
              continue;
            }
            const vote = VOTE_MAP[vv.option];
            if (!vote) {
              skippedOptions.add(vv.option);
              continue;
            }
            const ins = await client.query(
              `INSERT INTO voting_records (politician_id, jurisdiction_id, bill_external_id, bill_title, vote, voted_at, source_url)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               ON CONFLICT (politician_id, bill_external_id) DO NOTHING`,
              [polId, state.jurisdictionId, rollId, title, vote, votedAt, sourceUrl],
            );
            const added = ins.rowCount ?? 0;
            upserted += added;
            stateUpserted += added;
          }
        }
      }
      // Bills are sorted by UPDATE time, not vote time, so a page can be
      // "all old votes" without yet being safe to stop on (a later page
      // could still hold something newer that was updated for an unrelated
      // reason). Stop once we've gone a full page with nothing at or after
      // the cutoff AND we're not on --full (which always walks to the end
      // of what per_page*page naturally exhausts via the empty-page check
      // above).
      if (!full && !sawAnyRecentVote && page > 1) stop = true;
      if (bills.length < 20) break;
      page += 1;
      if (full && page > 100) break; // hard ceiling even in --full mode -- 2,000 bills/state is already far more than one run should chew through unsupervised
    }
    perStateStats[slug] = stateUpserted;
  }

  const notes = [];
  if (skippedBills) notes.push(`${skippedBills} vote event(s) with no date, skipped`);
  if (skippedVoters) notes.push(`${skippedVoters} vote(s) with no resolvable politician (unmatched OpenStates person or role-only entry like "Speaker")`);
  if (skippedOptions.size) notes.push(`unrecognized option value(s), skipped: ${[...skippedOptions].join(", ")}`);
  notes.push(`by state: ${Object.entries(perStateStats).map(([s, n]) => `${s}=${n}`).join(", ")}`);

  await client.query(
    `UPDATE ingestion_runs SET finished_at = now(), status = 'succeeded',
            rows_upserted = $2, rows_skipped = $3, data_through = $4, note = $5
      WHERE id = $1`,
    [runId, upserted, skippedVoters, dataThrough, notes.join("; ")],
  );
  console.log(`${SOURCE}: upserted ${upserted} vote(s), data through ${dataThrough ?? "n/a"}`);
  console.log(`  ${notes.join("; ")}`);
} catch (e) {
  await client.query(`UPDATE ingestion_runs SET finished_at = now(), status = 'failed', note = $2 WHERE id = $1`, [runId, String(e.message ?? e)]);
  console.error(`${SOURCE} FAILED: ${e.message ?? e}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
