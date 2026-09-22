#!/usr/bin/env node
// U.S. House roll-call votes (docs/DATA-OPS.md D2, extended nationwide).
//
// Real gap found live 2026-09-22: db/ingest/votes.mjs (D2) only ever
// ingested Montgomery County Council's own votes -- nobody had built an
// equivalent for Congress, so despite the nationwide roster existing since
// D6, every federal politician had zero rows in voting_records and could
// therefore never be staff-coded onto a scoring axis (politician_positions
// is downstream of this table, via app/src/lib/positions.ts /
// db/suggest-codings.mjs). This closes that gap for the U.S. House.
//
// SCOPE OF THIS FIRST PASS, DELIBERATELY NARROW (same discipline as
// congress.mjs's own header):
//  - House only. Verified live against the real API (not assumed): a
//    `senate-vote` resource does not exist on api.congress.gov ("Unknown
//    resource: senate-vote") -- Senate roll calls live only in senate.gov's
//    own XML feed, a genuinely different source/parser, not a filter
//    change on this endpoint. Deferred, not silently dropped -- a real
//    follow-up, not a bug in this script.
//  - Raw votes only, same as votes.mjs. This does NOT create scored
//    positions -- staff/model coding onto topic axes is a separate,
//    deliberate step (SCORING.md/CODING-STANDARDS.md), same sequencing
//    this project already used for Montgomery (D2 raw votes landed weeks
//    before the vote-to-position tool was ever pointed at them).
//
// Source: https://api.congress.gov/v3/house-vote/{congress} (list) and
// .../{congress}/{session}/{rollCall}/members (per-member results,
// bioguideID-keyed -- a clean, unambiguous match key against
// politicians.bioguide_id, unlike votes.mjs's fragile last-name matching,
// which only exists because Montgomery's own dataset has no stable id at
// all). Requires CONGRESS_API_KEY (same key congress.mjs already uses).
//
// Idempotent by construction: voting_records has UNIQUE(politician_id,
// bill_external_id) -- bill_external_id here is the roll call's own
// identifier (e.g. "roll-119-1-240"), one row per member per roll call.
// Incremental: fetches roll calls with fromDateTime >= (max ingested -
// 3-day overlap; roll calls close same-day, unlike bills which can sit
// open for weeks, so this needs a much smaller overlap than votes.mjs's
// 30-day one). jurisdiction_id is the single country-level row
// ('ocd-division/country:us', migration 059) -- the House is one national
// body, not scoped to any member's individual state, matching how
// voting_records.jurisdiction_id means "whichever legislative body cast
// this vote" everywhere else in this project.
//
// Usage: node db/ingest/congress-votes.mjs [--full] [--congress=119] [--url=<postgres url>]
import { createRequire } from "node:module";
const require = createRequire(new URL("../../app/package.json", import.meta.url));
const { Client } = require("pg");

const SOURCE = "congress-house-votes";
const JURISDICTION = "ocd-division/country:us";

const args = process.argv.slice(2);
const full = args.includes("--full");
const congress = args.find((a) => a.startsWith("--congress="))?.slice(11) ?? "119";
const url = args.find((a) => a.startsWith("--url="))?.slice(6) ?? process.env.DATABASE_URL ?? "postgres://postgres:vr@localhost:5433/voteright";

const API_KEY = process.env.CONGRESS_API_KEY;
if (!API_KEY) {
  console.error("CONGRESS_API_KEY is not set (app/.env.local or the environment) -- aborting, never guessing.");
  process.exit(1);
}

// Same shape as openstates-legislature.mjs's own fetchWithRetry -- retries
// on 429 specifically (a real, hit-live rate limit class for these
// government APIs under sustained load), everything else fails fast.
async function fetchWithRetry(u, attempts = 5) {
  for (let i = 1; i <= attempts; i += 1) {
    try {
      const res = await fetch(u, { signal: AbortSignal.timeout(30000) });
      if (res.status === 429) throw Object.assign(new Error("429"), { rateLimited: true });
      if (!res.ok) throw new Error(`${res.status}`);
      return res;
    } catch (e) {
      if (i === attempts) throw e;
      const wait = e.rateLimited ? 10000 * i : 1500 * i;
      console.error(`  (retry ${i}/${attempts - 1} after ${e.message} -- waiting ${wait}ms)`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

// House Clerk's own vocabulary, confirmed live against real roll calls
// (Yea/Nay/Not Voting seen directly; Present is documented Clerk usage for
// quorum-only, no-position votes, not yet observed in a live sample but
// handled rather than assumed absent). Anything else is a genuinely new
// value this script has never seen -- skipped and counted, never guessed,
// same discipline as votes.mjs's unmapped-name handling.
const VOTE_MAP = { Yea: "yea", Nay: "nay", Present: "abstain", "Not Voting": "absent" };

const client = new Client({ connectionString: url });
await client.connect();
const run = await client.query(`INSERT INTO ingestion_runs (source) VALUES ($1) RETURNING id`, [SOURCE]);
const runId = run.rows[0].id;

try {
  // bioguide_id -> politicians.id, scoped to current House members only
  // (mirrors votes.mjs's own office-scoped roster, adapted: bioguide_id is
  // a stable global id, so no jurisdiction-collision risk the way raw last
  // names have -- no ambiguity guard needed here).
  const pols = await client.query(
    `SELECT bioguide_id, id FROM politicians WHERE bioguide_id IS NOT NULL`,
  );
  const byBioguide = new Map(pols.rows.map((p) => [p.bioguide_id, p.id]));

  let since = null;
  if (!full) {
    const { rows } = await client.query(
      `SELECT (max(voted_at) - interval '3 days')::date::text AS since
         FROM voting_records WHERE jurisdiction_id = $1 AND bill_external_id LIKE 'roll-%'`,
      [JURISDICTION],
    );
    since = rows[0]?.since ?? null;
  }

  // List every roll call in range first (cheap, one call per 250), THEN
  // fetch each one's member-level detail (one call per roll call) -- same
  // two-phase shape as house-vote's own list/detail split, avoids
  // re-fetching the full member list for roll calls already ingested.
  const rollCalls = [];
  for (let offset = 0; ; offset += 250) {
    const u = new URL(`https://api.congress.gov/v3/house-vote/${congress}`);
    u.searchParams.set("format", "json");
    u.searchParams.set("limit", "250");
    u.searchParams.set("offset", String(offset));
    u.searchParams.set("api_key", API_KEY);
    if (since) u.searchParams.set("fromDateTime", `${since}T00:00:00Z`);
    const res = await fetchWithRetry(u);
    const body = await res.json();
    const batch = body.houseRollCallVotes ?? [];
    rollCalls.push(...batch);
    if (batch.length < 250) break;
  }

  let upserted = 0;
  let skippedRollCalls = 0;
  const skippedBioguides = new Set();
  const skippedVoteCasts = new Set();
  let dataThrough = null;

  for (const rc of rollCalls) {
    // Legislation-less roll calls exist (e.g. procedural motions, electing
    // a Speaker) -- no bill to attach the citation to, so skipped rather
    // than inventing a fake bill_external_id. Real, expected, not an error.
    if (!rc.legislationNumber || !rc.legislationType) {
      skippedRollCalls += 1;
      continue;
    }
    const votedAt = rc.startDate.slice(0, 10);
    if (!dataThrough || votedAt > dataThrough) dataThrough = votedAt;
    const rollId = `roll-${rc.congress}-${rc.sessionNumber}-${rc.rollCallNumber}`;
    const title = `${rc.legislationType} ${rc.legislationNumber}`.slice(0, 500);
    const sourceUrl = rc.legislationUrl ?? rc.sourceDataURL;

    const u = new URL(`https://api.congress.gov/v3/house-vote/${rc.congress}/${rc.sessionNumber}/${rc.rollCallNumber}/members`);
    u.searchParams.set("format", "json");
    u.searchParams.set("limit", "450"); // whole House fits in one page (435 seats + margin)
    u.searchParams.set("api_key", API_KEY);
    const res = await fetchWithRetry(u);
    const body = await res.json();
    const members = body.houseRollCallVoteMemberVotes?.results ?? [];

    for (const m of members) {
      const polId = byBioguide.get(m.bioguideID);
      if (!polId) {
        skippedBioguides.add(m.bioguideID);
        continue;
      }
      const vote = VOTE_MAP[m.voteCast];
      if (!vote) {
        skippedVoteCasts.add(m.voteCast);
        continue;
      }
      const ins = await client.query(
        `INSERT INTO voting_records (politician_id, jurisdiction_id, bill_external_id, bill_title, vote, voted_at, source_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (politician_id, bill_external_id) DO NOTHING`,
        [polId, JURISDICTION, rollId, title, vote, votedAt, sourceUrl],
      );
      upserted += ins.rowCount ?? 0;
    }
  }

  const notes = [];
  if (skippedRollCalls) notes.push(`${skippedRollCalls} roll call(s) with no attached legislation, skipped`);
  if (skippedBioguides.size) notes.push(`${skippedBioguides.size} unmapped bioguideID(s) (not in current roster): ${[...skippedBioguides].sort().slice(0, 20).join(", ")}${skippedBioguides.size > 20 ? "…" : ""}`);
  if (skippedVoteCasts.size) notes.push(`unrecognized voteCast value(s), skipped: ${[...skippedVoteCasts].join(", ")}`);

  await client.query(
    `UPDATE ingestion_runs SET finished_at = now(), status = 'succeeded',
            rows_upserted = $2, rows_skipped = $3, data_through = $4, note = $5
      WHERE id = $1`,
    [runId, upserted, skippedBioguides.size + skippedVoteCasts.size, dataThrough, notes.join("; ") || null],
  );
  console.log(`${SOURCE}: ${rollCalls.length} roll call(s) checked, upserted ${upserted} vote(s), data through ${dataThrough ?? "n/a"}`);
  if (notes.length) console.log(`  notes: ${notes.join("; ")}`);
} catch (e) {
  await client.query(`UPDATE ingestion_runs SET finished_at = now(), status = 'failed', note = $2 WHERE id = $1`, [runId, String(e.message ?? e)]);
  console.error(`${SOURCE} FAILED: ${e.message ?? e}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
