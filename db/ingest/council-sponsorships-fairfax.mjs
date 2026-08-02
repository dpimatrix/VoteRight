#!/usr/bin/env node
// D-series ingester: Fairfax County Board of Supervisors agenda-item movers.
//
// Source: Fairfax's own "Board Meeting Summaries" page
// (fairfaxcounty.gov/boardofsupervisors/board-meeting-summaries), which
// links each meeting's real Clerk's "Final Summary" PDF -- a genuine,
// government-published record of Board action, not a scrape of anything
// unofficial. Virginia's Board of Supervisors doesn't sponsor bills the way
// Maryland's charter counties do; instead each real action records who
// MOVED it (and often who seconded), a parliamentary fact confirmed live
// against a real meeting: "Supervisor Bierman, jointly with Chairman McKay,
// moved approval of the Resolution of Recognition presented to Dr. Bryna
// Helfer..." (July 14, 2026 Final Summary). role = 'mover' (schema widened
// in migration 008 to add 'mover'/'seconder' alongside Maryland's
// 'lead_sponsor'/'co_sponsor', since these are genuinely different facts).
//
// Consent-calendar honesty rule: most routine business is adopted under a
// single motion covering many unrelated items at once (typically moved by
// the Chair). Attributing that bundled motion to every item inside it would
// misrepresent procedural housekeeping as individual engagement. Any motion
// whose text references multiple item numbers is treated as a consent
// batch and skipped entirely -- only genuinely single-item motions produce
// a citation row.
//
// Idempotent by construction: council_sponsorships has
// UNIQUE(politician_id, agenda_item_external_id). Incremental: only PDFs
// whose filename date is on/after the cutoff are fetched. Names map to
// politicians by accent-stripped last name, scoped to office_terms in this
// jurisdiction only. Unmapped real names are collected and reported via
// `note`, never guessed.
//
// Usage: node db/ingest/council-sponsorships-fairfax.mjs --since=YYYY-MM-DD [--url=<postgres url>]
// Scheduling: .github/workflows/ingest.yml.

import { createRequire } from "node:module";
const require = createRequire(new URL("../../app/package.json", import.meta.url));
const { Client } = require("pg");
const { PDFParse } = require("pdf-parse");

const SOURCE = "fairfax-agenda-items";
const COUNTY = "ocd-division/country:us/state:va/county:fairfax";
const SUMMARIES_PAGE = "https://www.fairfaxcounty.gov/boardofsupervisors/board-meeting-summaries";
const GRANICUS_LISTING = "https://video.fairfaxcounty.gov/ViewPublisher.php?view_id=7";
const GRANICUS_VIEW_ID = "7";
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

// Granicus's meeting-listing template varies per jurisdiction -- Prince
// George's uses a dedicated abbreviated-month "Date" column, Fairfax embeds
// the full month name directly in the meeting title cell instead. Checking
// the whole row's text for either form (rather than requiring one specific
// cell shape) is more robust across jurisdictions than assuming one layout.
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

// Real meeting-summary PDF links, e.g.
// ".../meeting-materials/2026/07-14-26 Final Summary.pdf" -- filename
// naming has drifted over the years (some say "FINAL Summary", one says
// "BOS Final Summary", accessible variants exist), so match loosely on
// "summary.pdf" under the dated meeting-materials path rather than one
// exact filename shape.
const SUMMARY_LINK_RE = /href="([^"]*\/meeting-materials\/(\d{4})\/(\d{2})-(\d{2})-(\d{2})[^"]*[Ss]ummary[^"]*\.pdf)"/g;

function findSummaryLinks(html) {
  const links = [];
  for (const m of html.matchAll(SUMMARY_LINK_RE)) {
    const [, href, year, mm, dd] = m;
    const isoDate = `${year}-${mm}-${dd}`;
    const absolute = href.startsWith("http") ? href : `https://www.fairfaxcounty.gov${href}`;
    links.push({ isoDate, url: absolute.replace(/&amp;/g, "&") });
  }
  return links;
}

// Only genuine single-item motions -- reject anything whose action text
// references multiple item numbers (a consent-batch signal), confirmed
// live: "the County Board approved items #28A, and #30 - #33" pattern. The
// scan window is the whole span up to the NEXT heading (a real structural
// boundary), not a naive "up to the first period" sentence guess -- real
// government prose is full of abbreviation periods ("St.", "Ave.", "Mr.",
// "Sept.") that would otherwise truncate the check before it ever reaches a
// genuine multi-item reference later in the same sentence, silently letting
// a bundled Chair's motion through as if it were individual attribution.
const BATCH_RE = /items?\s*#?\d+[\s\S]{0,60}(?:and|,)[\s\S]{0,20}#?\d+/i;
const MOVER_RE = /(Supervisor|Chairman) ([A-Za-z .]+?)(?:, jointly with (?:Supervisor |Chairman )?([A-Za-z .]+?),)? moved (?:that the Board |approval of )/g;
// Marks only WHERE a heading starts ("N. ") -- deliberately does not capture
// a single line of title text. Real headings routinely wrap across 2-3
// lines before their timestamp (confirmed live: 47 of 48 real headings in
// one meeting's summary), so capturing "up to the first \n" was silently
// truncating almost every title to its first line -- e.g. a real heading
// "RESOLUTION OF RECOGNITION CELEBRATING THE\n36TH ANNIVERSARY OF THE
// AMERICANS WITH DISABILITIES ACT\n(10:03 a.m.)" was stored as just
// "RESOLUTION OF RECOGNITION CELEBRATING THE". The full title is instead
// reassembled per-motion below, using the real content boundary (the
// timestamp marker, or the motion sentence itself) rather than a line break.
const HEADING_RE = /(?:\n|^)\s*(\d+)\.\s+/dg;
const TIME_MARKER_RE = /\(\s*\d{1,2}(?::\d{2})?\s*(?:a\.m\.|p\.m\.|noon|midnight)\s*\)/i;

function extractMotions(text) {
  const headings = [...text.matchAll(HEADING_RE)].map((m) => ({ num: m[1], contentStart: m.indices[0][1], index: m.index }));
  const motions = [];
  let seq = 0;
  for (const m of text.matchAll(MOVER_RE)) {
    const [, , mover, jointMover] = m;
    seq++; // stable position among ALL raw matches, batch-excluded or not --
            // keeps agenda_item_external_id unique even when a heading has
            // more than one genuine individual motion under it.
    let heading = null;
    let nextHeadingIndex = text.length;
    for (const h of headings) {
      if (h.index <= m.index) heading = h;
      else { nextHeadingIndex = h.index; break; }
    }
    if (!heading) continue; // no identifiable single item context
    const scanWindow = text.slice(m.index, nextHeadingIndex);
    if (BATCH_RE.test(scanWindow)) continue; // consent-batch, not individual attribution

    // Full title: everything between the heading number and whichever comes
    // first -- a timestamp marker (the normal case) or the motion sentence
    // itself (belt-and-suspenders if a heading has no timestamp) -- with
    // wrapped newlines collapsed to spaces so it reads as one clean title.
    const rawSpan = text.slice(heading.contentStart, m.index);
    const timeMatch = rawSpan.match(TIME_MARKER_RE);
    const rawTitle = timeMatch ? rawSpan.slice(0, timeMatch.index) : rawSpan;
    const itemTitle = rawTitle.replace(/\s+/g, " ").trim().slice(0, 500);

    motions.push({ itemNum: heading.num, itemTitle, mover: mover.trim(), jointMover: jointMover?.trim() ?? null, seq });
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

  const summariesRes = await fetch(SUMMARIES_PAGE, { signal: AbortSignal.timeout(30000) });
  if (!summariesRes.ok) throw new Error(`fairfax summaries page ${summariesRes.status}`);
  const summariesHtml = await summariesRes.text();
  const links = findSummaryLinks(summariesHtml).filter((l) => l.isoDate >= cutoff);

  let granicusHtml = null;
  let upserted = 0;
  const skippedNames = new Set();
  let dataThrough = null;

  for (const { isoDate, url: pdfUrl } of links) {
    const pdfRes = await fetch(pdfUrl, { signal: AbortSignal.timeout(30000) });
    if (!pdfRes.ok) {
      skippedNames.add(`(${isoDate}: summary PDF ${pdfRes.status}, skipped)`);
      continue;
    }
    const buf = Buffer.from(await pdfRes.arrayBuffer());
    const { text } = await new PDFParse({ data: buf }).getText();
    const motions = extractMotions(text);
    if (motions.length === 0) continue;
    if (!dataThrough || isoDate > dataThrough) dataThrough = isoDate;

    let videoUrl = pdfUrl; // fallback: the summary PDF itself is a real, working citation
    if (granicusHtml === null) {
      const res = await fetch(GRANICUS_LISTING, { signal: AbortSignal.timeout(30000) });
      granicusHtml = res.ok ? await res.text() : "";
    }
    let clipId = granicusHtml ? findClipForDate(granicusHtml, isoDate) : null;
    if (clipId) videoUrl = `https://video.fairfaxcounty.gov/MediaPlayer.php?view_id=${GRANICUS_VIEW_ID}&clip_id=${clipId}`;

    for (const motion of motions) {
      const names = [["mover", motion.mover], ...(motion.jointMover ? [["mover", motion.jointMover]] : [])];
      const externalId = `${isoDate}-${motion.itemNum}-${motion.seq}`;
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
          [polId, COUNTY, role, clipId ?? "unresolved", externalId, isoDate, motion.itemTitle, videoUrl, pdfUrl],
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
