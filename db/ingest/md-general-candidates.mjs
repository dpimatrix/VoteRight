#!/usr/bin/env node
// Maryland 2026 general-election candidate-filing ingester (owner request,
// 2026-09-22, following the /admin/race-coverage gap-detection screen,
// migration 091). Closes real coverage gaps by creating races + candidacies
// for offices VoteRight ALREADY tracks -- never creates a new office, and
// never guesses a jurisdiction beyond the ones already built out.
//
// Source: Maryland State Board of Elections' own bulk CSV candidate lists
// -- verified live 2026-09-22 to be real, current, structured, and (unlike
// campaign finance/endorsements, DATA-OPS.md §7-8) genuinely bulk-automatable:
//   https://elections.maryland.gov/elections/2026/general_candidates/2026_GG_statewide_candidatelist.csv
//   https://elections.maryland.gov/elections/2026/general_candidates/2026_GG_all_counties_candidatelist.csv
// Deliberately the GENERAL list, not the primary one -- confirmed live that
// a candidate who lost their primary (e.g. two of three 2026 Allegany
// County Sheriff primary candidates) correctly drops off the general list,
// so using the primary list here would have wrongly seeded losing primary
// candidates as still running.
//
// SCOPE, DELIBERATELY NARROW: only office types this script recognizes
// (federal delegation, MD General Assembly, Governor/Lt. Governor,
// Attorney General, and Montgomery County's already-built county-row
// offices) AND only rows whose resolved title matches an office ALREADY IN
// VoteRight's `offices` table. A county VoteRight hasn't built out (e.g.
// Allegany County Commissioner) simply finds no match and is silently
// skipped -- this script never creates a new office or expands county
// coverage; that remains a separate, larger, deliberate decision.
// "Judge of the Circuit Court" rows are also skipped on purpose: Maryland's
// judicial circuits span multiple counties (Montgomery shares its 6th
// Circuit with Frederick County) with no clean per-seat subcircuit mapping
// in this feed, and CODING-STANDARDS.md's "when in doubt, code narrower"
// applies just as much to which race a real candidate gets attached to.
//
// MATCHING A CANDIDATE TO AN EXISTING politicians ROW (no clean external id
// like bioguide_id/openstates_id exists in this feed), in priority order:
//   1. The office's CURRENT officeholder (office_terms.term_end IS NULL) --
//      catches an incumbent seeking re-election even when the ballot name's
//      formatting differs from the roster source's (verified live: Rep.
//      "Johnny Olszewski" on Congress.gov vs "John "Johnny O" Olszewski,
//      Jr." on this SBE ballot -- an exact-string match would have missed
//      him and wrongly created a duplicate). Cross-checked against the
//      ballot name's last token as a sanity guard against a stale/wrong
//      office_terms row silently misattaching to the wrong real person.
//   2. An exact, case-insensitive full-name match anywhere in politicians --
//      catches an existing officeholder running for a DIFFERENT seat than
//      the one they currently hold (verified live: Marc Elrich, current
//      County Executive, filed for County Council At-Large in 2026; Will
//      Jawando, a current At-Large councilmember, filed for County
//      Executive -- a real race swap this run must not turn into duplicate
//      politician rows for either of them).
//   3. No match -- a genuinely new candidate gets a fresh politicians row,
//      current_office_id left NULL (they don't hold any office yet), same
//      "challenger gets a monogram until proven otherwise" posture as every
//      other part of this app.
//   Two same-named existing politicians (ambiguous) is refused, never
//   guessed -- reported and left for a human to resolve.
//
// Only Candidate Status = 'Active' rows are processed -- Withdrawn,
// Declined, Deceased, and Failed-to-Submit-Signatures rows are real SBE
// statuses confirmed present in this feed and must never be coded as
// running.
//
// Idempotent by construction: races keyed on the existing
// UNIQUE(election_cycle_id, office_id), candidacies on the existing
// UNIQUE(politician_id, race_id) -- a re-run against an unchanged filing
// list is a true no-op.
//
// Usage: node db/ingest/md-general-candidates.mjs [--url=<postgres url>]

import { createRequire } from "node:module";
const require = createRequire(new URL("../../app/package.json", import.meta.url));
const { Client } = require("pg");

const SOURCE = "md-sbe-general-candidates-2026";
const STATEWIDE_URL = "https://elections.maryland.gov/elections/2026/general_candidates/2026_GG_statewide_candidatelist.csv";
const ALL_COUNTIES_URL = "https://elections.maryland.gov/elections/2026/general_candidates/2026_GG_all_counties_candidatelist.csv";
const ELECTION_CYCLE_NAME = "2026 Maryland General";

const args = process.argv.slice(2);
const url = args.find((a) => a.startsWith("--url="))?.slice(6) ?? process.env.DATABASE_URL ?? "postgres://postgres:vr@localhost:5433/voteright";

async function fetchWithRetry(u, attempts = 4) {
  for (let i = 1; i <= attempts; i += 1) {
    try {
      const res = await fetch(u, { signal: AbortSignal.timeout(30000) });
      if (!res.ok) throw new Error(`${res.status}`);
      return await res.text();
    } catch (e) {
      if (i === attempts) throw e;
      const wait = 1500 * i;
      console.error(`  (retry ${i}/${attempts - 1} after ${e.message} -- waiting ${wait}ms)`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

// Quote-aware CSV parser -- this feed has embedded commas inside quoted
// fields (e.g. "Brodie, Jr.") that a naive .split(',') would corrupt.
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\r") { /* skip */ }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.length > 1 || r[0] !== "");
}

function rowsToObjects(rows) {
  const header = rows[0];
  return rows.slice(1).map((r) => {
    const obj = {};
    header.forEach((h, i) => { obj[h] = (r[i] ?? "").trim(); });
    return obj;
  });
}

const mainCandidateName = (row) =>
  `${row["Candidate First Name and Middle Name"]} ${row["Candidate Ballot Last Name and Suffix"]}`.replace(/\s+/g, " ").trim();
const relatedCandidateName = (row) =>
  `${row["Related Candidate First Name and Middle Name"]} ${row["Related Candidate Last Name and Suffix"]}`.replace(/\s+/g, " ").trim();

// Same D/R/I short-code convention db/ingest/congress.mjs already
// established; minor parties (Green, Libertarian, Working Class Party,
// Non-Partisan, Unaffiliated) have no established short code anywhere in
// this codebase, so they're left as the SBE's own text rather than
// inventing an unestablished one.
const partyCode = (partyName) =>
  partyName === "Democratic" ? "D" : partyName === "Republican" ? "R" : partyName === "Unaffiliated" ? "I" : partyName || null;

const STATE_TITLE_RESOLVERS = {
  "Representative in Congress": (row) => {
    const m = row["Contest Run By District Name and Number"].match(/Congressional District (\d+)/);
    return m ? `U.S. Representative — District ${m[1]}` : null;
  },
  "State Senator": (row) => {
    const m = row["Contest Run By District Name and Number"].match(/Legislative District (\w+)/);
    return m ? `State Senator — District ${m[1]}` : null;
  },
  "House of Delegates": (row) => {
    const m = row["Contest Run By District Name and Number"].match(/Legislative District (\w+)/);
    return m ? `State Delegate — District ${m[1]}` : null;
  },
  "Attorney General": () => "Attorney General",
};

// Only applied when the row's own residential jurisdiction is Montgomery
// County -- see header note on scope.
const COUNTY_TITLE_RESOLVERS = {
  "County Executive": () => "County Executive",
  "County Council At Large": () => "County Council — At-Large",
  "County Council": (row) => {
    const m = row["Contest Run By District Name and Number"].match(/Councilmanic District (\d+)/);
    return m ? `County Council — District ${m[1]}` : null;
  },
  "Sheriff": () => "Sheriff",
  "State's Attorney": () => "State's Attorney",
  "Clerk of the Circuit Court": () => "Clerk of the Circuit Court",
  "Register of Wills": () => "Register of Wills",
  "Board of Education At Large": () => "Board of Education — At-Large",
  "Board of Education": (row) => {
    const m = row["Contest Run By District Name and Number"].match(/Board of Education District (\d+)/);
    return m ? `Board of Education — District ${m[1]}` : null;
  },
};

const MD_STATE_OCD = "ocd-division/country:us/state:md";
const MONTGOMERY_OCD = "ocd-division/country:us/state:md/county:montgomery";

// Returns { title, jurisdictionId } or null. Real bug caught live in
// production (2026-09-22): an earlier version matched offices via a
// state-wide `jurisdiction_id LIKE 'ocd-division/country:us/state:md%'`
// scan instead of an exact jurisdiction, which collided on "County
// Executive"/"County Council — District N" -- Prince George's County has
// offices with the IDENTICAL title strings (migration 005) under a
// different jurisdiction_id, so the query found 2 rows, failed the
// exactly-one-match safety check, and every one of Montgomery's own 9
// county-row offices was wrongly reported as "unmatched" instead of
// found. Fixed by resolving an exact jurisdiction alongside the title,
// never a broad LIKE.
function resolveTitle(row) {
  const office = row["Office Name"];
  if (STATE_TITLE_RESOLVERS[office]) {
    const title = STATE_TITLE_RESOLVERS[office](row);
    return title ? { title, jurisdictionId: MD_STATE_OCD } : null;
  }
  if (COUNTY_TITLE_RESOLVERS[office]) {
    if (row["Candidate Residential Jurisdiction"] !== "Montgomery County") return null;
    const title = COUNTY_TITLE_RESOLVERS[office](row);
    return title ? { title, jurisdictionId: MONTGOMERY_OCD } : null;
  }
  return null;
}

const client = new Client({ connectionString: url });
await client.connect();
const run = await client.query(`INSERT INTO ingestion_runs (source) VALUES ($1) RETURNING id`, [SOURCE]);
const runId = run.rows[0].id;

const stats = {
  rowsSeen: 0, notActive: 0, unmatchedOffice: 0, racesCreated: 0, racesExisting: 0,
  candidaciesCreated: 0, candidaciesExisting: 0, politiciansCreated: 0,
  matchedIncumbent: 0, matchedExactName: 0, ambiguousSkipped: 0,
};
const unmatchedTitles = new Set();
const newPoliticianLog = [];
const ambiguousLog = [];

try {
  const cycleRes = await client.query(`SELECT id FROM election_cycles WHERE name = $1`, [ELECTION_CYCLE_NAME]);
  if (cycleRes.rowCount === 0) throw new Error(`election_cycles row '${ELECTION_CYCLE_NAME}' not found -- never creating one silently, seed it first`);
  const electionCycleId = cycleRes.rows[0].id;

  const officeCache = new Map(); // `${jurisdictionId}::${title}` -> {id, seat_count} | null
  async function lookupOffice(jurisdictionId, title) {
    const key = `${jurisdictionId}::${title}`;
    if (officeCache.has(key)) return officeCache.get(key);
    const res = await client.query(
      `SELECT id, seat_count FROM offices WHERE jurisdiction_id = $1 AND title = $2`,
      [jurisdictionId, title],
    );
    const result = res.rowCount === 1 ? { id: res.rows[0].id, seatCount: res.rows[0].seat_count } : null;
    officeCache.set(key, result);
    return result;
  }

  async function findOrCreateRace(officeId, seatCount) {
    const existing = await client.query(`SELECT id FROM races WHERE election_cycle_id = $1 AND office_id = $2`, [electionCycleId, officeId]);
    if (existing.rowCount) { stats.racesExisting += 1; return existing.rows[0].id; }
    const ins = await client.query(
      `INSERT INTO races (election_cycle_id, office_id, seats_elected) VALUES ($1, $2, $3)
       ON CONFLICT (election_cycle_id, office_id) DO NOTHING RETURNING id`,
      [electionCycleId, officeId, seatCount],
    );
    if (ins.rowCount) { stats.racesCreated += 1; return ins.rows[0].id; }
    const retry = await client.query(`SELECT id FROM races WHERE election_cycle_id = $1 AND office_id = $2`, [electionCycleId, officeId]);
    return retry.rows[0].id;
  }

  async function findOrCreatePolitician(officeId, fullName, party) {
    const incumbent = await client.query(
      `SELECT p.id, p.full_name FROM politicians p
         JOIN office_terms ot ON ot.politician_id = p.id
        WHERE ot.office_id = $1 AND ot.term_end IS NULL`,
      [officeId],
    );
    if (incumbent.rowCount === 1) {
      // Cross-check on the INCUMBENT's own stored last token, not the
      // ballot name's -- a roster source (Congress.gov/OpenStates) reliably
      // ends in the surname, but an SBE ballot name often doesn't (a
      // trailing ", Jr."/", III" suffix or a "Nickname" in quotes is
      // common). Real bug caught live: "Johnny Olszewski" (roster) vs
      // 'John "Johnny O" Olszewski, Jr.' (ballot) -- the ballot name's own
      // last token is "Jr.", which never matches anything, and the
      // original direction of this check silently created a duplicate
      // politician for a sitting Congressman before this fix.
      const incumbentLastToken = incumbent.rows[0].full_name.trim().split(/\s+/).pop().toLowerCase();
      if (incumbentLastToken && fullName.toLowerCase().includes(incumbentLastToken)) {
        stats.matchedIncumbent += 1;
        return incumbent.rows[0].id;
      }
    }
    const exact = await client.query(`SELECT id FROM politicians WHERE lower(full_name) = lower($1)`, [fullName]);
    if (exact.rowCount === 1) { stats.matchedExactName += 1; return exact.rows[0].id; }
    if (exact.rowCount > 1) {
      stats.ambiguousSkipped += 1;
      ambiguousLog.push(fullName);
      return null;
    }
    const ins = await client.query(`INSERT INTO politicians (full_name, party) VALUES ($1, $2) RETURNING id`, [fullName, party]);
    stats.politiciansCreated += 1;
    newPoliticianLog.push(fullName);
    return ins.rows[0].id;
  }

  async function processCandidate(officeId, seatCount, fullName, party) {
    if (!fullName.trim()) return;
    const politicianId = await findOrCreatePolitician(officeId, fullName, party);
    if (!politicianId) return; // ambiguous -- already logged, never guess
    const raceId = await findOrCreateRace(officeId, seatCount);
    const existing = await client.query(`SELECT 1 FROM candidacies WHERE politician_id = $1 AND race_id = $2`, [politicianId, raceId]);
    if (existing.rowCount) { stats.candidaciesExisting += 1; return; }
    const ins = await client.query(
      `INSERT INTO candidacies (politician_id, race_id, party, website)
       VALUES ($1, $2, $3, $4) ON CONFLICT (politician_id, race_id) DO NOTHING`,
      [politicianId, raceId, party, null],
    );
    if (ins.rowCount) stats.candidaciesCreated += 1; else stats.candidaciesExisting += 1;
  }

  for (const sourceUrl of [STATEWIDE_URL, ALL_COUNTIES_URL]) {
    console.log(`fetching ${sourceUrl} ...`);
    const csvText = await fetchWithRetry(sourceUrl);
    const rows = rowsToObjects(parseCSV(csvText));
    for (const row of rows) {
      stats.rowsSeen += 1;
      if (row["Candidate Status"] !== "Active") { stats.notActive += 1; continue; }
      const resolved = resolveTitle(row);
      if (!resolved) { stats.unmatchedOffice += 1; continue; }
      const office = await lookupOffice(resolved.jurisdictionId, resolved.title);
      if (!office) { stats.unmatchedOffice += 1; unmatchedTitles.add(resolved.title); continue; }

      await processCandidate(office.id, office.seatCount, mainCandidateName(row), partyCode(row["Office Political Party"]));

      // Governor / Lt. Governor is a combined-ticket row -- the related
      // candidate (Lt. Governor) rides along in the SAME csv row.
      if (row["Office Name"] === "Governor / Lt. Governor" && row["Has Related Candidate"] === "Yes") {
        const ltGov = await lookupOffice(MD_STATE_OCD, "Lieutenant Governor");
        if (ltGov) {
          await processCandidate(ltGov.id, ltGov.seatCount, relatedCandidateName(row), partyCode(row["Related Office Political Party"]));
        } else {
          unmatchedTitles.add("Lieutenant Governor");
        }
      }
    }
  }

  await client.query(
    `UPDATE ingestion_runs SET finished_at = now(), status = 'succeeded',
            rows_upserted = $2, rows_skipped = $3, note = $4 WHERE id = $1`,
    [runId, stats.candidaciesCreated, stats.notActive + stats.unmatchedOffice + stats.ambiguousSkipped, JSON.stringify(stats)],
  );

  console.log("\n=== md-general-candidates: done ===");
  console.log(stats);
  if (unmatchedTitles.size) console.log("unmatched titles (no existing office, correctly skipped):", [...unmatchedTitles].sort());
  if (newPoliticianLog.length) console.log(`\nnew politicians created (${newPoliticianLog.length}):\n` + newPoliticianLog.sort().join("\n"));
  if (ambiguousLog.length) console.log(`\nAMBIGUOUS -- needs human review, no candidacy created (${ambiguousLog.length}):\n` + ambiguousLog.join("\n"));
} catch (e) {
  await client.query(`UPDATE ingestion_runs SET finished_at = now(), status = 'failed', note = $2 WHERE id = $1`, [runId, String(e.message ?? e)]);
  console.error(e);
  process.exitCode = 1;
} finally {
  await client.end();
}
