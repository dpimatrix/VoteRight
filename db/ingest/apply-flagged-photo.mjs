#!/usr/bin/env node
// Applies a photo for a politician flagged by statewide-official-photos-flagged.mjs
// -- ONLY ever acts on politician_ids explicitly passed as arguments. Nothing
// here scans or auto-selects anyone; a human already opened the Wikidata item
// and the photo printed by the flagged scan and confirmed it's really the
// right person before running this. Re-runs the same unverified lookup
// fresh (rather than trusting a URL pasted on the command line) so the
// applied photo matches what's actually on Wikidata right now, then
// downloads/converts/saves exactly like statewide-official-photos.mjs's own
// downloadPhoto -- same webp conversion, same slug convention, same
// ingestion_runs logging. Skips (does not overwrite) anyone who already has
// a photo_url, in case a normal ingester run already covered them since the
// scan was done.
//
// Usage: node db/ingest/apply-flagged-photo.mjs <politician_id> [<politician_id> ...] [--url=<postgres url>]

import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(new URL("../../app/package.json", import.meta.url));
const { Client } = require("pg");
const sharp = require("sharp");

const PHOTO_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "app", "public", "politicians");
const USER_AGENT = "VoteRight-civic-data-ingester/1.0 (https://voteright.dpimatrix.com; contact via repo)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const args = process.argv.slice(2);
const url = args.find((a) => a.startsWith("--url="))?.slice(6) ?? process.env.DATABASE_URL ?? "postgres://postgres:vr@localhost:5433/voteright";
const ids = args.filter((a) => !a.startsWith("--url="));
if (ids.length === 0) {
  console.error("Usage: node db/ingest/apply-flagged-photo.mjs <politician_id> [<politician_id> ...]");
  process.exit(1);
}

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
const TIER_SLUG = {
  Governor: "gov", "Lieutenant Governor": "ltgov", "Attorney General": "ag",
  "Secretary of State": "sos", Treasurer: "treasurer", Controller: "comptroller", Auditor: "auditor",
};

async function wikidataAnyPhoto(fullName, attempt = 1) {
  const escapedName = fullName.replace(/"/g, '\\"');
  const query = `SELECT ?person ?image WHERE {
    ?person rdfs:label "${escapedName}"@en.
    ?person wdt:P31 wd:Q5.
    ?person wdt:P18 ?image.
  } LIMIT 5`;
  const u = new URL("https://query.wikidata.org/sparql");
  u.searchParams.set("query", query);
  u.searchParams.set("format", "json");
  const res = await fetch(u, { headers: { Accept: "application/json", "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(15000) });
  if ((res.status === 429 || res.status === 502) && attempt <= 3) {
    const retryAfterMs = Number(res.headers.get("retry-after")) * 1000 || 2 ** attempt * 1000;
    console.warn(`wikidata lookup for ${fullName}: HTTP ${res.status}, retrying in ${retryAfterMs}ms (attempt ${attempt})`);
    await sleep(retryAfterMs);
    return wikidataAnyPhoto(fullName, attempt + 1);
  }
  if (!res.ok) return [];
  const data = await res.json();
  const byPerson = new Map();
  for (const b of data.results?.bindings ?? []) {
    if (b.person?.value && b.image?.value && !byPerson.has(b.person.value)) byPerson.set(b.person.value, b.image.value);
  }
  return [...byPerson.entries()].map(([person, image]) => ({ person, image }));
}

async function downloadPhoto(slug, commonsUrl, attempt = 1) {
  const filename = `${slug}.webp`;
  const diskPath = path.join(PHOTO_DIR, filename);
  try {
    const res = await fetch(commonsUrl, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(10000) });
    if (res.status === 429 && attempt <= 3) {
      const retryAfterMs = Number(res.headers.get("retry-after")) * 1000 || 2 ** attempt * 1000;
      console.warn(`photo download for ${slug}: HTTP 429, retrying in ${retryAfterMs}ms (attempt ${attempt})`);
      await sleep(retryAfterMs);
      return downloadPhoto(slug, commonsUrl, attempt + 1);
    }
    if (!res.ok) {
      console.warn(`photo download for ${slug}: HTTP ${res.status} from ${commonsUrl}`);
      return null;
    }
    const sourceBytes = Buffer.from(await res.arrayBuffer());
    const webpBytes = await sharp(sourceBytes).webp({ quality: 80 }).toBuffer();
    await mkdir(PHOTO_DIR, { recursive: true });
    await writeFile(diskPath, webpBytes);
    return `/politicians/${filename}`;
  } catch (e) {
    console.warn(`photo download for ${slug} threw: ${e.message ?? e}`);
    return null;
  }
}

const client = new Client({ connectionString: url });
await client.connect();
const run = await client.query(`INSERT INTO ingestion_runs (source) VALUES ($1) RETURNING id`, ["statewide-official-photos-flagged-applied"]);
const runId = run.rows[0].id;

// Real gap found live 2026-08-15: a single malformed id (two ids pasted
// together into one string by a terminal mangling a very long command
// line) reached the UUID column as-is, Postgres threw a type-cast error,
// and that killed the WHOLE batch -- 60 valid, still-unapplied ids got
// silently abandoned along with the one bad one. A bad id should be
// skipped, not fatal to everyone after it in the list.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

try {
  let applied = 0;
  for (const id of ids) {
    // Everything for this one id is inside its own try/catch -- an
    // unexpected failure for ANY reason (not just a malformed id) skips
    // just this one person and moves on, rather than aborting the whole
    // batch and silently abandoning everyone still queued after them.
    try {
      if (!UUID_RE.test(id)) {
        console.warn(`${id}: not a valid id (malformed/concatenated?), skipped`);
        continue;
      }
      const { rows } = await client.query(
        `SELECT p.id, p.full_name, p.photo_url, o.title, o.jurisdiction_id
           FROM politicians p JOIN offices o ON o.id = p.current_office_id
          WHERE p.id = $1`,
        [id],
      );
      const row = rows[0];
      if (!row) {
        console.warn(`${id}: no such politician`);
        continue;
      }
      if (row.photo_url) {
        console.warn(`${row.full_name} (${id}): already has a photo_url, skipped`);
        continue;
      }
      const stateSlug = row.jurisdiction_id.split(":").pop();
      const tierSlug = TIER_SLUG[row.title];
      if (!tierSlug) {
        console.warn(`${row.full_name} (${id}): title "${row.title}" isn't one of this script's known tiers, skipped`);
        continue;
      }
      const candidates = await wikidataAnyPhoto(row.full_name);
      if (candidates.length === 0) {
        console.warn(`${row.full_name} (${id}): no Wikidata photo found on re-check -- nothing applied`);
        continue;
      }
      if (candidates.length > 1) {
        console.warn(`${row.full_name} (${id}): ${candidates.length} distinct Wikidata people share this name on re-check -- ambiguous, nothing applied`);
        continue;
      }
      const imgUrl = new URL(candidates[0].image.replace(/^http:/, "https:"));
      imgUrl.searchParams.set("width", "200");
      const slug = `${stateSlug}-${tierSlug}`;
      const localPath = await downloadPhoto(slug, imgUrl.toString());
      if (localPath) {
        await client.query(`UPDATE politicians SET photo_url = $2 WHERE id = $1`, [row.id, localPath]);
        console.log(`${row.full_name} (${id}): applied -> ${localPath}`);
        applied += 1;
      } else {
        console.warn(`${row.full_name} (${id}): download failed, nothing applied`);
      }
    } catch (e) {
      console.warn(`${id}: threw ${e.message ?? e}, skipped`);
    }
    await sleep(500);
  }
  await client.query(`UPDATE ingestion_runs SET finished_at = now(), status = 'succeeded', rows_upserted = $2 WHERE id = $1`, [runId, applied]);
  console.log(`applied ${applied} of ${ids.length} requested`);
} catch (e) {
  await client.query(`UPDATE ingestion_runs SET finished_at = now(), status = 'failed', note = $2 WHERE id = $1`, [runId, String(e.message ?? e)]);
  console.error(`apply-flagged-photo FAILED: ${e.message ?? e}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
