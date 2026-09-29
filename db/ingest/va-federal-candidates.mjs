#!/usr/bin/env node
// Virginia 2026 federal general-election candidate-filing ingester (owner
// request, 2026-09-28). Deliberately federal-only, unlike Maryland's
// full-ballot ingester (db/ingest/md-general-candidates.mjs) -- verified
// live: Virginia's 2026 general election ballot is U.S. Senate + all 11
// U.S. House seats + one special House of Delegates election (District 20
// only) + local offices. Virginia's own State Senate (40 seats), House of
// Delegates (100 seats, full chamber), and Governor/Lt. Governor/Attorney
// General are NOT up in 2026 -- the Senate and full House of Delegates
// both next come up together in 2027, Governor/Lt.Gov/AG not until 2029.
// Building a full-ballot Virginia scraper now would mostly target offices
// with no real 2026 candidate to find; that's a 2027 project, not this one.
//
// Source: Virginia Department of Elections' own federal candidate list --
// https://www.elections.virginia.gov/casting-a-ballot/candidate-list/november-3-2026-gen-elect-federal-offices/
// -- confirmed live to be the GENERAL election list specifically (URL
// itself says "gen-elect"), a plain HTML table (not a downloadable file
// the way Maryland's SBE publishes CSVs), 13 columns: Office Title,
// District, Candidate Party, Candidate Name, Incumbent (Yes/No -- a
// direct signal Maryland's feed doesn't give), then contact-info columns.
// No withdrawn/status column exists -- every row on this page is Virginia's
// own certified list for the November ballot, so every row is processed.
//
// SCOPE, DELIBERATELY NARROW, same posture as the Maryland ingester: only
// matches against offices VoteRight ALREADY tracks (U.S. Senator, U.S.
// Representative -- District N, both under Virginia's own state
// jurisdiction, populated by db/ingest/congress.mjs) -- never creates a
// new office.
//
// Politician matching: identical 3-tier logic to md-general-candidates.mjs
// (see that script's own header for the two real bugs found and fixed
// against it) -- all current officeholders of the target office checked
// for a surname match first (not just "exactly one exists" -- Virginia's
// House/Senate seats are all single-member so this tier is simpler here,
// but kept identical for consistency and because a future federal special
// election could still hit the same shape of issue), then an exact
// full-name match anywhere in politicians narrowed by the filing's own
// declared party if ambiguous, else a new politicians row.
//
// Usage: node db/ingest/va-federal-candidates.mjs [--url=<postgres url>]

import { createRequire } from "node:module";
const require = createRequire(new URL("../../app/package.json", import.meta.url));
const { Client } = require("pg");

const SOURCE = "va-federal-general-candidates-2026";
const CANDIDATE_LIST_URL = "https://www.elections.virginia.gov/casting-a-ballot/candidate-list/november-3-2026-gen-elect-federal-offices/";
const ELECTION_CYCLE_NAME = "2026 Virginia General";
const VA_STATE_OCD = "ocd-division/country:us/state:va";

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

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

// This page's table is a plain, consistently-shaped HTML table (13 <td>
// cells per <tr class="excel-34373-media-r1">) -- a minimal regex
// extractor is enough, same "don't pull in a full HTML parser for one
// simple, verified-shape feed" posture as senate-votes.mjs's own regex XML
// extraction.
function parseRows(html) {
  const rowRe = /<tr class="excel-34373-media-r1">([\s\S]*?)<\/tr>/g;
  const cellRe = /<td>([\s\S]*?)<\/td>/g;
  const rows = [];
  let rowMatch;
  while ((rowMatch = rowRe.exec(html))) {
    const cells = [];
    let cellMatch;
    cellRe.lastIndex = 0;
    while ((cellMatch = cellRe.exec(rowMatch[1]))) cells.push(decodeEntities(cellMatch[1]));
    rows.push(cells);
  }
  return rows;
}

// Same D/R/I convention db/ingest/congress.mjs already established --
// Virginia's own feed says "Independent", not Maryland's "Unaffiliated",
// so this maps that word directly rather than reusing md-general-
// candidates.mjs's partyCode() as-is.
const partyCode = (partyName) =>
  partyName === "Democratic" ? "D" : partyName === "Republican" ? "R" : partyName === "Independent" ? "I" : partyName || null;

function resolveTitle(officeTitle, district) {
  if (officeTitle === "Member, United States Senate") return "U.S. Senator";
  if (officeTitle === "Member, House of Representatives") {
    const m = district.match(/^(\d+)/);
    return m ? `U.S. Representative — District ${m[1]}` : null;
  }
  return null;
}

const client = new Client({ connectionString: url });
await client.connect();
const run = await client.query(`INSERT INTO ingestion_runs (source) VALUES ($1) RETURNING id`, [SOURCE]);
const runId = run.rows[0].id;

const stats = {
  rowsSeen: 0, unmatchedOffice: 0, racesCreated: 0, racesExisting: 0,
  candidaciesCreated: 0, candidaciesExisting: 0, politiciansCreated: 0,
  matchedIncumbent: 0, matchedExactName: 0, ambiguousSkipped: 0,
};
const unmatchedTitles = new Set();
const newPoliticianLog = [];
const ambiguousLog = [];

try {
  const cycleRes = await client.query(`SELECT id FROM election_cycles WHERE name = $1`, [ELECTION_CYCLE_NAME]);
  if (cycleRes.rowCount === 0) throw new Error(`election_cycles row '${ELECTION_CYCLE_NAME}' not found -- never creating one silently, seed it first (migration 107)`);
  const electionCycleId = cycleRes.rows[0].id;

  const officeCache = new Map();
  // Returns ALL office rows matching this title, not just "exactly one" --
  // real structural issue found live: Virginia's own two Senate seats are
  // both plainly titled "U.S. Senator" (congress.mjs's own header
  // explicitly documents this: Senate seats are modeled as two identically-
  // titled seat_type='single' offices, not distinguished by Class). A
  // single-result lookup would either wrongly pick one at random or refuse
  // both -- disambiguation happens one level up, per title-group, using
  // each candidate's own declared incumbency.
  async function lookupOffices(title) {
    if (officeCache.has(title)) return officeCache.get(title);
    const res = await client.query(
      `SELECT id, seat_count FROM offices WHERE jurisdiction_id = $1 AND title = $2`,
      [VA_STATE_OCD, title],
    );
    const result = res.rows.map((r) => ({ id: r.id, seatCount: r.seat_count }));
    officeCache.set(title, result);
    return result;
  }

  // A title shared by multiple office rows (Virginia's two identically-
  // titled Senate seats) is resolved by checking which office's CURRENT
  // officeholder's surname matches ANY candidate on this specific ballot
  // row's own title+district group -- e.g. Sen. Warner (Incumbent=Yes) is
  // the signal that picks his office out of the two, and his challenger's
  // row (Incumbent=No, carries no signal of its own) rides on the same
  // resolution since they're contesting the same seat. Never guesses:
  // exactly one qualifying office is required, or the whole group is
  // skipped and reported.
  async function disambiguateByIncumbency(offices, candidateNamesInGroup) {
    const qualifying = [];
    for (const office of offices) {
      const incumbents = await client.query(
        `SELECT p.full_name FROM politicians p
           JOIN office_terms ot ON ot.politician_id = p.id
          WHERE ot.office_id = $1 AND ot.term_end IS NULL`,
        [office.id],
      );
      const matches = incumbents.rows.some((r) => {
        const lastToken = r.full_name.trim().split(/\s+/).pop().toLowerCase();
        return lastToken && candidateNamesInGroup.some((n) => n.toLowerCase().includes(lastToken));
      });
      if (matches) qualifying.push(office);
    }
    return qualifying.length === 1 ? qualifying[0] : null;
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

  // Identical tiered logic to md-general-candidates.mjs -- see that
  // script's header for the two real bugs (multi-member-office
  // incumbency, name-collision party disambiguation) this already
  // incorporates fixes for.
  async function findOrCreatePolitician(officeId, fullName, party) {
    const incumbents = await client.query(
      `SELECT p.id, p.full_name FROM politicians p
         JOIN office_terms ot ON ot.politician_id = p.id
        WHERE ot.office_id = $1 AND ot.term_end IS NULL`,
      [officeId],
    );
    const nameMatches = incumbents.rows.filter((r) => {
      const lastToken = r.full_name.trim().split(/\s+/).pop().toLowerCase();
      return lastToken && fullName.toLowerCase().includes(lastToken);
    });
    if (nameMatches.length === 1) {
      stats.matchedIncumbent += 1;
      return nameMatches[0].id;
    }
    const exact = await client.query(`SELECT id, party FROM politicians WHERE lower(full_name) = lower($1)`, [fullName]);
    if (exact.rowCount === 1) { stats.matchedExactName += 1; return exact.rows[0].id; }
    if (exact.rowCount > 1) {
      const byParty = exact.rows.filter((r) => r.party === party);
      if (party && byParty.length === 1) { stats.matchedExactName += 1; return byParty[0].id; }
      stats.ambiguousSkipped += 1;
      ambiguousLog.push(fullName);
      return null;
    }
    const ins = await client.query(`INSERT INTO politicians (full_name, party) VALUES ($1, $2) RETURNING id`, [fullName, party]);
    stats.politiciansCreated += 1;
    newPoliticianLog.push(fullName);
    return ins.rows[0].id;
  }

  console.log(`fetching ${CANDIDATE_LIST_URL} ...`);
  const html = await fetchWithRetry(CANDIDATE_LIST_URL);
  const allRows = parseRows(html);
  const rows = allRows.filter((r) => r[0] !== "Office Title"); // drop the header row
  stats.rowsSeen = rows.length;

  // Grouped by resolved title (not processed row-by-row directly) --
  // needed so a multi-office title (Virginia's two "U.S. Senator" rows)
  // can be disambiguated using the FULL set of candidates contesting that
  // one seat, not just whichever row happens to be seen first.
  const groups = new Map(); // title -> rows[]
  for (const row of rows) {
    const [officeTitle, district] = row;
    const title = resolveTitle(officeTitle, district);
    if (!title) { stats.unmatchedOffice += 1; continue; }
    if (!groups.has(title)) groups.set(title, []);
    groups.get(title).push(row);
  }

  for (const [title, groupRows] of groups) {
    const candidates = await lookupOffices(title);
    let office = null;
    if (candidates.length === 1) {
      office = candidates[0];
    } else if (candidates.length > 1) {
      office = await disambiguateByIncumbency(candidates, groupRows.map((r) => r[3]));
      if (!office) {
        stats.unmatchedOffice += groupRows.length;
        unmatchedTitles.add(`${title} (${candidates.length} same-titled offices, incumbency didn't disambiguate)`);
        continue;
      }
    } else {
      stats.unmatchedOffice += groupRows.length;
      unmatchedTitles.add(title);
      continue;
    }

    for (const row of groupRows) {
      const [, , party, candidateName] = row;
      const politicianId = await findOrCreatePolitician(office.id, candidateName, partyCode(party));
      if (!politicianId) continue; // ambiguous -- already logged, never guess

      const raceId = await findOrCreateRace(office.id, office.seatCount);
      const existing = await client.query(`SELECT 1 FROM candidacies WHERE politician_id = $1 AND race_id = $2`, [politicianId, raceId]);
      if (existing.rowCount) { stats.candidaciesExisting += 1; continue; }
      const website = row[6] ? (row[6].startsWith("http") ? row[6] : `https://${row[6]}`) : null;
      const ins = await client.query(
        `INSERT INTO candidacies (politician_id, race_id, party, website)
         VALUES ($1, $2, $3, $4) ON CONFLICT (politician_id, race_id) DO NOTHING`,
        [politicianId, raceId, partyCode(party), website],
      );
      if (ins.rowCount) stats.candidaciesCreated += 1; else stats.candidaciesExisting += 1;
    }
  }

  await client.query(
    `UPDATE ingestion_runs SET finished_at = now(), status = 'succeeded',
            rows_upserted = $2, rows_skipped = $3, note = $4 WHERE id = $1`,
    [runId, stats.candidaciesCreated, stats.unmatchedOffice + stats.ambiguousSkipped, JSON.stringify(stats)],
  );

  console.log("\n=== va-federal-candidates: done ===");
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
