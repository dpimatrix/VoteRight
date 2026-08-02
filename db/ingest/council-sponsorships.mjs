#!/usr/bin/env node
// D-series ingester: Montgomery County Council agenda-item sponsorships.
//
// Source: the county's Granicus AgendaViewer (montgomerycountymd.granicus.com,
// view_id=169) — per-meeting agenda items with lead sponsor / co-sponsor
// councilmember names, a staff-report PDF link, and a jump-link into the
// exact video moment for that item. No word-level transcript attribution:
// auto-generated captions are ASR-quality and are surfaced separately, at
// the meeting level, never claimed as verbatim. This is a citation, not a
// scored position — nothing here feeds politician_positions/scoring.
//
// Idempotent by construction: council_sponsorships has
// UNIQUE(politician_id, agenda_item_external_id); re-runs are no-ops.
// Incremental: only processes clip_ids greater than the max clip_id already
// ingested. Names map to politicians by accent-stripped last name, scoped
// to current officeholders (office_terms) — unknown names are skipped and
// reported, never guessed.
//
// Usage: node db/ingest/council-sponsorships.mjs [--full] [--url=<postgres url>]
// Scheduling: .github/workflows/ingest.yml (weekly, alongside votes.mjs).

import { createRequire } from "node:module";
const require = createRequire(new URL("../../app/package.json", import.meta.url));
const { Client } = require("pg");

const SOURCE = "moco-agenda-items";
const COUNTY = "ocd-division/country:us/state:md/county:montgomery";
const VIEW_ID = "169";
const PUBLISHER_URL = `https://montgomerycountymd.granicus.com/ViewPublisher.php?view_id=${VIEW_ID}`;
const agendaViewerUrl = (clipId) => `https://montgomerycountymd.granicus.com/AgendaViewer.php?clip_id=${clipId}&view_id=${VIEW_ID}&redirect=true`;

const args = process.argv.slice(2);
const full = args.includes("--full");
const sinceClip = args.find((a) => a.startsWith("--since-clip="))?.slice(13);
const url = args.find((a) => a.startsWith("--url="))?.slice(6) ?? process.env.DATABASE_URL ?? "postgres://postgres:vr@localhost:5433/voteright";

const stripAccents = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const SUFFIX_RE = /^(Jr\.?|Sr\.?|II|III|IV|V)$/i;
function lastNameKey(fullName) {
  const parts = fullName.trim().split(/\s+/);
  while (parts.length > 1 && SUFFIX_RE.test(parts.at(-1))) parts.pop();
  return stripAccents(parts.at(-1)).toLowerCase();
}

// Splits a "Councilmembers A, B and C" list into individual last names.
function splitNames(raw) {
  return raw
    .replace(/\band\b/gi, ",")
    .split(",")
    .map((s) => stripAccents(s.trim()).toLowerCase())
    .filter(Boolean);
}

// One <a name="agendaNNN" ...>...</a> block per agenda item; content can
// span multiple lines (title, then "Lead Sponsor:"/"Co-sponsors:" lines
// separated by <br />), verified live against clip 18853 (2026-08-01).
const AGENDA_RE = /<a name="agenda(\d+)"[^>]*href="[^"]*meta_id=(\d+)"[^>]*>([\s\S]*?)<\/a>/g;
const STAFF_REPORT_RE = /<a href="([^"]*MetaViewer\.php[^"]*)"\s+name="document(\d+)"[^>]*>\s*Staff Report\s*<\/a>/g;
const DATE_RE = /^[A-Z][a-z]+day,\s+[A-Z][a-z]+\s+\d{1,2},\s+\d{4}$/;
const LEAD_RE = /Lead\s+[Ss]ponsor:\s*Councilmembers?\s+([^<\n]+)/;
const CO_RE = /Co-?sponsors?:\s*Councilmembers?\s+([^<\n]+)/i;
const stripTags = (s) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

function parseAgendaViewer(html) {
  let meetingDate = null;
  const items = [];
  const byExternalId = new Map();

  for (const m of html.matchAll(AGENDA_RE)) {
    const [, , metaId, rawBlock] = m;
    const plain = stripTags(rawBlock);
    if (!meetingDate && DATE_RE.test(plain)) {
      meetingDate = plain;
      continue;
    }
    const leadMatch = rawBlock.match(LEAD_RE);
    const coMatch = rawBlock.match(CO_RE);
    if (!leadMatch) continue; // not a sponsorable item (e.g. section header)

    const titleEnd = rawBlock.search(/Lead\s+[Ss]ponsor:/);
    const title = stripTags(rawBlock.slice(0, titleEnd)).replace(/[\s.]+$/, "");
    const item = {
      metaId,
      title,
      lead: splitNames(leadMatch[1])[0],
      coSponsors: coMatch ? splitNames(coMatch[1]) : [],
      videoUrl: `https://montgomerycountymd.granicus.com/MediaPlayer.php?view_id=${VIEW_ID}&clip_id=CLIP_ID&meta_id=${metaId}`,
      staffReportUrl: null,
    };
    items.push(item);
    byExternalId.set(metaId, item);
  }

  for (const m of html.matchAll(STAFF_REPORT_RE)) {
    const [, href, docMetaId] = m;
    // Staff reports are published at metaId+1 relative to their agenda item
    // in every meeting observed so far; if that offset doesn't resolve, the
    // item simply keeps staffReportUrl = null rather than guessing.
    const target = byExternalId.get(String(Number(docMetaId) - 1));
    if (target) target.staffReportUrl = href;
  }

  return { meetingDate, items };
}

// Parse "Tuesday, July 28, 2026" by its named parts rather than via
// new Date(...).toISOString() -- that pair parses local midnight and then
// converts to UTC, which silently rolls the date back a day on any
// UTC-ahead machine (verified: Sydney turns July 28 into 2026-07-27).
const MONTH_NUM = { January: 1, February: 2, March: 3, April: 4, May: 5, June: 6, July: 7, August: 8, September: 9, October: 10, November: 11, December: 12 };
function toISODate(spelledDate) {
  const m = spelledDate.match(/([A-Z][a-z]+)\s+(\d{1,2}),\s+(\d{4})$/);
  if (!m) return null;
  const month = MONTH_NUM[m[1]];
  if (!month) return null;
  return `${m[3]}-${String(month).padStart(2, "0")}-${String(m[2]).padStart(2, "0")}`;
}

const client = new Client({ connectionString: url });
await client.connect();
const run = await client.query(`INSERT INTO ingestion_runs (source) VALUES ($1) RETURNING id`, [SOURCE]);
const runId = run.rows[0].id;

try {
  // Scoped to THIS jurisdiction's offices only -- other DMV jurisdictions now
  // share this database, and a global roster risks a cross-jurisdiction
  // last-name collision unrelated to Montgomery's own agenda items.
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

  let minClipId = 0;
  if (sinceClip != null) {
    minClipId = Number(sinceClip);
  } else if (!full) {
    const { rows } = await client.query(
      `SELECT max(clip_id::int) AS max_clip FROM council_sponsorships WHERE jurisdiction_id = $1`,
      [COUNTY],
    );
    if (rows[0]?.max_clip != null) minClipId = rows[0].max_clip;
    // First-ever run (no rows yet): view_id=169's listing spans years and
    // multiple bodies, not just weekly Council Session. Rather than walk
    // the entire multi-year history on day one, an operator should pass
    // --since-clip explicitly to size the initial backfill deliberately.
    else throw new Error("no existing rows and no --since-clip given — pass --since-clip=<id> to size the first backfill, or --full to walk the entire history deliberately");
  }

  const publisherRes = await fetch(PUBLISHER_URL, { signal: AbortSignal.timeout(30000) });
  if (!publisherRes.ok) throw new Error(`granicus publisher ${publisherRes.status}`);
  const publisherHtml = await publisherRes.text();
  const clipIds = [...new Set([...publisherHtml.matchAll(/clip_id=(\d+)/g)].map((m) => Number(m[1])))]
    .filter((id) => id > minClipId)
    .sort((a, b) => a - b);

  let upserted = 0;
  const skippedNames = new Set();
  let dataThrough = null;

  for (const clipId of clipIds) {
    const res = await fetch(agendaViewerUrl(clipId), { signal: AbortSignal.timeout(30000), redirect: "follow" });
    if (res.status === 404) {
      // The listing spans years of clip_ids; some older ones have no
      // surviving AgendaViewer page. Benign — skip, don't fail the run.
      skippedNames.add(`(clip ${clipId}: 404, no agenda page, skipped)`);
      continue;
    }
    if (!res.ok) throw new Error(`granicus agenda viewer (clip ${clipId}) ${res.status}`);
    const html = await res.text();
    const { meetingDate, items } = parseAgendaViewer(html);
    const isoDate = meetingDate ? toISODate(meetingDate) : null;
    if (!isoDate) {
      skippedNames.add(`(clip ${clipId}: no parseable meeting date, skipped)`);
      continue;
    }
    if (!dataThrough || isoDate > dataThrough) dataThrough = isoDate;

    for (const item of items) {
      const videoUrl = item.videoUrl.replace("CLIP_ID", String(clipId));
      const sponsors = [
        [item.lead, "lead_sponsor"],
        ...item.coSponsors.map((name) => [name, "co_sponsor"]),
      ];
      for (const [key, role] of sponsors) {
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
          [polId, COUNTY, role, String(clipId), item.metaId, isoDate, item.title, videoUrl, item.staffReportUrl],
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
  console.log(`${SOURCE}: upserted ${upserted} sponsorship(s) across ${clipIds.length} clip(s), data through ${dataThrough ?? "n/a"}, ${skippedNames.size} unmapped/skipped`);
} catch (e) {
  await client.query(`UPDATE ingestion_runs SET finished_at = now(), status = 'failed', note = $2 WHERE id = $1`, [runId, String(e.message ?? e)]);
  console.error(`${SOURCE} FAILED: ${e.message ?? e}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
