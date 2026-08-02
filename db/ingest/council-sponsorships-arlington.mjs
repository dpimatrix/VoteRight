#!/usr/bin/env node
// D-series ingester: Arlington County Board agenda-item movers/seconders.
//
// Source: Arlington's own OnBase meeting portal
// (meetings.arlingtonva.us/CountyBoard), which lists real Minutes PDFs per
// meeting -- a genuine government-published record, not a scrape of
// anything unofficial. Like Fairfax, Arlington's Board acts on
// staff-prepared items with a "moved/seconded" parliamentary convention,
// not Maryland-style bill sponsorship (schema already widened in migration
// 008 for 'mover'/'seconder').
//
// Real download quirk (confirmed live): the listed "DownloadFile" URL only
// returns a JS-redirect loading shell -- the actual PDF is at the same path
// with "DownloadFile" replaced by "DownloadFileBytes".
//
// Structural note found live, important for correctness: Arlington's
// Regular Meetings bundle nearly all routine business under ONE "On a
// motion by [Chair], seconded by [Vice-Chair]..." statement covering many
// unrelated items (the consent calendar) -- confirmed across two real
// meetings (Jan 24 2026, Feb 21 2026: exactly one such statement each,
// itself a multi-item batch, correctly excluded by the same batch-detection
// rule used for Fairfax). Recessed Meetings (deferred/contested business)
// have real, individually-moved items instead -- confirmed against the
// Jan 27 2026 recessed meeting: 4 genuine single-item motions. Both meeting
// types are processed; the batch rule does the honest filtering either way.
//
// Idempotent by construction: council_sponsorships has
// UNIQUE(politician_id, agenda_item_external_id). Incremental: only PDFs
// whose filename date is on/after the cutoff. Names map to politicians by
// accent-stripped last name, scoped to this jurisdiction's office_terms.
// Unmapped real names are collected and reported via `note`, never guessed.
//
// Known limitation: item titles for multi-person appointment lists (which
// span several embedded periods before the real sentence end) can
// occasionally capture a fragment rather than a clean title -- the
// mover/seconder attribution itself is unaffected, only the display title.
//
// Usage: node db/ingest/council-sponsorships-arlington.mjs --since=YYYY-MM-DD [--url=<postgres url>]
// Scheduling: .github/workflows/ingest.yml.

import { createRequire } from "node:module";
const require = createRequire(new URL("../../app/package.json", import.meta.url));
const { Client } = require("pg");
const { PDFParse } = require("pdf-parse");

const SOURCE = "arlington-agenda-items";
const COUNTY = "ocd-division/country:us/state:va/county:arlington";
const ONBASE_LISTING = "https://meetings.arlingtonva.us/CountyBoard";
const GRANICUS_LISTING = "https://arlington.granicus.com/ViewPublisher.php?view_id=2";
const GRANICUS_VIEW_ID = "2";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const args = process.argv.slice(2);
const since = args.find((a) => a.startsWith("--since="))?.slice(8);
const url = args.find((a) => a.startsWith("--url="))?.slice(6) ?? process.env.DATABASE_URL ?? "postgres://postgres:vr@localhost:5433/voteright";

const stripAccents = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const SUFFIX_RE = /^(Jr\.?|Sr\.?|II|III|IV|V)$/i;
function lastNameKey(fullName) {
  const parts = fullName.trim().split(/\s+/);
  while (parts.length > 1 && SUFFIX_RE.test(parts.at(-1))) parts.pop();
  return stripAccents(parts.at(-1)).toLowerCase();
}

function isoToGranicusDates(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return [`${MONTHS[m - 1]} ${d}, ${y}`, `${MONTHS_FULL[m - 1]} ${d}, ${y}`];
}

function findClipForDate(html, isoDate) {
  const wanted = isoToGranicusDates(isoDate);
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  const clipRe = /clip_id=(\d+)/;
  for (const row of html.matchAll(rowRe)) {
    if (!wanted.some((w) => row[1].includes(w))) continue;
    const clipMatch = row[1].match(clipRe);
    if (clipMatch) return clipMatch[1];
  }
  return null;
}

// Real minutes links, e.g. ".../County_Board_Regular_Meeting_2722_Minutes_1_24_2026_9_30_00_AM.pdf?documentType=2&meetingId=2722".
// Covers both Regular and Recessed meetings (see module comment above).
const MINUTES_LINK_RE = /href="(\/CountyBoard\/Documents\/DownloadFile\/County_Board_(?:Regular|Recessed)[^"]*?_(\d+)_Minutes_(\d+)_(\d+)_(\d+)_[^"]*?\.pdf[^"]*)"/g;

function findMinutesLinks(html) {
  const links = [];
  for (const m of html.matchAll(MINUTES_LINK_RE)) {
    const [, href, meetingId, mm, dd, yyyy] = m;
    const isoDate = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    const downloadUrl = `https://meetings.arlingtonva.us${href.replace("DownloadFile/", "DownloadFileBytes/")}`.replace(/&amp;/g, "&");
    links.push({ isoDate, meetingId, url: downloadUrl });
  }
  return links;
}

// The scan window for the batch check is the whole span up to the NEXT
// motion (a real structural boundary -- Arlington's minutes have no
// numbered headings the way Fairfax's do), not a naive "up to the first
// period" sentence guess -- real government prose is full of abbreviation
// periods ("St.", "Rt.", "Mr.") that would otherwise truncate the check
// before it ever reaches a genuine multi-item reference later in the same
// sentence, silently letting a bundled consent motion through undetected.
const BATCH_RE = /items?\s*#?\d+[\s\S]{0,60}(?:and|,)[\s\S]{0,20}#?\d+/i;
const MOTION_RE = /On a motion by ([A-Z][A-Za-z .]+?),\s*[A-Za-z-]+,(?:\s*seconded by ([A-Z][A-Za-z .]+?),\s*[A-Za-z-]+,)?\s*the County\s*\n?Board /g;

function extractMotions(text) {
  const matches = [...text.matchAll(MOTION_RE)];
  const motions = [];
  let prevEnd = 0;
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const [full, mover, seconder] = m;
    const beforeText = text.slice(prevEnd, m.index);
    const nextStart = matches[i + 1]?.index ?? text.length;
    const afterText = text.slice(m.index + full.length, nextStart);
    prevEnd = m.index + full.length;
    const scanWindow = text.slice(m.index, nextStart);
    if (BATCH_RE.test(scanWindow)) continue;
    const precedingLines = beforeText.split("\n").map((l) => l.trim()).filter(Boolean);
    // Title fallback order: the real preceding heading-like line (usual
    // case); else the actual action description's own first line (still a
    // real fact, not filler); else a plain placeholder as an absolute last
    // resort, which real data checked this session never actually hit.
    const title = (precedingLines.at(-1) || afterText.trim().split("\n")[0] || "Untitled item").slice(0, 500);
    motions.push({ blockIndex: i, title, mover: mover.trim(), seconder: seconder?.trim() ?? null });
  }
  return motions;
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
  const byLast = new Map();
  for (const p of pols.rows) {
    const key = lastNameKey(p.full_name);
    if (byLast.has(key)) throw new Error(`ambiguous last name in roster: ${key}`);
    byLast.set(key, p.id);
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

  const listingRes = await fetch(ONBASE_LISTING, { signal: AbortSignal.timeout(30000) });
  if (!listingRes.ok) throw new Error(`arlington onbase listing ${listingRes.status}`);
  const listingHtml = await listingRes.text();
  const links = findMinutesLinks(listingHtml).filter((l) => l.isoDate >= cutoff);

  let granicusHtml = null;
  let upserted = 0;
  const skippedNames = new Set();
  let dataThrough = null;

  for (const { isoDate, meetingId, url: pdfUrl } of links) {
    const pdfRes = await fetch(pdfUrl, { signal: AbortSignal.timeout(30000) });
    if (!pdfRes.ok) {
      skippedNames.add(`(${isoDate}: minutes PDF ${pdfRes.status}, skipped)`);
      continue;
    }
    const buf = Buffer.from(await pdfRes.arrayBuffer());
    const { text } = await new PDFParse({ data: buf }).getText();
    const motions = extractMotions(text);
    if (motions.length === 0) continue;
    if (!dataThrough || isoDate > dataThrough) dataThrough = isoDate;

    let videoUrl = pdfUrl;
    if (granicusHtml === null) {
      const res = await fetch(GRANICUS_LISTING, { signal: AbortSignal.timeout(30000) });
      granicusHtml = res.ok ? await res.text() : "";
    }
    const clipId = granicusHtml ? findClipForDate(granicusHtml, isoDate) : null;
    if (clipId) videoUrl = `https://arlington.granicus.com/MediaPlayer.php?view_id=${GRANICUS_VIEW_ID}&clip_id=${clipId}`;

    for (const motion of motions) {
      const names = [["mover", motion.mover], ...(motion.seconder ? [["seconder", motion.seconder]] : [])];
      const externalId = `${isoDate}-${meetingId}-${motion.blockIndex}`;
      for (const [role, name] of names) {
        const key = lastNameKey(name);
        const polId = byLast.get(key);
        if (!polId) {
          skippedNames.add(key);
          continue;
        }
        const ins = await client.query(
          `INSERT INTO council_sponsorships
             (politician_id, jurisdiction_id, role, clip_id, agenda_item_external_id, meeting_date, item_title, video_url, staff_report_url)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (politician_id, agenda_item_external_id) DO NOTHING`,
          [polId, COUNTY, role, clipId ?? "unresolved", externalId, isoDate, motion.title, videoUrl, pdfUrl],
        );
        upserted += ins.rowCount ?? 0;
      }
    }
  }

  await client.query(
    `UPDATE ingestion_runs SET finished_at = now(), status = 'succeeded',
            rows_upserted = $2, rows_skipped = $3, data_through = $4, note = $5
      WHERE id = $1`,
    [runId, upserted, skippedNames.size, dataThrough, skippedNames.size ? `unmapped/skipped: ${[...skippedNames].sort().join(", ")}` : null],
  );
  console.log(`${SOURCE}: upserted ${upserted} sponsorship(s) across ${links.length} meeting(s), data through ${dataThrough ?? "n/a"}, ${skippedNames.size} unmapped/skipped`);
} catch (e) {
  await client.query(`UPDATE ingestion_runs SET finished_at = now(), status = 'failed', note = $2 WHERE id = $1`, [runId, String(e.message ?? e)]);
  console.error(`${SOURCE} FAILED: ${e.message ?? e}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
