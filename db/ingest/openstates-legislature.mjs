#!/usr/bin/env node
// D6 ingester: state legislature rosters (Senate + House/Assembly/Delegates)
// via the OpenStates v3 API (docs/DATA-OPS.md's long-standing "later" item,
// now arriving per the owner's federal-then-state redirect, 2026-08-11).
// Same shape as db/ingest/congress.mjs: builds state-level offices under
// each state's jurisdiction row (migration 059) and populates
// politicians + office_terms for every CURRENT member.
//
// Source: https://v3.openstates.org/people?jurisdiction={state}&org_classification={upper|lower|legislature}
// (paginated). Requires OPENSTATES_API_KEY (free key,
// https://openstates.org/api/register/).
//
// SCOPE OF THIS FIRST PASS, DELIBERATELY NARROW -- read before adding a
// state to STATE_TERM_INFO below:
//
//  - office titles and chamber structure come straight from the API's own
//    current_role.title ("Senator", "Delegate", "Assemblymember", ...) --
//    verified live to match each state's real terminology and to match
//    NCSL's published seat counts exactly (MD 47/141, VA 40/100, CA 40/80,
//    NJ 40/80 -- cross-checked before writing this script). Nebraska's
//    unicameral chamber reports org_classification 'legislature', not
//    'upper'/'lower' -- handled as its own case, not folded into either.
//
//  - multi-member districts (Maryland's House of Delegates has both shared
//    plain-numbered districts like "22" with 2-3 delegates AND split
//    sub-districts like "34A"/"34B" with one each) are modeled as ONE
//    office per literal district string with seat_count = however many
//    people share it in this run -- the same multi-seat-pool pattern the
//    schema already uses for at-large offices, not a new mechanism.
//    Requires two passes per state+chamber (collect all people, THEN
//    create offices with the right seat_count, THEN insert) since the
//    count isn't known until every page is in hand.
//
//  - term_start is the ONE genuinely hard part: unlike Congress.gov, the
//    OpenStates /people endpoint gives NO term-start or election-date
//    field at all (confirmed against the live OpenAPI spec -- Person has
//    no such property, and there's no per-person detail endpoint to check
//    further). A term_start has to come from SOMEWHERE (the column is
//    NOT NULL and load-bearing for the office_terms UNIQUE constraint),
//    so this script computes it as Jan 1 of (this chamber's most recent
//    real election year, in THIS state, + 1) -- but that anchor year is
//    state- and chamber-specific (whole-chamber-together vs staggered,
//    and WHICH even/odd year a 4-year cycle happens to sit on) in a way
//    that is not safely guessable from a general rule. Rather than
//    silently fabricate an anchor for a state nobody has checked, this
//    script REFUSES to touch a state that isn't in STATE_TERM_INFO below
//    -- same discipline as the missing-API-key check just below. Only
//    Maryland and Virginia are populated so far, each hand-verified this
//    session (MD: Senate+House both elected together every 4 years with
//    the Governor, last 2022, https://ballotpedia.org/Maryland_General_Assembly
//    and this project's own prior D1 roster work; VA: House of Delegates
//    2-year terms last elected Nov 2025, Senate 4-year terms last elected
//    Nov 2023 -- confirmed via Ballotpedia/Wikipedia search this session,
//    not remembered from training data). Adding another state means
//    verifying its real election-cycle anchor first, not copying a
//    neighbor's row.
//
//  - Idempotent by construction, same anchor pattern as bioguide_id:
//    politicians.openstates_id (UNIQUE since migration 062) is the
//    identity anchor. A known legislator reuses their existing office_id
//    directly; a new one goes through find-or-create. office_terms rows
//    are additionally guarded by UNIQUE(office_id, politician_id,
//    term_start) via ON CONFLICT DO NOTHING.
//
// Usage: node db/ingest/openstates-legislature.mjs --states=md,va [--url=<postgres url>]
// No default state list -- unlike congress.mjs, this deliberately will NOT
// run against "all configured states" implicitly, so adding one state to
// STATE_TERM_INFO can't accidentally widen a --states=md run.

import { createRequire } from "node:module";
const require = createRequire(new URL("../../app/package.json", import.meta.url));
const { Client } = require("pg");

const SOURCE = "openstates-legislature-roster";
const API_KEY = process.env.OPENSTATES_API_KEY;
if (!API_KEY) {
  console.error("OPENSTATES_API_KEY is not set (app/.env.local or the environment) -- aborting, never guessing.");
  process.exit(1);
}

const args = process.argv.slice(2);
const stateFilter = args.find((a) => a.startsWith("--states="))?.slice(9)?.split(",").map((s) => s.trim().toLowerCase());
const url = args.find((a) => a.startsWith("--url="))?.slice(6) ?? process.env.DATABASE_URL ?? "postgres://postgres:vr@localhost:5433/voteright";

if (!stateFilter || !stateFilter.length) {
  console.error("Usage: node db/ingest/openstates-legislature.mjs --states=md,va -- no implicit 'all states' default (see header note).");
  process.exit(1);
}

// slug -> { openstatesName, chambers: { upper?: {termYears, lastElectionYear}, lower?: {...}, legislature?: {...} } }
// legislature = unicameral (Nebraska only among current US states). Every
// entry here has been individually verified this session -- see header.
const STATE_TERM_INFO = {
  md: {
    openstatesName: "Maryland",
    chambers: {
      upper: { termYears: 4, lastElectionYear: 2022 },
      lower: { termYears: 4, lastElectionYear: 2022 },
    },
  },
  va: {
    openstatesName: "Virginia",
    chambers: {
      upper: { termYears: 4, lastElectionYear: 2023 },
      lower: { termYears: 2, lastElectionYear: 2025 },
    },
  },
};

const partyCode = (partyName) => (partyName === "Democratic" ? "D" : partyName === "Republican" ? "R" : partyName === "Independent" ? "I" : null);

const client = new Client({ connectionString: url });
await client.connect();
const run = await client.query(`INSERT INTO ingestion_runs (source) VALUES ($1) RETURNING id`, [SOURCE]);
const runId = run.rows[0].id;

// Observed live this session: OpenStates' free tier is noticeably slow and
// occasionally times out under back-to-back requests (no rate-limit
// headers returned, single calls took 3-10s each) -- a small retry with
// backoff, not a code bug workaround, so a transient slow response doesn't
// fail an otherwise-idempotent run.
async function fetchWithRetry(u, attempts = 3) {
  for (let i = 1; i <= attempts; i += 1) {
    try {
      const res = await fetch(u, { headers: { "X-API-KEY": API_KEY }, signal: AbortSignal.timeout(60000) });
      if (!res.ok) throw new Error(`${res.status}`);
      return res;
    } catch (e) {
      if (i === attempts) throw e;
      await new Promise((r) => setTimeout(r, 2000 * i));
    }
  }
}

async function fetchAllPeople(openstatesName, orgClassification) {
  const results = [];
  for (let page = 1; ; page += 1) {
    const u = new URL("https://v3.openstates.org/people");
    u.searchParams.set("jurisdiction", openstatesName);
    u.searchParams.set("org_classification", orgClassification);
    u.searchParams.set("per_page", "50");
    u.searchParams.set("page", String(page));
    const res = await fetchWithRetry(u);
    const body = await res.json();
    results.push(...(body.results ?? []));
    if (page >= (body.pagination?.max_page ?? 1)) break;
  }
  return results;
}

try {
  let processed = 0;
  let dataThrough = null;

  for (const slug of stateFilter) {
    const info = STATE_TERM_INFO[slug];
    if (!info) {
      console.error(`  skipping '${slug}': no verified STATE_TERM_INFO entry -- add one (with a real cited source for the election-cycle anchor) before running this state.`);
      continue;
    }
    const stateOcdId = `ocd-division/country:us/state:${slug}`;

    for (const [orgClassification, cycle] of Object.entries(info.chambers)) {
      const people = await fetchAllPeople(info.openstatesName, orgClassification);

      // Pass 1: tally how many people share each literal district string,
      // so multi-member districts (e.g. Maryland's plain-numbered "22")
      // get the right seat_count from the moment the office is created.
      const districtCounts = new Map();
      for (const p of people) {
        const d = p.current_role?.district ?? null;
        districtCounts.set(d, (districtCounts.get(d) ?? 0) + 1);
      }

      const termStart = `${cycle.lastElectionYear + 1}-01-01`;
      if (!dataThrough || cycle.lastElectionYear > (dataThrough ?? 0)) dataThrough = cycle.lastElectionYear;

      // Pass 2: find-or-create one office per (chamber title, district),
      // then upsert each politician onto it.
      const officeCache = new Map(); // `${title}::${district}` -> office id
      for (const p of people) {
        const role = p.current_role;
        if (!role) continue; // no current role -- shouldn't happen for a roster query, never guess a seat
        const chamberTitle = `State ${role.title}`;
        const district = role.district ?? null;
        const title = district ? `${chamberTitle} — District ${district}` : `${chamberTitle} — At-Large`;
        const officeKey = `${title}`;

        let officeId = officeCache.get(officeKey);
        if (!officeId) {
          const existing = await client.query(`SELECT id FROM offices WHERE jurisdiction_id = $1 AND title = $2`, [stateOcdId, title]);
          if (existing.rowCount) {
            officeId = existing.rows[0].id;
          } else {
            const seatCount = districtCounts.get(district) ?? 1;
            const ins = await client.query(
              `INSERT INTO offices (jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level)
               VALUES ($1, $2, $3, $4, $5, TRUE, TRUE, 'state') RETURNING id`,
              [stateOcdId, title, district ? "district" : "at_large", seatCount, cycle.termYears],
            );
            officeId = ins.rows[0].id;
          }
          officeCache.set(officeKey, officeId);
        }

        const fullName = p.name;
        const party = partyCode(p.party);
        const bio = `${chamberTitle} for ${info.openstatesName}${district ? `, District ${district}` : ""}. Party per OpenStates: ${p.party ?? "unlisted"}. OpenStates id: ${p.id}.`;

        const existingPol = await client.query(`SELECT id FROM politicians WHERE openstates_id = $1`, [p.id]);
        let polId;
        if (existingPol.rowCount) {
          polId = existingPol.rows[0].id;
          await client.query(
            `UPDATE politicians SET full_name = $2, party = $3, current_office_id = $4, bio = $5 WHERE id = $1`,
            [polId, fullName, party, officeId, bio],
          );
        } else {
          const pol = await client.query(
            `INSERT INTO politicians (full_name, party, current_office_id, bio, openstates_id) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [fullName, party, officeId, bio, p.id],
          );
          polId = pol.rows[0].id;
        }

        const ins = await client.query(
          `INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained)
           VALUES ($1, $2, $3, 'elected')
           ON CONFLICT (office_id, politician_id, term_start) DO NOTHING`,
          [officeId, polId, termStart],
        );
        if (ins.rowCount) processed += 1;
      }
    }
  }

  await client.query(
    `UPDATE ingestion_runs SET finished_at = now(), status = 'succeeded',
            rows_upserted = $2, rows_skipped = $3, data_through = $4, note = $5
      WHERE id = $1`,
    [runId, processed, 0, dataThrough ? `${dataThrough}-01-01` : null,
      `states: ${stateFilter.join(", ")}. term_start is Jan 1 following each state/chamber's last verified election year -- an approximation, not an exact swearing-in date (see script header). States not in STATE_TERM_INFO were skipped, not guessed.`],
  );
  console.log(`${SOURCE}: processed ${processed} new office_terms row(s) across states: ${stateFilter.join(", ")}`);
} catch (e) {
  await client.query(`UPDATE ingestion_runs SET finished_at = now(), status = 'failed', note = $2 WHERE id = $1`, [runId, String(e.message ?? e)]);
  console.error(`${SOURCE} FAILED: ${e.message ?? e}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
