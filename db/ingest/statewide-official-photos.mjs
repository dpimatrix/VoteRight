#!/usr/bin/env node
// Statewide-official portraits via Wikidata -- same technique as
// db/ingest/congress.mjs's photo pipeline (proven at 531-people scale),
// adapted for offices with no clean external ID like bioguide_id: matches
// by full_name, cross-checked against the person's actual Wikidata
// "position held" for the exact office+state ("Attorney General of
// Maryland", not just any office containing the word "Attorney") before
// trusting the match. Verified live 2026-08-14 against Wes Moore/Governor
// of Maryland and Anthony G. Brown/Attorney General of Maryland before
// building this.
//
// Started with Governor + Lt. Governor (95 people, first pass); this run
// generalized to add Attorney General, Secretary of State, Treasurer,
// Controller, and Auditor (146 more) -- all single-seat, one-per-state,
// same "{title} of {state}" position shape, confirmed by checking each
// tier's actual seat_type before adding it here. TIERS below is meant to
// grow: add an entry, re-run, no other code changes needed for another
// tier that fits this same shape. Multi-seat bodies (e.g. Public
// Service Commissions, seat_type='at_large') and differently-shaped
// tiers (district-based, judicial) need their own verification pass
// before joining this list -- don't assume they fit blind.
//
// Real naming quirk found live building this: this project normalizes
// "Comptroller"/"Controller" (both real, genuinely different per-state
// terminology -- migration 067's own header) into one generic
// "Controller" office title, but Wikidata uses each state's own real
// term. LABEL_CANDIDATES lets a tier try more than one label per person,
// in order, instead of assuming a single naming convention nationwide.
//
// Sequential per-person queries with a real delay + proper User-Agent,
// not Congress's batched-VALUES-clause approach -- this tier's total
// scale (currently a few hundred people) is small enough to stay well
// under Wikidata's rate limit without it. Idempotent (skips anyone who
// already has a photo_url), so re-running after adding a new tier only
// does network work for the newly-added people.
//
// Usage: node db/ingest/statewide-official-photos.mjs [--url=<postgres url>]

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

// Each tier: which office title(s) to pull from the DB, the local
// filename slug for that office, and how to build the candidate Wikidata
// position label(s) to try, in order, for a given state name.
const TIERS = [
  { titles: ["Governor"], slug: "gov", labels: (state) => [`Governor of ${state}`] },
  { titles: ["Lieutenant Governor"], slug: "ltgov", labels: (state) => [`Lieutenant Governor of ${state}`] },
  { titles: ["Attorney General"], slug: "ag", labels: (state) => [`Attorney General of ${state}`] },
  { titles: ["Secretary of State"], slug: "sos", labels: (state) => [`Secretary of State of ${state}`] },
  { titles: ["Treasurer"], slug: "treasurer", labels: (state) => [`Treasurer of ${state}`, `State Treasurer of ${state}`] },
  // Comptroller/Controller: real, genuinely different per-state
  // terminology (migration 067) normalized to one generic DB title --
  // try both Wikidata labels, in the order more states actually use.
  { titles: ["Controller"], slug: "comptroller", labels: (state) => [`Comptroller of ${state}`, `Controller of ${state}`, `State Auditor of ${state}`] },
  { titles: ["Auditor"], slug: "auditor", labels: (state) => [`Auditor of ${state}`, `State Auditor of ${state}`] },
];

// Real gap found live 2026-08-14 building this: retry-with-backoff
// existed for downloadPhoto but never for the lookup step itself, and a
// tier with multiple label candidates (Comptroller/Controller) fired
// them back-to-back with zero delay -- bursting requests on top of an
// already-large day's worth of cumulative traffic to the same public
// endpoint (Congress's 531 + Governor's ~190 + this tier's 241). Result:
// 149 of 161 newly-attempted people failed on the first run of this
// tier, dominated by 429/502/timeout -- transient infrastructure load,
// not 149 genuine "no Wikidata photo" cases. Retries 429 (respecting
// Retry-After) and 502 (fixed backoff, Wikidata's own upstream
// hiccupping) up to 3 times per label candidate, same shape as
// downloadPhoto's own retry logic; a small delay between label
// candidates too, not just between people.
async function wikidataPhotoUrl(fullName, labelCandidates) {
  for (const label of labelCandidates) {
    const imageUrl = await wikidataPhotoUrlForLabel(fullName, label);
    if (imageUrl) return imageUrl;
    await sleep(200);
  }
  return null; // no Wikidata entry, no matching position under any tried label, no P18 image, or the query service hiccuped -- never guess
}

async function wikidataPhotoUrlForLabel(fullName, label, attempt = 1) {
  try {
    const escapedName = fullName.replace(/"/g, '\\"');
    const escapedLabel = label.replace(/"/g, '\\"');
    const query = `SELECT ?image WHERE {
      ?person rdfs:label "${escapedName}"@en.
      ?person wdt:P39 ?position.
      ?position rdfs:label ?positionLabel.
      FILTER(lang(?positionLabel) = "en").
      FILTER(CONTAINS(?positionLabel, "${escapedLabel}")).
      ?person wdt:P18 ?image.
    } LIMIT 1`;
    const u = new URL("https://query.wikidata.org/sparql");
    u.searchParams.set("query", query);
    u.searchParams.set("format", "json");
    const res = await fetch(u, {
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(15000),
    });
    if ((res.status === 429 || res.status === 502) && attempt <= 3) {
      const retryAfterMs = Number(res.headers.get("retry-after")) * 1000 || 2 ** attempt * 1000;
      console.warn(`wikidata lookup for ${fullName} (${label}): HTTP ${res.status}, retrying in ${retryAfterMs}ms (attempt ${attempt})`);
      await sleep(retryAfterMs);
      return wikidataPhotoUrlForLabel(fullName, label, attempt + 1);
    }
    if (!res.ok) {
      console.warn(`wikidata lookup for ${fullName} (${label}): HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    const uri = data.results?.bindings?.[0]?.image?.value;
    if (!uri) return null;
    const filePathUrl = new URL(uri.replace(/^http:/, "https:"));
    filePathUrl.searchParams.set("width", "200");
    return filePathUrl.toString();
  } catch (e) {
    // A thrown timeout was as common as an explicit 429/502 in practice
    // (Wikidata's endpoint under sustained load, not a bad query -- other
    // people's identical query shape succeeded fine around it) -- retried
    // the same as an explicit 429/502, not treated as a permanent failure.
    if (attempt <= 3) {
      const retryMs = 2 ** attempt * 1000;
      console.warn(`wikidata lookup for ${fullName} (${label}) threw: ${e.message ?? e}, retrying in ${retryMs}ms (attempt ${attempt})`);
      await sleep(retryMs);
      return wikidataPhotoUrlForLabel(fullName, label, attempt + 1);
    }
    console.warn(`wikidata lookup for ${fullName} (${label}) threw: ${e.message ?? e}`);
    return null;
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
const run = await client.query(`INSERT INTO ingestion_runs (source) VALUES ($1) RETURNING id`, ["statewide-official-photos-wikidata"]);
const runId = run.rows[0].id;

try {
  const allTitles = TIERS.flatMap((t) => t.titles);
  const { rows } = await client.query(
    `SELECT p.id, p.full_name, p.photo_url, o.title, o.jurisdiction_id
       FROM politicians p JOIN offices o ON o.id = p.current_office_id
      WHERE o.title = ANY($1) AND o.level = 'state'
      ORDER BY o.title, o.jurisdiction_id`,
    [allTitles],
  );

  const stats = { downloaded: 0, alreadyHad: 0, noMatch: 0, downloadFailed: 0, unknownState: 0 };
  for (const row of rows) {
    if (row.photo_url) {
      stats.alreadyHad += 1;
      continue;
    }
    const tier = TIERS.find((t) => t.titles.includes(row.title));
    const stateSlug = row.jurisdiction_id.split(":").pop();
    const stateName = STATE_NAME[stateSlug];
    if (!stateName) {
      console.warn(`unknown state slug for ${row.full_name}: ${row.jurisdiction_id}`);
      stats.unknownState += 1;
      continue;
    }
    const imageUrl = await wikidataPhotoUrl(row.full_name, tier.labels(stateName));
    if (!imageUrl) {
      stats.noMatch += 1;
      await sleep(500);
      continue;
    }
    const slug = `${stateSlug}-${tier.slug}`;
    const localPath = await downloadPhoto(slug, imageUrl);
    if (localPath) {
      await client.query(`UPDATE politicians SET photo_url = $2 WHERE id = $1`, [row.id, localPath]);
      stats.downloaded += 1;
    } else {
      stats.downloadFailed += 1;
    }
    await sleep(500);
  }

  await client.query(
    `UPDATE ingestion_runs SET finished_at = now(), status = 'succeeded', rows_upserted = $2 WHERE id = $1`,
    [runId, stats.downloaded],
  );
  console.log(
    `statewide-official-photos-wikidata: ${stats.downloaded} downloaded, ${stats.alreadyHad} already had one, ` +
      `${stats.noMatch} no Wikidata match, ${stats.downloadFailed} download failed, ${stats.unknownState} unknown state`,
  );
} catch (e) {
  await client.query(`UPDATE ingestion_runs SET finished_at = now(), status = 'failed', note = $2 WHERE id = $1`, [runId, String(e.message ?? e)]);
  console.error(`statewide-official-photos-wikidata FAILED: ${e.message ?? e}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
