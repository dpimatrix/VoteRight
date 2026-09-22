#!/usr/bin/env node
// U.S. Senate roll-call votes (docs/DATA-OPS.md D2/Section 8, sibling to
// congress-votes.mjs's House ingester). Closes the Senate half of the gap
// congress-votes.mjs's own header disclosed: api.congress.gov has no
// senate-vote resource (confirmed live -- "Unknown resource: senate-vote").
// The Senate's own real source is its Legislative Information System XML
// feed at senate.gov -- a genuinely different source and shape, not a
// filter change on the House endpoint, which is why this is its own file
// rather than a --chamber flag on congress-votes.mjs.
//
// Source, verified live 2026-09-22 by pulling the raw XML directly (not an
// AI-summarized fetch -- this project's own established discipline after a
// past incident where a summarized fetch hallucinated a data point):
//   List:   https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_{congress}_{session}.xml
//   Detail: https://www.senate.gov/legislative/LIS/roll_call_votes/vote{congress}{session}/vote_{congress}_{session}_{voteNumber, zero-padded to 5}.xml
// No API key needed (public XML, no auth).
//
// No XML parser is an existing dependency anywhere in this project, and
// this feed's structure is flat/well-formed enough (government-published,
// consistent tag names, no attributes-on-value-tags, no CDATA) that a
// small regex extractor is safer to maintain here than adding one --
// same zero-dependency-by-default posture as every other ingester (the one
// deliberate exception, pdf-parse, was justified because PDFs are commonly
// compressed; this plain XML isn't).
//
// Real difference from congress-votes.mjs's House ingester: the Senate
// feed has NO bioguide_id at all -- only lis_member_id (the Senate's own
// internal id), name, party, state. Matched on (last name, state) instead
// -- unlike votes.mjs's nationwide flat-name match (guarded against real
// collisions across unrelated politicians), Senate has exactly 2 seats per
// state, so a same-state same-last-name collision is a near-impossible
// coincidence, guarded the same defensive way regardless (throw rather
// than silently pick one).
//
// Idempotent via voting_records' UNIQUE(politician_id, bill_external_id);
// bill_external_id here is "senate-roll-{congress}-{session}-{voteNumber}".
// Incremental: the list file has no date filter, so it's always fetched in
// full (cheap, one file per session, ~100-700 entries) and only vote
// numbers not already the max-ingested-or-higher get their detail XML
// fetched -- same "list is cheap, detail is the real cost" two-phase shape
// as congress-votes.mjs.
//
// Usage: node db/ingest/senate-votes.mjs [--full] [--congress=119] [--sessions=1,2] [--url=<postgres url>]
import { createRequire } from "node:module";
const require = createRequire(new URL("../../app/package.json", import.meta.url));
const { Client } = require("pg");

const SOURCE = "senate-votes";
const JURISDICTION = "ocd-division/country:us";

const args = process.argv.slice(2);
const full = args.includes("--full");
const congress = args.find((a) => a.startsWith("--congress="))?.slice(11) ?? "119";
const sessions = (args.find((a) => a.startsWith("--sessions="))?.slice(11) ?? "1,2").split(",");
const url = args.find((a) => a.startsWith("--url="))?.slice(6) ?? process.env.DATABASE_URL ?? "postgres://postgres:vr@localhost:5433/voteright";

async function fetchWithRetry(u, attempts = 5) {
  for (let i = 1; i <= attempts; i += 1) {
    try {
      const res = await fetch(u, { signal: AbortSignal.timeout(30000) });
      if (res.status === 429) throw Object.assign(new Error("429"), { rateLimited: true });
      if (res.status === 404) return null; // a session with no data yet (e.g. session 2 before it starts) -- not an error
      if (!res.ok) throw new Error(`${res.status}`);
      return await res.text();
    } catch (e) {
      if (i === attempts) throw e;
      const wait = e.rateLimited ? 10000 * i : 1500 * i;
      console.error(`  (retry ${i}/${attempts - 1} after ${e.message} -- waiting ${wait}ms)`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

// Minimal, deliberately narrow regex extraction -- only the specific
// flat <tag>value</tag> pairs this feed actually uses, not a general XML
// parser. Non-greedy, single-line (this feed never wraps a leaf value
// across lines in practice, confirmed against the real raw file).
function tag(xml, name) {
  const m = xml.match(new RegExp(`<${name}>([^<]*)<\\/${name}>`));
  return m ? decodeEntities(m[1].trim()) : null;
}
function decodeEntities(s) {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}
function extractVoteNumbers(listXml) {
  return [...listXml.matchAll(/<vote_number>(\d+)<\/vote_number>/g)].map((m) => parseInt(m[1], 10));
}
function extractMembers(detailXml) {
  return [...detailXml.matchAll(/<member>([\s\S]*?)<\/member>/g)].map((m) => {
    const block = m[1];
    return {
      lastName: tag(block, "last_name"),
      state: tag(block, "state"),
      voteCast: tag(block, "vote_cast"),
      lisMemberId: tag(block, "lis_member_id"),
    };
  });
}

const MONTHS = { January: "01", February: "02", March: "03", April: "04", May: "05", June: "06", July: "07", August: "08", September: "09", October: "10", November: "11", December: "12" };
// "December 18, 2025,  09:42 PM" -> "2025-12-18". Built from named parts,
// not Date parsing -- new Date("December 18, 2025") is ambiguous between
// local-time and UTC midnight depending on the JS engine/server timezone
// (the same class of footgun this project's own comments already flag
// elsewhere for node-postgres DATE columns), so this avoids it entirely
// rather than risk an off-by-one-day date.
function parseVoteDate(s) {
  const m = s?.match(/^(\w+) (\d+), (\d+)/);
  if (!m || !MONTHS[m[1]]) return null;
  return `${m[3]}-${MONTHS[m[1]]}-${m[2].padStart(2, "0")}`;
}

// Same Clerk-style vocabulary as the House feed, confirmed live against a
// real roll call (Yea/Nay/Not Voting seen directly); Present/Absent handled
// defensively though not yet observed live. Anything else is genuinely new
// and gets skipped + counted, never guessed.
const VOTE_MAP = { Yea: "yea", Nay: "nay", Present: "abstain", "Not Voting": "absent", Absent: "absent" };

const SUFFIX_RE = /^(Jr\.?|Sr\.?|II|III|IV|V)$/i;
const stripAccents = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
function lastNameKey(fullName) {
  const parts = fullName.trim().split(/\s+/);
  while (parts.length > 1 && SUFFIX_RE.test(parts.at(-1))) parts.pop();
  return stripAccents(parts.at(-1)).toLowerCase();
}

const client = new Client({ connectionString: url });
await client.connect();
const run = await client.query(`INSERT INTO ingestion_runs (source) VALUES ($1) RETURNING id`, [SOURCE]);
const runId = run.rows[0].id;

try {
  // (last name, state) -> politician id, scoped to CURRENT U.S. Senators
  // only. Guards the same real-collision class votes.mjs already guards
  // against (two current senators from the same state sharing a last
  // name) -- vanishingly unlikely with only 100 seats, but refused rather
  // than silently miscoded if it ever happens.
  const pols = await client.query(
    `SELECT DISTINCT p.id, p.full_name, right(o.jurisdiction_id, 2) AS state
       FROM politicians p
       JOIN office_terms ot ON ot.politician_id = p.id AND ot.term_end IS NULL
       JOIN offices o ON o.id = ot.office_id
      WHERE o.title = 'U.S. Senator'`,
  );
  const byKey = new Map();
  for (const p of pols.rows) {
    const key = `${lastNameKey(p.full_name)}|${p.state.toUpperCase()}`;
    if (byKey.has(key)) throw new Error(`ambiguous (last name, state) in Senate roster: ${key}`);
    byKey.set(key, p.id);
  }

  let sinceVoteByCongress = new Map();
  if (!full) {
    const { rows } = await client.query(
      `SELECT bill_external_id FROM voting_records
        WHERE jurisdiction_id = $1 AND bill_external_id LIKE 'senate-roll-%'`,
      [JURISDICTION],
    );
    for (const r of rows.rows ?? rows) {
      const m = r.bill_external_id.match(/^senate-roll-(\d+)-(\d+)-(\d+)$/);
      if (!m) continue;
      const key = `${m[1]}-${m[2]}`;
      const n = parseInt(m[3], 10);
      sinceVoteByCongress.set(key, Math.max(sinceVoteByCongress.get(key) ?? 0, n));
    }
  }

  let upserted = 0;
  let skippedVotesNoMembers = 0;
  const skippedKeys = new Set();
  const skippedVoteCasts = new Set();
  let dataThrough = null;

  for (const session of sessions) {
    const listXml = await fetchWithRetry(
      `https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_${congress}_${session}.xml`,
    );
    if (!listXml) continue; // session doesn't exist yet (e.g. future session) -- not an error
    const voteNumbers = extractVoteNumbers(listXml);
    const minVote = sinceVoteByCongress.get(`${congress}-${session}`) ?? 0;
    // -1: re-fetch the last-ingested vote too, in case it was only
    // partially ingested by an interrupted prior run (ON CONFLICT DO
    // NOTHING makes this a safe no-op for anything already correct).
    const toFetch = full ? voteNumbers : voteNumbers.filter((n) => n >= minVote - 1);

    for (const voteNumber of toFetch) {
      const padded = String(voteNumber).padStart(5, "0");
      const detailXml = await fetchWithRetry(
        `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${congress}${session}/vote_${congress}_${session}_${padded}.xml`,
      );
      if (!detailXml) continue;
      const members = extractMembers(detailXml);
      if (members.length === 0) {
        skippedVotesNoMembers += 1;
        continue;
      }
      const votedAt = parseVoteDate(tag(detailXml, "vote_date"));
      if (!votedAt) continue; // malformed date -- skip this one vote, never guess
      if (!dataThrough || votedAt > dataThrough) dataThrough = votedAt;
      const docName = tag(detailXml, "document_name");
      const title = (docName ? `${docName}: ${tag(detailXml, "vote_document_text") ?? tag(detailXml, "vote_title")}` : (tag(detailXml, "vote_title") ?? "(untitled)")).slice(0, 500);
      const rollId = `senate-roll-${congress}-${session}-${voteNumber}`;
      const sourceUrl = `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${congress}${session}/vote_${congress}_${session}_${padded}.htm`;

      for (const m of members) {
        if (!m.lastName || !m.state || !m.voteCast) continue;
        const key = `${lastNameKey(m.lastName)}|${m.state.toUpperCase()}`;
        const polId = byKey.get(key);
        if (!polId) {
          skippedKeys.add(key);
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
  }

  const notes = [];
  if (skippedVotesNoMembers) notes.push(`${skippedVotesNoMembers} roll call(s) with no member list, skipped`);
  if (skippedKeys.size) notes.push(`${skippedKeys.size} unmapped (name,state) key(s) (not in current roster): ${[...skippedKeys].sort().slice(0, 20).join(", ")}${skippedKeys.size > 20 ? "…" : ""}`);
  if (skippedVoteCasts.size) notes.push(`unrecognized voteCast value(s), skipped: ${[...skippedVoteCasts].join(", ")}`);

  await client.query(
    `UPDATE ingestion_runs SET finished_at = now(), status = 'succeeded',
            rows_upserted = $2, rows_skipped = $3, data_through = $4, note = $5
      WHERE id = $1`,
    [runId, upserted, skippedKeys.size + skippedVoteCasts.size, dataThrough, notes.join("; ") || null],
  );
  console.log(`${SOURCE}: upserted ${upserted} vote(s), data through ${dataThrough ?? "n/a"}`);
  if (notes.length) console.log(`  notes: ${notes.join("; ")}`);
} catch (e) {
  await client.query(`UPDATE ingestion_runs SET finished_at = now(), status = 'failed', note = $2 WHERE id = $1`, [runId, String(e.message ?? e)]);
  console.error(`${SOURCE} FAILED: ${e.message ?? e}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
