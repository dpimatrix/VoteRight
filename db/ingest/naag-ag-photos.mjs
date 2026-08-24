#!/usr/bin/env node
// Attorney General portraits via NAAG's own "Find my AG" directory
// (https://www.naag.org/find-my-ag/) -- the source BACKLOG.md flagged as
// researched-but-not-built after Wikidata's photo coverage hit a real
// ceiling (statewide-official-photos.mjs's strict position-held matcher
// and statewide-official-photos-flagged.mjs's loose name-scan together
// still leave a chunk of AGs with no Wikidata photo at all).
//
// Unlike the Wikidata scripts, this isn't a name-search-and-hope-it's-the-
// right-person problem: NAAG's directory is indexed BY STATE (56 entries --
// 50 states + DC + 5 territories, one page, confirmed live 2026-08-23), so
// there's no ambiguous-name collision risk the way "Andy Wilson" or "Mark
// Hunt" turned out to be on a loose Wikidata name search. The real risk
// here is temporal, not identity: either side (NAAG's page or our own DB)
// could be a step behind a recent transition. So this still cross-checks
// NAAG's listed name against our own DB's current officeholder for that
// state before applying anything -- same "never guess" posture as the
// Wikidata scripts, just checking staleness instead of same-name
// collisions.
//
// One request for the whole directory page (56 entries in one page load,
// not 50+ individual lookups -- more polite to NAAG's server than the
// Wikidata scripts' per-person query pattern, and the page is small/stable
// enough that this is safe to re-run without needing its own throttling
// beyond the per-photo download delay below).
//
// Real find: NAAG's images are on naag.org's own CDN (wp-content/uploads),
// not Wikimedia Commons -- so this is a THIRD distinct copyright situation
// on top of the Commons attribution gap already flagged in BACKLOG.md, not
// the same one. These are official NAAG/state-AG-office portraits; no
// license or attribution metadata is captured here, matching the existing
// (already-flagged, still-open) gap for the Commons-sourced photos -- not
// a new decision, just worth naming explicitly rather than silently
// lumping it in with Commons's different terms.
//
// STATUS (2026-08-23): parsing/matching logic below is verified correct
// against a real saved copy of the page (56/56 entries parsed, name
// cross-check tested against Andy Wilson/Ohio -- one of the people this
// was meant to help), but the script can't actually run yet. naag.org
// sits behind Cloudflare bot-detection that returns HTTP 403 with a
// "Just a moment..." JS-challenge page for requests from Node's fetch
// client specifically -- reproducible every time, while `curl` from the
// same machine gets a clean 200 every time. That gap is itself the
// signature of a client-fingerprint-based bot check, not a rate limit or
// IP block, and this project does not build around bot-detection by
// swapping in a different HTTP client (or anything else) chosen because
// it evades that check -- see the repo's standing rule against bypassing
// bot-detection, which applies regardless of the request's benign intent.
// robots.txt (checked live) does not disallow /find-my-ag/, so there's no
// crawling-policy objection -- the blocker is purely the Cloudflare
// challenge. Left in the repo, not wired into roster-refresh.sh, pending
// either a legitimate access path (NAAG data-sharing contact, an API) or
// a policy change on their end. Do not add retry/evasion logic here.
//
// Usage: node db/ingest/naag-ag-photos.mjs [--url=<postgres url>]

import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(new URL("../../app/package.json", import.meta.url));
const { Client } = require("pg");
const sharp = require("sharp");

const PHOTO_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "app", "public", "politicians");
const USER_AGENT = "VoteRight-civic-data-ingester/1.0 (https://voteright.dpimatrix.com; contact via repo)";
const NAAG_URL = "https://www.naag.org/find-my-ag/";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const url = process.argv.slice(2).find((a) => a.startsWith("--url="))?.slice(6)
  ?? process.env.DATABASE_URL ?? "postgres://postgres:vr@localhost:5433/voteright";

// Same table (and same duplication-over-shared-import style) as
// statewide-official-photos.mjs / apply-flagged-photo.mjs -- this project
// keeps this small lookup local to each ingest script rather than
// factoring it out.
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

// Loose enough to survive "Marty J. Jackley" vs. a NAAG listing of "Marty
// Jackley", strict enough to actually catch a real mismatch: strip
// punctuation/diacritics, compare the token sets, and require the last
// names to match exactly (the one part of a name that basically never
// varies by formatting) plus at least one more shared token (first name
// or an initial matching a first-name's initial).
function normalizeTokens(name) {
  return name
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[.,]/g, "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}
function namesLikelyMatch(a, b) {
  const ta = normalizeTokens(a);
  const tb = normalizeTokens(b);
  if (ta.length === 0 || tb.length === 0) return false;
  const lastA = ta[ta.length - 1];
  const lastB = tb[tb.length - 1];
  if (lastA !== lastB) return false;
  const firstA = ta[0];
  const firstB = tb[0];
  if (firstA === firstB) return true;
  if (firstA[0] === firstB[0]) return true; // initial match (e.g. "Marty" vs "M.")
  return false;
}

function parseNaagDirectory(html) {
  // Each entry: itemid=".../attorney-general/<slug>/" content="<Name>",
  // then that entry's own itemprop="image" meta, then its fl-post-meta
  // state line -- confirmed live 2026-08-23 against the real page (56
  // entries: 50 states + DC + 5 territories), non-greedy so each capture
  // stays paired with its own entry rather than skipping ahead to the
  // next one's image/state.
  const re = /itemid="https:\/\/www\.naag\.org\/attorney-general\/[a-z0-9-]+\/" content="([^"]+)"[\s\S]*?itemprop="image" itemtype="https:\/\/schema\.org\/ImageObject"><meta itemprop="url" content="([^"]+)"[\s\S]*?<div class="fl-post-meta">\s*([^<]+?)\s*<\/div>/g;
  const byState = new Map();
  let m;
  while ((m = re.exec(html))) {
    const [, name, image, stateRaw] = m;
    const state = stateRaw.replace(/\s*\(Acting\)\s*$/, "").trim();
    byState.set(state, { name, image });
  }
  return byState;
}

async function downloadPhoto(slug, imageUrl, attempt = 1) {
  const filename = `${slug}.webp`;
  const diskPath = path.join(PHOTO_DIR, filename);
  try {
    const res = await fetch(imageUrl, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(10000) });
    if (res.status === 429 && attempt <= 3) {
      const retryAfterMs = Number(res.headers.get("retry-after")) * 1000 || 2 ** attempt * 1000;
      console.warn(`photo download for ${slug}: HTTP 429, retrying in ${retryAfterMs}ms (attempt ${attempt})`);
      await sleep(retryAfterMs);
      return downloadPhoto(slug, imageUrl, attempt + 1);
    }
    if (!res.ok) {
      console.warn(`photo download for ${slug}: HTTP ${res.status} from ${imageUrl}`);
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
const run = await client.query(`INSERT INTO ingestion_runs (source) VALUES ($1) RETURNING id`, ["naag-ag-photos"]);
const runId = run.rows[0].id;

try {
  const dirRes = await fetch(NAAG_URL, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(15000) });
  if (!dirRes.ok) throw new Error(`fetching ${NAAG_URL} failed: HTTP ${dirRes.status}`);
  const html = await dirRes.text();
  const naagByState = parseNaagDirectory(html);
  console.log(`parsed ${naagByState.size} entries from NAAG's directory`);

  const { rows } = await client.query(
    `SELECT p.id, p.full_name, p.photo_url, o.jurisdiction_id
       FROM politicians p JOIN offices o ON o.id = p.current_office_id
      WHERE o.title = 'Attorney General' AND o.level = 'state'
      ORDER BY o.jurisdiction_id`,
  );

  const stats = { downloaded: 0, alreadyHad: 0, noNaagEntry: 0, nameMismatch: 0, downloadFailed: 0, unknownState: 0 };
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
    const entry = naagByState.get(stateName);
    if (!entry) {
      console.warn(`${row.full_name} (${stateName}): no NAAG directory entry found`);
      stats.noNaagEntry += 1;
      continue;
    }
    if (!namesLikelyMatch(row.full_name, entry.name)) {
      console.warn(`${row.full_name} (${stateName}): NAAG lists "${entry.name}" instead -- likely a transition either side is behind on, skipped, needs manual review`);
      stats.nameMismatch += 1;
      continue;
    }
    const slug = `${stateSlug}-ag`;
    const localPath = await downloadPhoto(slug, entry.image);
    if (localPath) {
      await client.query(`UPDATE politicians SET photo_url = $2 WHERE id = $1`, [row.id, localPath]);
      console.log(`${row.full_name} (${stateName}): applied -> ${localPath}`);
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
    `naag-ag-photos: ${stats.downloaded} downloaded, ${stats.alreadyHad} already had one, ` +
      `${stats.nameMismatch} name mismatch (needs manual review), ${stats.noNaagEntry} no NAAG entry, ` +
      `${stats.downloadFailed} download failed, ${stats.unknownState} unknown state`,
  );
} catch (e) {
  await client.query(`UPDATE ingestion_runs SET finished_at = now(), status = 'failed', note = $2 WHERE id = $1`, [runId, String(e.message ?? e)]);
  console.error(`naag-ag-photos FAILED: ${e.message ?? e}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
