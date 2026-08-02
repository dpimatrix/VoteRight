#!/usr/bin/env node
// D-series ingester: D.C. Council legislation introducers/co-introducers.
//
// Source: lims.dccouncil.gov's own unauthenticated search API -- the
// documented, versioned Swagger API at /api-docs/v2.0/swagger.json exists
// but its /api/v2/PublicData/* endpoints require a registered token; the
// endpoints the live site itself actually calls (found by watching real
// browser network traffic via puppeteer-core, not by guessing URLs) need no
// auth at all and are confirmed callable via plain HTTP: POST
// /api/Search/SearchResult (paginated legislation search) and GET
// /api/Search/GetLegislationDetails/{legislationNumber} (clean structured
// introducer/co-introducer data -- verified live: "Introduced by
// Councilmember Felder / Co-Introduced by Councilmembers Pinto, Bonds, and
// Frumin" on a real bill, every name matching the seeded roster). D.C.
// Council genuinely sponsors/co-sponsors bills like a legislature (unlike
// Virginia's boards), so introducer/co-introducer map directly onto the
// existing lead_sponsor/co_sponsor roles -- no schema change needed.
//
// The search endpoint's own inline coIntroducers/coSponsors fields were
// observed null even on bills whose detail page shows real co-introducers,
// so this ingester always makes the second GetLegislationDetails call
// rather than trusting the list endpoint's inline fields (same reason
// council-sponsorships-pg.mjs fetches /Sponsors separately per matter).
//
// No video correlation: D.C. Council's video lives on YouTube, not
// Granicus, and has no equivalent of the other four jurisdictions' free
// unauthenticated captions/date-correlation trick. video_url falls back to
// the bill's own real, working LIMS detail page -- an honest citation, not
// a placeholder, matching the same fallback already used for Prince
// George's/Fairfax/Arlington rows with no clip match.
//
// Name resolution is last-name + first-initial, not last name alone: D.C.'s
// real roster has a genuine same-jurisdiction collision (Robert C. White
// Jr., at-large, and Trayon White Sr., Ward 8, both current) that the other
// four jurisdictions don't have -- LIMS names are given as "Last, First",
// which makes this disambiguation straightforward rather than a guess.
//
// Idempotent by construction: council_sponsorships has
// UNIQUE(politician_id, agenda_item_external_id) keyed on the bill number.
// Unmapped real names are collected and reported via `note`, never guessed.
//
// Usage: node db/ingest/council-sponsorships-dc.mjs --since=YYYY-MM-DD [--url=<postgres url>]
// Scheduling: .github/workflows/ingest.yml.

import { createRequire } from "node:module";
const require = createRequire(new URL("../../app/package.json", import.meta.url));
const { Client } = require("pg");

const SOURCE = "dc-legislation-items";
const COUNTY = "ocd-division/country:us/district:dc";
const LIMS = "https://lims.dccouncil.gov";
const BILL_CATEGORY_ID = 1;
const PAGE_SIZE = 25;

const args = process.argv.slice(2);
const since = args.find((a) => a.startsWith("--since="))?.slice(8);
const url = args.find((a) => a.startsWith("--url="))?.slice(6) ?? process.env.DATABASE_URL ?? "postgres://postgres:vr@localhost:5433/voteright";

const stripAccents = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const SUFFIX_RE = /^(Jr\.?|Sr\.?|II|III|IV|V)$/i;

function lastNameOnly(fullName) {
  const parts = fullName.trim().split(/\s+/);
  while (parts.length > 1 && SUFFIX_RE.test(parts.at(-1))) parts.pop();
  return stripAccents(parts.at(-1)).toLowerCase();
}
// Last name + first initial, not last name alone -- required because D.C.'s
// real roster has a genuine collision the other jurisdictions don't have.
// Lead introducers always come with a full "Last, First" name from LIMS, so
// this precise key applies there. Co-introducers are only ever available as
// last-name-only link text (see coNames below) -- those resolve through
// byLastOnly instead, which reports (never guesses) when a last name is
// itself ambiguous within the roster.
function rosterKey(fullName) {
  const parts = fullName.trim().split(/\s+/);
  while (parts.length > 1 && SUFFIX_RE.test(parts.at(-1))) parts.pop();
  const first = stripAccents(parts[0]).toLowerCase()[0];
  return `${lastNameOnly(fullName)}|${first}`;
}
// LIMS gives "Last, First" (sometimes with stray trailing whitespace, e.g.
// "Crawford, Doni "). Compound last names (e.g. "Lewis George, Janeese")
// must reduce the same way rosterKey/lastNameOnly reduce the roster's own
// "Janeese Lewis George" -- to the final whitespace-separated token -- or
// the two sides never match; verified live, this real person was silently
// unmapped before this fix.
function limsKey(limsName) {
  const [lastRaw, first] = limsName.split(",").map((s) => s.trim());
  if (!lastRaw || !first) return null;
  const last = stripAccents(lastRaw.trim().split(/\s+/).at(-1)).toLowerCase();
  return `${last}|${stripAccents(first).toLowerCase()[0]}`;
}

const emptyFilter = (idName, name) => ({ groupFilterIdName: idName, groupFilterName: name, ids: [], names: [], isFocus: false });

async function fetchSearchPage(pageIndex) {
  const body = {
    searchString: "",
    councilPeriodId: emptyFilter("councilPeriodId", "councilPeriod"),
    legislationCategoryId: { ...emptyFilter("legislationCategoryId", "legislationCategory"), ids: [BILL_CATEGORY_ID] },
    legislationSubCategoryId: emptyFilter("legislationSubCategoryId", "legislationSubCategory"),
    requestorId: emptyFilter("requestorId", "requestor"),
    statusId: emptyFilter("statusId", "status"),
    introducer: emptyFilter("introducers.id", "introducers.name"),
    coSponsor: emptyFilter("cosponsors.id", "cosponsors.name"),
    referredToCommitteeId: emptyFilter("referredToCommittees.id", "referredToCommittees.name"),
    referredToCommittee_w_CommentsId: emptyFilter("referredToCommittee_w_Comments.id", "referredToCommittee_w_Comments.name"),
    isSignedByMayor: null,
    pagination: { pageSize: PAGE_SIZE, pageIndex, totalCount: 0 },
    sort: { sortById: 1, isAscending: false }, // introduction date, descending
    searchResults: { results: [] },
  };
  const res = await fetch(`${LIMS}/api/Search/SearchResult`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`lims search page ${pageIndex} ${res.status}`);
  return res.json();
}

async function fetchDetail(legislationNumber) {
  const res = await fetch(`${LIMS}/api/Search/GetLegislationDetails/${encodeURIComponent(legislationNumber)}`, {
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`lims detail ${legislationNumber} ${res.status}`);
  return res.json();
}

const client = new Client({ connectionString: url });
await client.connect();
const run = await client.query(`INSERT INTO ingestion_runs (source) VALUES ($1) RETURNING id`, [SOURCE]);
const runId = run.rows[0].id;

try {
  const pols = await client.query(
    `SELECT DISTINCT p.id, p.full_name FROM politicians p
       JOIN office_terms ot ON ot.politician_id = p.id
       JOIN offices o ON o.id = ot.office_id
      WHERE o.jurisdiction_id = $1`,
    [COUNTY],
  );
  const byKey = new Map();
  const byLastOnly = new Map(); // lastname -> politician_id, or "AMBIGUOUS" sentinel
  const AMBIGUOUS = Symbol("ambiguous");
  for (const p of pols.rows) {
    const key = rosterKey(p.full_name);
    if (byKey.has(key)) throw new Error(`ambiguous last name + initial in roster: ${key}`);
    byKey.set(key, p.id);
    const last = lastNameOnly(p.full_name);
    byLastOnly.set(last, byLastOnly.has(last) ? AMBIGUOUS : p.id);
  }

  let cutoff = since;
  if (!cutoff) {
    const { rows } = await client.query(
      `SELECT (max(meeting_date) - interval '14 days')::date::text AS cutoff
         FROM council_sponsorships WHERE jurisdiction_id = $1`,
      [COUNTY],
    );
    cutoff = rows[0]?.cutoff;
    if (!cutoff) throw new Error("no existing rows and no --since given — pass --since=YYYY-MM-DD to size the first backfill deliberately");
  }

  const bills = [];
  let pastCutoff = false;
  for (let pageIndex = 0; !pastCutoff; pageIndex++) {
    const page = await fetchSearchPage(pageIndex);
    const results = page.searchResults?.results ?? [];
    if (results.length === 0) break;
    for (const r of results) {
      const isoDate = r.introductionDate?.slice(0, 10);
      if (isoDate && isoDate < cutoff) { pastCutoff = true; break; }
      bills.push(r.legislationNumber);
    }
    if (results.length < PAGE_SIZE) break;
  }

  let upserted = 0;
  const skippedNames = new Set();
  let dataThrough = null;

  for (const legislationNumber of bills) {
    const detail = await fetchDetail(legislationNumber);
    const introEvent = detail.legislationHistory?.find((h) => h.type === "Introduction");
    const isoDate = introEvent?.sortDate?.slice(0, 10);
    if (!isoDate) { skippedNames.add(`(${legislationNumber}: no introduction date, skipped)`); continue; }
    if (!dataThrough || isoDate > dataThrough) dataThrough = isoDate;

    const introducers = introEvent?.data?.introducers ?? [];
    // Co-introducer names are only reliably available as linked HTML in
    // introducerSummary ("Councilmembers <a>Pinto</a>, <a>Bonds</a>, and
    // <a>Frumin</a>") -- verified live against a real bill -- rather than a
    // clean array anywhere else in the response; extract from anchor text.
    const coEntry = detail.introducerSummary?.summaryDataList?.find((s) => /co-introduced/i.test(s.label ?? ""));
    const coNames = coEntry?.content ? [...coEntry.content.matchAll(/<a[^>]*>([^<]+)<\/a>/g)].map((m) => m[1].trim()) : [];

    const staffReportUrl = introEvent?.actionURL ? `${LIMS}${introEvent.actionURL}` : null;
    const videoUrl = `${LIMS}/Legislation/${legislationNumber}`;
    const title = (detail.title ?? "(untitled)").slice(0, 500);

    // Lead introducers carry a full "Last, First" name -> precise
    // last+initial match. Co-introducers are link text, usually last-name
    // only -> resolve when that last name is unambiguous in the roster. When
    // a last name IS ambiguous (e.g. "White"), LIMS itself already
    // disambiguates by rendering "T. White" / "R. White" instead of the bare
    // surname -- verified live (Trayon White, introducerDetail id 201, shows
    // as "T. White" in every co-introducer list checked) -- so that initial
    // form gets the same precise match lead introducers use, and only a
    // bare, still-ambiguous surname is reported rather than guessed.
    const INITIAL_PREFIX_RE = /^([A-Za-z])\.\s+(.+)$/;
    const sponsors = [
      ...introducers.map((i) => ({ role: "lead_sponsor", precise: i.name })),
      ...coNames.map((n) => ({ role: "co_sponsor", coName: n })),
    ];
    for (const { role, precise, coName } of sponsors) {
      const label = precise ?? coName;
      let polId = null;
      const initialMatch = coName?.match(INITIAL_PREFIX_RE);
      if (precise) {
        const key = limsKey(precise);
        polId = key ? byKey.get(key) : null;
      } else if (initialMatch) {
        const [, initial, last] = initialMatch;
        const key = `${lastNameOnly(last)}|${initial.toLowerCase()}`;
        polId = byKey.get(key) ?? null;
      } else {
        const match = byLastOnly.get(lastNameOnly(coName));
        polId = match === AMBIGUOUS ? null : (match ?? null);
      }
      if (!polId) {
        skippedNames.add(label);
        continue;
      }
      const ins = await client.query(
        `INSERT INTO council_sponsorships
           (politician_id, jurisdiction_id, role, clip_id, agenda_item_external_id, meeting_date, item_title, video_url, staff_report_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (politician_id, agenda_item_external_id) DO NOTHING`,
        [polId, COUNTY, role, "unresolved", legislationNumber, isoDate, title, videoUrl, staffReportUrl],
      );
      upserted += ins.rowCount ?? 0;
    }
  }

  await client.query(
    `UPDATE ingestion_runs SET finished_at = now(), status = 'succeeded',
            rows_upserted = $2, rows_skipped = $3, data_through = $4, note = $5
      WHERE id = $1`,
    [runId, upserted, skippedNames.size, dataThrough, skippedNames.size ? `unmapped/skipped: ${[...skippedNames].sort().join(", ")}` : null],
  );
  console.log(`${SOURCE}: upserted ${upserted} sponsorship(s) across ${bills.length} bill(s), data through ${dataThrough ?? "n/a"}, ${skippedNames.size} unmapped/skipped`);
} catch (e) {
  await client.query(`UPDATE ingestion_runs SET finished_at = now(), status = 'failed', note = $2 WHERE id = $1`, [runId, String(e.message ?? e)]);
  console.error(`${SOURCE} FAILED: ${e.message ?? e}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
