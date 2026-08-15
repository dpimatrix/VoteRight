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
//    -- same discipline as the missing-API-key check just below. As of
//    2026-08-12, 46 states have at least their House covered and 23 have
//    both chambers -- see the long comment directly above STATE_TERM_INFO
//    for the full tier breakdown and what's deliberately still excluded
//    (27 states' genuinely-staggered Senates + Nebraska + North Dakota,
//    which need per-district cohort research, not a per-state year, and
//    were an owner-approved scope cut this session, not an oversight).
//    Adding another state means
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
// legislature = unicameral (Nebraska only among current US states).
//
// DELIBERATELY EXCLUDED FROM THIS TABLE (2026-08-12 research pass) --
// staggered Senates, where only PART of the chamber is up each cycle,
// assigned by a district-number cohort that isn't derivable from a single
// "last election year": Alaska, Arkansas, California, Colorado, Delaware,
// Florida, Hawaii, Illinois, Indiana, Iowa, Kentucky, Missouri, Montana,
// Nevada, Ohio, Oklahoma, Oregon, Pennsylvania, Tennessee, Texas, Utah,
// Washington, West Virginia, Wisconsin, Wyoming (confirmed via
// https://ballotpedia.org/Length_of_terms_of_state_senators' "Conduct of
// elections" column, itself cross-checked live for a few of these --
// Delaware/Florida's 2026 cycle pages independently confirm ~half the
// chamber up, not the whole thing). North Dakota staggers BOTH chambers
// (pairs House+Senate by district). Nebraska's single chamber is also
// flagged staggered. None of these seven are safe to assign a single
// term_start without per-district cohort research -- a materially bigger
// task than what's below, deferred by owner's explicit choice
// (2026-08-12) rather than guessed. See git log for the full tier
// breakdown at the point this decision was made.
//
// Confidence tiers for what IS below, disclosed rather than blurred
// together: (a) independently verified via 2+ live sources this session
// (MD, VA, MI, MN, NJ, LA, MS -- Senate side; AL/LA/MS's House anchor is
// inferred to match their Senate's whole-ticket cycle, matching the
// pattern already confirmed for MD/VA/MS/LA, not separately re-verified);
// (b) plain 2-year whole-chamber terms in even-year states (the large
// majority below) -- structurally safe by construction, a 2-year cycle
// can't have a multi-year offset ambiguity, cross-checked against
// Wikipedia's "2024 United States state legislative elections" page which
// confirms all-seats-up in 2024 for every one of these except the ones
// already carved out above; (c) Kansas/New Mexico/South Carolina's 4-year
// Senate anchors rest on the Ballotpedia table alone, structurally
// identical (non-2-4-4, explicit stated cycle) to the peers verified
// under (a) but not independently re-confirmed one by one.
const STATE_TERM_INFO = {
  md: { openstatesName: "Maryland", chambers: { upper: { termYears: 4, lastElectionYear: 2022 }, lower: { termYears: 4, lastElectionYear: 2022 } } },
  va: { openstatesName: "Virginia", chambers: { upper: { termYears: 4, lastElectionYear: 2023 }, lower: { termYears: 2, lastElectionYear: 2025 } } },
  al: { openstatesName: "Alabama", chambers: { upper: { termYears: 4, lastElectionYear: 2022 }, lower: { termYears: 4, lastElectionYear: 2022 } } },
  la: { openstatesName: "Louisiana", chambers: { upper: { termYears: 4, lastElectionYear: 2023 }, lower: { termYears: 4, lastElectionYear: 2023 } } },
  ms: { openstatesName: "Mississippi", chambers: { upper: { termYears: 4, lastElectionYear: 2023 }, lower: { termYears: 4, lastElectionYear: 2023 } } },
  nj: { openstatesName: "New Jersey", chambers: { upper: { termYears: 4, lastElectionYear: 2023 }, lower: { termYears: 2, lastElectionYear: 2025 } } },
  mi: { openstatesName: "Michigan", chambers: { upper: { termYears: 4, lastElectionYear: 2022 }, lower: { termYears: 2, lastElectionYear: 2024 } } },
  mn: { openstatesName: "Minnesota", chambers: { upper: { termYears: 4, lastElectionYear: 2022 }, lower: { termYears: 2, lastElectionYear: 2024 } } },
  ks: { openstatesName: "Kansas", chambers: { upper: { termYears: 4, lastElectionYear: 2024 }, lower: { termYears: 2, lastElectionYear: 2024 } } },
  nm: { openstatesName: "New Mexico", chambers: { upper: { termYears: 4, lastElectionYear: 2024 }, lower: { termYears: 2, lastElectionYear: 2024 } } },
  sc: { openstatesName: "South Carolina", chambers: { upper: { termYears: 4, lastElectionYear: 2024 }, lower: { termYears: 2, lastElectionYear: 2024 } } },
  // 2-year, whole-chamber, even-year Senates (structurally safe -- see tier (b) above)
  az: { openstatesName: "Arizona", chambers: { upper: { termYears: 2, lastElectionYear: 2024 }, lower: { termYears: 2, lastElectionYear: 2024 } } },
  ct: { openstatesName: "Connecticut", chambers: { upper: { termYears: 2, lastElectionYear: 2024 }, lower: { termYears: 2, lastElectionYear: 2024 } } },
  ga: { openstatesName: "Georgia", chambers: { upper: { termYears: 2, lastElectionYear: 2024 }, lower: { termYears: 2, lastElectionYear: 2024 } } },
  id: { openstatesName: "Idaho", chambers: { upper: { termYears: 2, lastElectionYear: 2024 }, lower: { termYears: 2, lastElectionYear: 2024 } } },
  me: { openstatesName: "Maine", chambers: { upper: { termYears: 2, lastElectionYear: 2024 }, lower: { termYears: 2, lastElectionYear: 2024 } } },
  ma: { openstatesName: "Massachusetts", chambers: { upper: { termYears: 2, lastElectionYear: 2024 }, lower: { termYears: 2, lastElectionYear: 2024 } } },
  nh: { openstatesName: "New Hampshire", chambers: { upper: { termYears: 2, lastElectionYear: 2024 }, lower: { termYears: 2, lastElectionYear: 2024 } } },
  ny: { openstatesName: "New York", chambers: { upper: { termYears: 2, lastElectionYear: 2024 }, lower: { termYears: 2, lastElectionYear: 2024 } } },
  nc: { openstatesName: "North Carolina", chambers: { upper: { termYears: 2, lastElectionYear: 2024 }, lower: { termYears: 2, lastElectionYear: 2024 } } },
  ri: { openstatesName: "Rhode Island", chambers: { upper: { termYears: 2, lastElectionYear: 2024 }, lower: { termYears: 2, lastElectionYear: 2024 } } },
  sd: { openstatesName: "South Dakota", chambers: { upper: { termYears: 2, lastElectionYear: 2024 }, lower: { termYears: 2, lastElectionYear: 2024 } } },
  vt: { openstatesName: "Vermont", chambers: { upper: { termYears: 2, lastElectionYear: 2024 }, lower: { termYears: 2, lastElectionYear: 2024 } } },
  // House-only: these states' Senates are staggered (excluded above), but
  // every one of these Houses is a plain 2-year whole-chamber term in an
  // even-year state -- same structural-safety argument as tier (b).
  ak: { openstatesName: "Alaska", chambers: { lower: { termYears: 2, lastElectionYear: 2024 } } },
  ar: { openstatesName: "Arkansas", chambers: { lower: { termYears: 2, lastElectionYear: 2024 } } },
  ca: { openstatesName: "California", chambers: { lower: { termYears: 2, lastElectionYear: 2024 } } },
  co: { openstatesName: "Colorado", chambers: { lower: { termYears: 2, lastElectionYear: 2024 } } },
  de: { openstatesName: "Delaware", chambers: { lower: { termYears: 2, lastElectionYear: 2024 } } },
  fl: { openstatesName: "Florida", chambers: { lower: { termYears: 2, lastElectionYear: 2024 } } },
  hi: { openstatesName: "Hawaii", chambers: { lower: { termYears: 2, lastElectionYear: 2024 } } },
  il: { openstatesName: "Illinois", chambers: { lower: { termYears: 2, lastElectionYear: 2024 } } },
  in: { openstatesName: "Indiana", chambers: { lower: { termYears: 2, lastElectionYear: 2024 } } },
  ia: { openstatesName: "Iowa", chambers: { lower: { termYears: 2, lastElectionYear: 2024 } } },
  ky: { openstatesName: "Kentucky", chambers: { lower: { termYears: 2, lastElectionYear: 2024 } } },
  mo: { openstatesName: "Missouri", chambers: { lower: { termYears: 2, lastElectionYear: 2024 } } },
  mt: { openstatesName: "Montana", chambers: { lower: { termYears: 2, lastElectionYear: 2024 } } },
  nv: { openstatesName: "Nevada", chambers: { lower: { termYears: 2, lastElectionYear: 2024 } } },
  oh: { openstatesName: "Ohio", chambers: { lower: { termYears: 2, lastElectionYear: 2024 } } },
  ok: { openstatesName: "Oklahoma", chambers: { lower: { termYears: 2, lastElectionYear: 2024 } } },
  or: { openstatesName: "Oregon", chambers: { lower: { termYears: 2, lastElectionYear: 2024 } } },
  pa: { openstatesName: "Pennsylvania", chambers: { lower: { termYears: 2, lastElectionYear: 2024 } } },
  tn: { openstatesName: "Tennessee", chambers: { lower: { termYears: 2, lastElectionYear: 2024 } } },
  tx: { openstatesName: "Texas", chambers: { lower: { termYears: 2, lastElectionYear: 2024 } } },
  ut: { openstatesName: "Utah", chambers: { lower: { termYears: 2, lastElectionYear: 2024 } } },
  wa: { openstatesName: "Washington", chambers: { lower: { termYears: 2, lastElectionYear: 2024 } } },
  wv: { openstatesName: "West Virginia", chambers: { lower: { termYears: 2, lastElectionYear: 2024 } } },
  wi: { openstatesName: "Wisconsin", chambers: { lower: { termYears: 2, lastElectionYear: 2024 } } },
  wy: { openstatesName: "Wyoming", chambers: { lower: { termYears: 2, lastElectionYear: 2024 } } },
  // NOT included at all (fully deferred, not just Senate-deferred):
  // Nebraska (unicameral, staggered) and North Dakota (both chambers
  // staggered, House+Senate paired by district).
};

const partyCode = (partyName) => (partyName === "Democratic" ? "D" : partyName === "Republican" ? "R" : partyName === "Independent" ? "I" : null);

const client = new Client({ connectionString: url });
await client.connect();
const run = await client.query(`INSERT INTO ingestion_runs (source) VALUES ($1) RETURNING id`, [SOURCE]);
const runId = run.rows[0].id;

// Observed live this session: OpenStates' free tier is noticeably slow
// under back-to-back requests (no rate-limit headers on a normal 200,
// single calls took 3-10s each) and a full 48-state run tripped an actual
// 429 partway through (Alabama's Senate landed, its House didn't). Writes
// commit per-row as the script goes (no giant enclosing transaction), and
// the whole thing is already proven idempotent, so a failed run is always
// safely resumable by just running the same command again -- this retry
// exists so a transient slow response or a brief rate-limit window
// doesn't force that manual resume in the first place. 429s get a longer,
// more patient backoff than a generic timeout since a rate limit needs
// real wall-clock time to clear, not just an instant retry.
//
// Found live running a real 48-state batch against a "Default (new user)"
// OpenStates key (checked on the account dashboard: 500 requests/day, 1
// request/sec): this function had NO proactive throttle at all, only the
// reactive backoff above -- and typical response latency here is well
// under a second, so back-to-back sequential calls blew straight through
// the 1/sec ceiling and racked up repeated 429s (which still count against
// the daily total on this tier) before the reactive backoff ever caught
// up. A real 48-state run only needs on the order of 100-150 calls total
// (48 states x ~1-2 chambers x ~1-2 pages at per_page=50) -- the 429
// storm was the script wasting quota on rejected requests, not the real
// data need exceeding the daily cap. Fixed by throttling every call
// (first attempt AND retries) to at least ~1.1s since the previous one,
// tracked via a shared module-level timestamp -- proactive spacing
// instead of only reacting after a rejection.
let lastCallAt = 0;
async function throttle() {
  const wait = lastCallAt + 1100 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCallAt = Date.now();
}
async function fetchWithRetry(u, attempts = 6) {
  for (let i = 1; i <= attempts; i += 1) {
    try {
      await throttle();
      const res = await fetch(u, { headers: { "X-API-KEY": API_KEY }, signal: AbortSignal.timeout(60000) });
      if (res.status === 429) throw Object.assign(new Error("429"), { rateLimited: true });
      if (!res.ok) throw new Error(`${res.status}`);
      return res;
    } catch (e) {
      if (i === attempts) throw e;
      const wait = e.rateLimited ? 15000 * i : 2000 * i;
      console.error(`  (retry ${i}/${attempts - 1} after ${e.message} -- waiting ${wait}ms)`);
      await new Promise((r) => setTimeout(r, wait));
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
  // Every openstates_id actually seen this run, and every office_id
  // actually looked up/created this run -- both needed to scope the
  // retirement pass after the main loop correctly. Office scope, not just
  // "this state", because this script only ever processes the chambers
  // explicitly listed in STATE_TERM_INFO for the requested states (many
  // states here are House-only, their Senate never touched at all) --
  // scoping retirement by state alone would wrongly retire people in a
  // chamber this run never queried.
  const seenOpenstatesIds = new Set();
  const touchedOfficeIds = new Set();

  for (const slug of stateFilter) {
    const info = STATE_TERM_INFO[slug];
    if (!info) {
      console.error(`  skipping '${slug}': no verified STATE_TERM_INFO entry -- add one (with a real cited source for the election-cycle anchor) before running this state.`);
      continue;
    }
    const stateOcdId = `ocd-division/country:us/state:${slug}`;

    for (const [orgClassification, cycle] of Object.entries(info.chambers)) {
      console.error(`  ${slug} / ${orgClassification} ...`);
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
        touchedOfficeIds.add(officeId);

        const fullName = p.name;
        const party = partyCode(p.party);
        const bio = `${chamberTitle} for ${info.openstatesName}${district ? `, District ${district}` : ""}. Party per OpenStates: ${p.party ?? "unlisted"}. OpenStates id: ${p.id}.`;

        const existingPol = await client.query(`SELECT id, current_office_id FROM politicians WHERE openstates_id = $1`, [p.id]);
        seenOpenstatesIds.add(p.id);
        let polId;
        if (existingPol.rowCount) {
          polId = existingPol.rows[0].id;
          const prevOfficeId = existingPol.rows[0].current_office_id;
          if (prevOfficeId && prevOfficeId !== officeId) {
            // Seat changed (redistricted, or moved chambers) within this
            // run's own data -- same gap as full departure below: close
            // out the OLD office_terms row rather than silently moving
            // current_office_id on and leaving it dangling open. Confirmed
            // live 2026-08-15: grepped every ingest script, none of them
            // ever wrote term_end.
            await client.query(
              `UPDATE office_terms SET term_end = CURRENT_DATE WHERE office_id = $1 AND politician_id = $2 AND term_end IS NULL`,
              [prevOfficeId, polId],
            );
          }
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

  // Retirement pass: anyone with an openstates_id whose CURRENT office was
  // actually queried this run (touchedOfficeIds) but who didn't appear in
  // the results has left that seat (lost re-election, resigned, died).
  // Nothing before this ever closed out their office_terms row or cleared
  // current_office_id -- confirmed live 2026-08-15 by grepping every
  // ingest script for a term_end write and finding none. term_end is set
  // to this run's date, not their actual departure date (OpenStates
  // doesn't give us that either) -- an approximation, disclosed here
  // rather than silently assumed precise, same posture as term_start.
  const retire = await client.query(
    `SELECT p.id, p.full_name, p.openstates_id, p.current_office_id
       FROM politicians p
      WHERE p.openstates_id IS NOT NULL AND p.current_office_id = ANY($1)
        AND NOT (p.openstates_id = ANY($2))`,
    [[...touchedOfficeIds], [...seenOpenstatesIds]],
  );
  for (const row of retire.rows) {
    await client.query(`UPDATE politicians SET current_office_id = NULL WHERE id = $1`, [row.id]);
    await client.query(
      `UPDATE office_terms SET term_end = CURRENT_DATE WHERE office_id = $1 AND politician_id = $2 AND term_end IS NULL`,
      [row.current_office_id, row.id],
    );
    console.log(`  retired: ${row.full_name} (${row.openstates_id}) no longer in the current roster`);
  }

  await client.query(
    `UPDATE ingestion_runs SET finished_at = now(), status = 'succeeded',
            rows_upserted = $2, rows_skipped = $3, data_through = $4, note = $5
      WHERE id = $1`,
    [runId, processed, 0, dataThrough ? `${dataThrough}-01-01` : null,
      `states: ${stateFilter.join(", ")}. term_start is Jan 1 following each state/chamber's last verified election year -- an approximation, not an exact swearing-in date (see script header). States not in STATE_TERM_INFO were skipped, not guessed.` +
        (retire.rows.length ? ` | retired: ${retire.rows.map((r) => r.full_name).join(", ")}` : "")],
  );
  console.log(`${SOURCE}: processed ${processed} new office_terms row(s) across states: ${stateFilter.join(", ")}, retired ${retire.rows.length} departed member(s)`);
} catch (e) {
  await client.query(`UPDATE ingestion_runs SET finished_at = now(), status = 'failed', note = $2 WHERE id = $1`, [runId, String(e.message ?? e)]);
  console.error(`${SOURCE} FAILED: ${e.message ?? e}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
