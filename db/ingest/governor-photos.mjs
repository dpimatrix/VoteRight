#!/usr/bin/env node
// Governor + Lieutenant Governor official portraits via Wikidata --
// same core technique as db/ingest/congress.mjs's photo pipeline
// (already proven at 531-people scale), adapted for a source with no
// clean external ID like bioguide_id. Governors don't have one, but
// name + exact "position held" match ("Governor of Maryland", not just
// any office containing the word "Governor") is precise enough to avoid
// a same-name false match -- verified live 2026-08-14 against Wes Moore
// / Governor of Maryland before building this, and again against a
// second state before trusting the pattern generically.
//
// Scale is much smaller than Congress (95 people vs. 531), so this
// doesn't need Congress's batched-VALUES-clause approach to stay under
// Wikidata's rate limit -- sequential queries with a real delay and a
// proper User-Agent (the two things that were MISSING the first time
// Congress hit that wall) are enough at this volume. Still keeps
// Congress's other hard-won lessons: retry-on-429 with backoff for
// downloads, webp conversion, idempotent (skips anyone who already has
// a photo_url), diagnostic counters instead of a silent single number.
//
// Usage: node db/ingest/governor-photos.mjs [--url=<postgres url>]

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

const url = process.argv.slice(2).find((a) => a.startsWith("--url="))?.slice(6)
  ?? process.env.DATABASE_URL ?? "postgres://postgres:vr@localhost:5433/voteright";

// Same slug->full-name crosswalk shape as congress.mjs's STATE_SLUG, built
// from the same Census FIPS list used in migration 059, not re-derived.
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

async function wikidataPhotoUrl(fullName, expectedPositionSubstring) {
  try {
    const escaped = fullName.replace(/"/g, '\\"');
    const query = `SELECT ?image WHERE {
      ?person rdfs:label "${escaped}"@en.
      ?person wdt:P39 ?position.
      ?position rdfs:label ?positionLabel.
      FILTER(lang(?positionLabel) = "en").
      FILTER(CONTAINS(?positionLabel, "${expectedPositionSubstring}")).
      ?person wdt:P18 ?image.
    } LIMIT 1`;
    const u = new URL("https://query.wikidata.org/sparql");
    u.searchParams.set("query", query);
    u.searchParams.set("format", "json");
    const res = await fetch(u, {
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      console.warn(`wikidata lookup for ${fullName}: HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    const uri = data.results?.bindings?.[0]?.image?.value;
    if (!uri) return null;
    const filePathUrl = new URL(uri.replace(/^http:/, "https:"));
    filePathUrl.searchParams.set("width", "200");
    return filePathUrl.toString();
  } catch (e) {
    console.warn(`wikidata lookup for ${fullName} threw: ${e.message ?? e}`);
    return null; // no Wikidata entry, no matching position, no P18 image, or the query service hiccuped -- never guess
  }
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
const run = await client.query(`INSERT INTO ingestion_runs (source) VALUES ($1) RETURNING id`, ["governor-photos-wikidata"]);
const runId = run.rows[0].id;

try {
  const { rows } = await client.query(`
    SELECT p.id, p.full_name, p.photo_url, o.title, o.jurisdiction_id
      FROM politicians p JOIN offices o ON o.id = p.current_office_id
     WHERE o.title IN ('Governor', 'Lieutenant Governor') AND o.level = 'state'
     ORDER BY o.jurisdiction_id, o.title
  `);

  const stats = { downloaded: 0, alreadyHad: 0, noMatch: 0, downloadFailed: 0, unknownState: 0 };
  for (const row of rows) {
    if (row.photo_url) {
      stats.alreadyHad += 1;
      continue;
    }
    const stateSlug = row.jurisdiction_id.split(":").pop();
    const stateName = STATE_NAME[stateSlug];
    if (!stateName) {
      console.warn(`unknown state slug for ${row.full_name}: ${row.jurisdiction_id}`);
      stats.unknownState += 1;
      continue;
    }
    const positionSubstring = `${row.title} of ${stateName}`;
    const imageUrl = await wikidataPhotoUrl(row.full_name, positionSubstring);
    if (!imageUrl) {
      stats.noMatch += 1;
      await sleep(350);
      continue;
    }
    const slug = `${stateSlug}-${row.title === "Governor" ? "gov" : "ltgov"}`;
    const localPath = await downloadPhoto(slug, imageUrl);
    if (localPath) {
      await client.query(`UPDATE politicians SET photo_url = $2 WHERE id = $1`, [row.id, localPath]);
      stats.downloaded += 1;
    } else {
      stats.downloadFailed += 1;
    }
    await sleep(350);
  }

  await client.query(
    `UPDATE ingestion_runs SET finished_at = now(), status = 'succeeded', rows_upserted = $2 WHERE id = $1`,
    [runId, stats.downloaded],
  );
  console.log(
    `governor-photos-wikidata: ${stats.downloaded} downloaded, ${stats.alreadyHad} already had one, ` +
      `${stats.noMatch} no Wikidata match, ${stats.downloadFailed} download failed, ${stats.unknownState} unknown state`,
  );
} catch (e) {
  await client.query(`UPDATE ingestion_runs SET finished_at = now(), status = 'failed', note = $2 WHERE id = $1`, [runId, String(e.message ?? e)]);
  console.error(`governor-photos-wikidata FAILED: ${e.message ?? e}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
