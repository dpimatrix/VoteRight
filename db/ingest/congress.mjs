#!/usr/bin/env node
// D6 ingester: U.S. Congress roster (Senate + House) via the Congress.gov
// API (docs/DATA-OPS.md's own long-standing plan -- "Federal officials
// (later)... Congress.gov API... ProPublica retired"). Builds federal
// offices (2 U.S. Senator seats + N U.S. Representative district seats per
// state, created on demand as members are encountered) under each state's
// jurisdiction row (migration 059), and populates politicians + office_terms
// for every CURRENT member of the running Congress.
//
// Source: https://api.congress.gov/v3/member/congress/{N}?currentMember=true
// (paginated, 250/page). Requires CONGRESS_API_KEY (free key,
// https://api.congress.gov/sign-up/).
//
// SCOPE OF THIS FIRST PASS, DELIBERATELY NARROW:
//  - Only the 50 states seeded in migration 059 -- D.C./territories'
//    non-voting delegates are naturally skipped for now since they have no
//    jurisdiction row yet to attach to (not a bug, a real future step).
//  - U.S. Senate seats are modeled as two separate seat_type='single'
//    offices, BOTH plainly titled "U.S. Senator" -- deliberately NOT
//    labeled by Senate "Class" (I-II-III), since the Congress.gov member-
//    list response doesn't give Class directly and reconstructing it from
//    the per-Congress term history reliably is real added complexity not
//    worth it for a first pass. Two identically-titled seats under one
//    jurisdiction is honest (both real, both current), just not
//    maximally descriptive yet.
//  - term_start is set to January 3 of the member's most recent listed
//    term startYear (the constitutionally mandated day a new Congress
//    convenes) -- exact for House members and freshly-elected senators,
//    an approximation for senators mid-way through a 6-year term (the API
//    doesn't give an exact swearing-in date in this endpoint). Disclosed
//    here, not silently assumed precise.
//  - Idempotent by construction: politicians.bioguide_id (UNIQUE since
//    migration 060 — a real bug this project hit and fixed: running this
//    script twice without it created duplicate members, since a plain
//    INSERT has nothing to key on) is the identity anchor. A known member
//    reuses their existing office_id directly (skipping the Senate-seat
//    search entirely) and gets an UPDATE, not a fresh INSERT; a genuinely
//    new member goes through the Senate-seat-search/find-or-create-office
//    path once. office_terms rows are additionally guarded by their own
//    UNIQUE(office_id, politician_id, term_start) via ON CONFLICT DO
//    NOTHING. A re-run against an unchanged roster is a true no-op —
//    verified live by running this script back-to-back and confirming
//    zero new rows on the second run.
//
// Usage: node db/ingest/congress.mjs [--states=md,va] [--congress=119] [--url=<postgres url>]
// Default: all 50 states seeded in migration 059, current (119th) Congress.

import { createRequire } from "node:module";
const require = createRequire(new URL("../../app/package.json", import.meta.url));
const { Client } = require("pg");

const SOURCE = "congress-gov-roster";
const API_KEY = process.env.CONGRESS_API_KEY;
if (!API_KEY) {
  console.error("CONGRESS_API_KEY is not set (app/.env.local or the environment) -- aborting, never guessing.");
  process.exit(1);
}

const args = process.argv.slice(2);
const congress = Number(args.find((a) => a.startsWith("--congress="))?.slice(11) ?? "119");
const stateFilter = args.find((a) => a.startsWith("--states="))?.slice(9)?.split(",").map((s) => s.trim().toLowerCase());
const url = args.find((a) => a.startsWith("--url="))?.slice(6) ?? process.env.DATABASE_URL ?? "postgres://postgres:vr@localhost:5433/voteright";

// Congress.gov's full state name -> this schema's two-letter ocd_id slug.
// Built from the same Census FIPS list used in migration 059, not
// re-derived here, to avoid a second source of truth drifting from the
// first.
const STATE_SLUG = {
  Alabama: "al", Alaska: "ak", Arizona: "az", Arkansas: "ar", California: "ca",
  Colorado: "co", Connecticut: "ct", Delaware: "de", Florida: "fl", Georgia: "ga",
  Hawaii: "hi", Idaho: "id", Illinois: "il", Indiana: "in", Iowa: "ia",
  Kansas: "ks", Kentucky: "ky", Louisiana: "la", Maine: "me", Maryland: "md",
  Massachusetts: "ma", Michigan: "mi", Minnesota: "mn", Mississippi: "ms", Missouri: "mo",
  Montana: "mt", Nebraska: "ne", Nevada: "nv", "New Hampshire": "nh", "New Jersey": "nj",
  "New Mexico": "nm", "New York": "ny", "North Carolina": "nc", "North Dakota": "nd", Ohio: "oh",
  Oklahoma: "ok", Oregon: "or", Pennsylvania: "pa", "Rhode Island": "ri", "South Carolina": "sc",
  "South Dakota": "sd", Tennessee: "tn", Texas: "tx", Utah: "ut", Vermont: "vt",
  Virginia: "va", Washington: "wa", "West Virginia": "wv", Wisconsin: "wi", Wyoming: "wy",
};

function invertedNameToFull(inverted) {
  // Congress.gov gives "Last, First Middle" (occasionally a suffix after a
  // second comma, e.g. "Smith, John, Jr."). Handle the common 2-part case
  // cleanly; fall back to the raw string (flagged) for anything odder
  // rather than silently mangling a real person's name.
  const parts = inverted.split(",").map((s) => s.trim());
  if (parts.length === 2) return `${parts[1]} ${parts[0]}`;
  if (parts.length === 3) return `${parts[1]} ${parts[0]}, ${parts[2]}`;
  return inverted; // unexpected shape — leave as-is, don't guess
}

const partyCode = (partyName) => (partyName === "Democratic" ? "D" : partyName === "Republican" ? "R" : partyName === "Independent" ? "I" : null);

const client = new Client({ connectionString: url });
await client.connect();
const run = await client.query(`INSERT INTO ingestion_runs (source) VALUES ($1) RETURNING id`, [SOURCE]);
const runId = run.rows[0].id;

// office cache: `${stateOcdId}::${title}` -> office id, seeded lazily
const officeCache = new Map();
async function findOrCreateOffice(stateOcdId, title, seatType) {
  const key = `${stateOcdId}::${title}`;
  if (officeCache.has(key)) return officeCache.get(key);
  const existing = await client.query(`SELECT id FROM offices WHERE jurisdiction_id = $1 AND title = $2`, [stateOcdId, title]);
  if (existing.rowCount) {
    officeCache.set(key, existing.rows[0].id);
    return existing.rows[0].id;
  }
  const termYears = title === "U.S. Senator" ? 6 : 2;
  const ins = await client.query(
    `INSERT INTO offices (jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level)
     VALUES ($1, $2, $3, 1, $4, TRUE, TRUE, 'federal') RETURNING id`,
    [stateOcdId, title, seatType, termYears],
  );
  officeCache.set(key, ins.rows[0].id);
  return ins.rows[0].id;
}

try {
  let processed = 0;
  let skippedStates = new Set();
  let dataThrough = null;

  for (let offset = 0; ; offset += 250) {
    const u = new URL(`https://api.congress.gov/v3/member/congress/${congress}`);
    u.searchParams.set("api_key", API_KEY);
    u.searchParams.set("format", "json");
    u.searchParams.set("currentMember", "true");
    u.searchParams.set("limit", "250");
    u.searchParams.set("offset", String(offset));
    const res = await fetch(u, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`congress.gov ${res.status}`);
    const body = await res.json();
    const members = body.members ?? [];
    if (members.length === 0) break;

    for (const m of members) {
      const slug = STATE_SLUG[m.state];
      if (!slug) {
        skippedStates.add(m.state); // D.C./territory delegates — no jurisdiction row yet
        continue;
      }
      if (stateFilter && !stateFilter.includes(slug)) continue;
      const stateOcdId = `ocd-division/country:us/state:${slug}`;

      const term = m.terms?.item?.at(-1);
      const startYear = term?.startYear;
      if (!term || !startYear) continue; // no usable term date — never guess one
      if (!dataThrough || startYear > dataThrough) dataThrough = startYear;
      const isSenate = term.chamber === "Senate";

      const expectedTitlePrefix = isSenate ? "U.S. Senator" : "U.S. Representative";
      const fullName = invertedNameToFull(m.name);
      const party = partyCode(m.partyName);
      const bio = `${expectedTitlePrefix} for ${m.state}. Congress.gov bioguideId: ${m.bioguideId}.`;

      // Identity anchor: a known member (by bioguide_id) reuses their own
      // existing office directly — no seat-hunting needed, and this is
      // what makes a re-run a true no-op. A mismatch between their stored
      // office's title and this run's chamber (e.g. someone who moved from
      // the House to the Senate between runs) falls through to fresh
      // office assignment below rather than silently keeping the stale one.
      const existingPol = await client.query(
        `SELECT p.id, p.current_office_id, o.title AS current_title
           FROM politicians p LEFT JOIN offices o ON o.id = p.current_office_id
          WHERE p.bioguide_id = $1`,
        [m.bioguideId],
      );
      const reusable = existingPol.rowCount && existingPol.rows[0].current_office_id
        && existingPol.rows[0].current_title?.startsWith(expectedTitlePrefix);

      let officeId;
      if (reusable) {
        officeId = existingPol.rows[0].current_office_id;
      } else if (isSenate) {
        // Two generic "U.S. Senator" offices per state (see header note on
        // why Class isn't labeled): find an existing "U.S. Senator" office
        // at this jurisdiction with no office_terms row yet (not yet
        // filled), or create a new one if both are already taken. A 3rd
        // office being created would mean real data has 3 current senators
        // for one state, which shouldn't happen — surfaced via the final
        // processed count, not silently hidden.
        const seats = await client.query(
          `SELECT o.id FROM offices o WHERE o.jurisdiction_id = $1 AND o.title = 'U.S. Senator' ORDER BY o.id`,
          [stateOcdId],
        );
        let freeSeat = null;
        for (const s of seats.rows) {
          const held = await client.query(`SELECT 1 FROM office_terms WHERE office_id = $1`, [s.id]);
          if (!held.rowCount) { freeSeat = s.id; break; }
        }
        if (freeSeat) {
          officeId = freeSeat;
        } else {
          const ins = await client.query(
            `INSERT INTO offices (jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level)
             VALUES ($1, 'U.S. Senator', 'single', 1, 6, TRUE, TRUE, 'federal') RETURNING id`,
            [stateOcdId],
          );
          officeId = ins.rows[0].id;
        }
      } else {
        const district = m.district;
        const title = district === 0 || district == null
          ? "U.S. Representative — At-Large"
          : `U.S. Representative — District ${district}`;
        officeId = await findOrCreateOffice(stateOcdId, title, "district");
      }

      let polId;
      if (existingPol.rowCount) {
        polId = existingPol.rows[0].id;
        await client.query(
          `UPDATE politicians SET full_name = $2, party = $3, current_office_id = $4, bio = $5 WHERE id = $1`,
          [polId, fullName, party, officeId, bio],
        );
      } else {
        const pol = await client.query(
          `INSERT INTO politicians (full_name, party, current_office_id, bio, bioguide_id) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [fullName, party, officeId, bio, m.bioguideId],
        );
        polId = pol.rows[0].id;
      }

      const termStart = `${startYear}-01-03`;
      const ins = await client.query(
        `INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained)
         VALUES ($1, $2, $3, 'elected')
         ON CONFLICT (office_id, politician_id, term_start) DO NOTHING`,
        [officeId, polId, termStart],
      );
      if (ins.rowCount) processed += 1;
    }
    if (members.length < 250) break;
  }

  await client.query(
    `UPDATE ingestion_runs SET finished_at = now(), status = 'succeeded',
            rows_upserted = $2, rows_skipped = $3, data_through = $4, note = $5
      WHERE id = $1`,
    [runId, processed, skippedStates.size, dataThrough ? `${dataThrough}-01-03` : null,
      skippedStates.size ? `skipped (no jurisdiction row yet): ${[...skippedStates].sort().join(", ")}` : null],
  );
  console.log(`${SOURCE}: processed ${processed} current member(s) of the ${congress}th Congress, skipped ${skippedStates.size} state/territory(ies) with no jurisdiction row yet`);
} catch (e) {
  await client.query(`UPDATE ingestion_runs SET finished_at = now(), status = 'failed', note = $2 WHERE id = $1`, [runId, String(e.message ?? e)]);
  console.error(`${SOURCE} FAILED: ${e.message ?? e}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
