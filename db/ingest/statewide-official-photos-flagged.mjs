#!/usr/bin/env node
// Human-review companion to statewide-official-photos.mjs -- READ ONLY, never
// writes photo_url or downloads anything. That script's cross-check (name
// match AND the person's real Wikidata "position held" contains the exact
// office+state) is the right default -- it's the whole "never guess" design
// this project holds to -- but a live investigation (2026-08-15) of two of
// its "no Wikidata match" cases found the cross-check itself working
// correctly while Wikidata's underlying data for this tier just isn't
// complete enough to satisfy it as often as it was for governors:
//   - Derek Brown (Attorney General of Utah): a Wikidata item named exactly
//     "Derek Brown" exists with a photo, but its only recorded position is
//     "member of the Utah House of Representatives" -- querying Wikidata for
//     EVERYONE it has ever recorded holding "Attorney General of Utah"
//     returns exactly one name, a former AG from decades ago. The real
//     current officeholder isn't in Wikidata's position-held data at all.
//   - Allison Ball (State Auditor of Kentucky): has a Wikidata item WITH a
//     usable photo, but zero position-held statements whatsoever. The strict
//     script correctly declined to use it -- it just can't verify it.
// This script re-runs the lookup WITHOUT the position requirement -- name
// match (+ "instance of: human", a cheap guard against a same-named
// non-person item) plus any photo -- and only ever PRINTS candidates for a
// human to visually confirm (open the Wikidata item, open the photo, check
// it's really the right person) before anyone applies one via
// apply-flagged-photo.mjs <politician_id>. If a name matches more than one
// distinct Wikidata person, it's flagged ambiguous and skipped outright --
// picking one arbitrarily would be exactly the kind of guess this project
// doesn't make.
//
// Usage: node db/ingest/statewide-official-photos-flagged.mjs [--url=<postgres url>]

import { createRequire } from "node:module";
const require = createRequire(new URL("../../app/package.json", import.meta.url));
const { Client } = require("pg");

const USER_AGENT = "VoteRight-civic-data-ingester/1.0 (https://voteright.dpimatrix.com; contact via repo)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const url = process.argv.slice(2).find((a) => a.startsWith("--url="))?.slice(6)
  ?? process.env.DATABASE_URL ?? "postgres://postgres:vr@localhost:5433/voteright";

// Same TIERS/STATE_NAME as statewide-official-photos.mjs -- duplicated
// rather than imported, since that script runs its whole pipeline at module
// load (not written as an importable library) and this is a small, stable,
// rarely-touched config either way.
const STATE_NAME = {
  al: "Alabama", ak: "Alaska", az: "Arizona", ar: "Arkansas", ca: "California",
  co: "Colorado", ct: "Connecticut", de: "Delaware", fl: "Florida", ga: "Georgia",
  hi: "Hawaii", id: "Idaho", il: "Illinois", in: "Indiana", ia: "Iowa",
  ks: "Kansas", ky: "Kentucky", la: "Louisiana", me: "Maine", md: "Maryland",
  ma: "Massachusetts", mi: "Michigan", mn: "Minnesota", ms: "Mississippi", mo: "Missouri",
  mt: "Montana", ne: "Nebraska", nv: "Nevada", nh: "New Hampshire", nj: "New Jersey",
  nm: "New Mexico", ny: "New York", nc: "North Carolina", nd: "North Dakota", oh: "Ohio",
  ok: "Oklahoma", or: "Oregon", pa: "Pennsylvania", ri: "Rhode Island", sc: "South Carolina",
  sd: "South Dakota", tn: "Tennessee", tx: "Texas", ut: "Utah", vt: "Vermont",
  va: "Virginia", wa: "Washington", wv: "West Virginia", wi: "Wisconsin", wy: "Wyoming",
};
const TIERS = [
  { titles: ["Governor"], slug: "gov" },
  { titles: ["Lieutenant Governor"], slug: "ltgov" },
  { titles: ["Attorney General"], slug: "ag" },
  { titles: ["Secretary of State"], slug: "sos" },
  { titles: ["Treasurer"], slug: "treasurer" },
  { titles: ["Controller"], slug: "comptroller" },
  { titles: ["Auditor"], slug: "auditor" },
];

async function wikidataAnyPhoto(fullName, attempt = 1) {
  try {
    const escapedName = fullName.replace(/"/g, '\\"');
    // No position filter at all -- deliberately looser than the strict
    // script. wdt:P31 wd:Q5 ("instance of: human") is a cheap guard against
    // a same-named non-person item (a place, org, etc.) sharing the label.
    const query = `SELECT ?person ?image WHERE {
      ?person rdfs:label "${escapedName}"@en.
      ?person wdt:P31 wd:Q5.
      ?person wdt:P18 ?image.
    } LIMIT 5`;
    const u = new URL("https://query.wikidata.org/sparql");
    u.searchParams.set("query", query);
    u.searchParams.set("format", "json");
    const res = await fetch(u, {
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(15000),
    });
    if ((res.status === 429 || res.status === 502) && attempt <= 3) {
      const retryAfterMs = Number(res.headers.get("retry-after")) * 1000 || 2 ** attempt * 1000;
      console.warn(`wikidata lookup for ${fullName}: HTTP ${res.status}, retrying in ${retryAfterMs}ms (attempt ${attempt})`);
      await sleep(retryAfterMs);
      return wikidataAnyPhoto(fullName, attempt + 1);
    }
    if (!res.ok) {
      console.warn(`wikidata lookup for ${fullName}: HTTP ${res.status}`);
      return { candidates: [] };
    }
    const data = await res.json();
    const bindings = data.results?.bindings ?? [];
    // Distinct PEOPLE, not distinct rows -- SPARQL can return the same
    // person more than once if they have multiple P18 values.
    const byPerson = new Map();
    for (const b of bindings) {
      const personUri = b.person?.value;
      const imageUri = b.image?.value;
      if (!personUri || !imageUri || byPerson.has(personUri)) continue;
      byPerson.set(personUri, imageUri);
    }
    return { candidates: [...byPerson.entries()].map(([person, image]) => ({ person, image })) };
  } catch (e) {
    if (attempt <= 3) {
      const retryMs = 2 ** attempt * 1000;
      console.warn(`wikidata lookup for ${fullName} threw: ${e.message ?? e}, retrying in ${retryMs}ms (attempt ${attempt})`);
      await sleep(retryMs);
      return wikidataAnyPhoto(fullName, attempt + 1);
    }
    console.warn(`wikidata lookup for ${fullName} threw: ${e.message ?? e}`);
    return { candidates: [] };
  }
}

const client = new Client({ connectionString: url });
await client.connect();
try {
  const allTitles = TIERS.flatMap((t) => t.titles);
  const { rows } = await client.query(
    `SELECT p.id, p.full_name, o.title, o.jurisdiction_id
       FROM politicians p JOIN offices o ON o.id = p.current_office_id
      WHERE o.title = ANY($1) AND o.level = 'state' AND p.photo_url IS NULL
      ORDER BY o.title, o.jurisdiction_id`,
    [allTitles],
  );

  const stats = { flagged: 0, ambiguous: 0, none: 0, unknownState: 0 };
  for (const row of rows) {
    const stateSlug = row.jurisdiction_id.split(":").pop();
    const stateName = STATE_NAME[stateSlug];
    if (!stateName) {
      stats.unknownState += 1;
      continue;
    }
    const { candidates } = await wikidataAnyPhoto(row.full_name);
    if (candidates.length === 0) {
      stats.none += 1;
    } else if (candidates.length > 1) {
      stats.ambiguous += 1;
      console.log(`AMBIGUOUS  ${row.full_name} (${row.title}, ${stateName}) -- ${candidates.length} distinct Wikidata people share this name, skipped`);
    } else {
      stats.flagged += 1;
      const qid = candidates[0].person.split("/").pop();
      const imgUrl = new URL(candidates[0].image.replace(/^http:/, "https:"));
      imgUrl.searchParams.set("width", "200");
      console.log(
        `CANDIDATE  ${row.full_name} (${row.title}, ${stateName})\n` +
          `           politician_id: ${row.id}\n` +
          `           wikidata item: https://www.wikidata.org/wiki/${qid}\n` +
          `           photo:         ${imgUrl.toString()}\n` +
          `           if confirmed:  node db/ingest/apply-flagged-photo.mjs ${row.id}`,
      );
    }
    await sleep(500);
  }

  console.log(
    `statewide-official-photos-flagged: ${stats.flagged} candidate(s) to review, ${stats.ambiguous} ambiguous (skipped), ` +
      `${stats.none} genuinely no Wikidata photo, ${stats.unknownState} unknown state`,
  );
} finally {
  await client.end();
}
