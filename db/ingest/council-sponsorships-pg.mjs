#!/usr/bin/env node
// D-series ingester: Prince George's County Council agenda-item sponsorships.
//
// Source: Prince George's own Legistar Web API tenant (webapi.legistar.com/v1/
// princegeorgescountymd) -- unlike Montgomery's abandoned tenant, this one is
// live and current (data modified as recently as 2026-07-31, verified). Its
// Matters/{id}/Sponsors gives real, structured sponsor data directly -- no
// HTML scraping needed for the legislative facts. Only the video link still
// requires a light scan of Prince George's Granicus listing page, matched by
// date -- there is no API for that half.
//
// No word-level transcript attribution here either, same posture as
// council-sponsorships.mjs: a citation, not a scored position. Nothing here
// feeds politician_positions/scoring.
//
// Idempotent by construction: council_sponsorships has
// UNIQUE(politician_id, agenda_item_external_id). Incremental: only matters
// with MatterAgendaDate/MatterIntroDate on or after the cutover. Names map to
// politicians by accent-stripped last name, scoped to office_terms in THIS
// jurisdiction only (multiple jurisdictions now share this table, so the
// roster lookup is jurisdiction-scoped, unlike the single-jurisdiction
// original in council-sponsorships.mjs). Institutional sponsors (e.g. "County
// Executive", filed under MatterSponsorBodyId rather than a person) are
// skipped silently -- expected, not an error. Unmapped real names are still
// collected and reported via `note`, never guessed.
//
// Usage: node db/ingest/council-sponsorships-pg.mjs --since=YYYY-MM-DD [--url=<postgres url>]
// Scheduling: .github/workflows/ingest.yml (weekly, alongside the other agenda ingesters).

import { createRequire } from "node:module";
const require = createRequire(new URL("../../app/package.json", import.meta.url));
const { Client } = require("pg");

const SOURCE = "pg-agenda-items";
const COUNTY = "ocd-division/country:us/state:md/county:prince_georges";
const API = "https://webapi.legistar.com/v1/princegeorgescountymd";
const COUNCIL_BODY_ID = 138;
const GRANICUS_VIEW_ID = "2";
const GRANICUS_LISTING = `https://princegeorgescountymd.granicus.com/ViewPublisher.php?view_id=${GRANICUS_VIEW_ID}`;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

async function legistarGet(path) {
  const res = await fetch(`${API}${path}`, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`legistar ${path} ${res.status}`);
  return res.json();
}

function isoToGranicusDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

// Granicus's public listing has no API -- each meeting is one <tr> with a
// Name cell, a Date cell, and one or more clip_id-bearing links. Verified
// live against a real row: "County Council - SPECIAL MEETING" / "Jul 27,
// 2026" / clip_id=5187, which matched a real bill's MatterAgendaDate exactly.
function findClipForDate(html, isoDate) {
  const wanted = isoToGranicusDate(isoDate);
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  const nameRe = /headers="Name"[^>]*>\s*([^<]+?)\s*<\/td>/;
  const dateRe = /headers="Date[^"]*"[^>]*>(?:<span[^>]*>[^<]*<\/span>)?\s*([^<]+?)\s*<\/td>/;
  const clipRe = /clip_id=(\d+)/;
  let fallback = null;
  for (const row of html.matchAll(rowRe)) {
    const block = row[1];
    const dateMatch = block.match(dateRe);
    if (!dateMatch || dateMatch[1] !== wanted) continue;
    const clipMatch = block.match(clipRe);
    if (!clipMatch) continue;
    const nameMatch = block.match(nameRe);
    const clipId = clipMatch[1];
    if (nameMatch && /county council/i.test(nameMatch[1])) return clipId; // prefer the full-Council session on same-day conflicts
    if (!fallback) fallback = clipId;
  }
  return fallback;
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

  const matters = await legistarGet(
    `/Matters?$filter=MatterBodyId eq ${COUNCIL_BODY_ID} and MatterIntroDate ge datetime'${cutoff}'&$orderby=MatterIntroDate`,
  );

  let granicusHtml = null; // fetched lazily, once, only if a matter actually needs a video lookup
  let upserted = 0;
  const skippedNames = new Set();
  let dataThrough = null;

  for (const matter of matters) {
    const sponsors = await legistarGet(`/Matters/${matter.MatterId}/Sponsors`);
    const resolved = [];
    for (const sp of sponsors) {
      if (sp.MatterSponsorNameId == null) continue; // institutional sponsor (e.g. "County Executive"), not a person
      const key = lastNameKey(sp.MatterSponsorName);
      const polId = byLast.get(key);
      if (!polId) {
        skippedNames.add(key);
        continue;
      }
      resolved.push({ polId, role: sp.MatterSponsorSequence === 0 ? "lead_sponsor" : "co_sponsor" });
    }
    if (resolved.length === 0) continue;

    const meetingDate = (matter.MatterAgendaDate ?? matter.MatterIntroDate)?.slice(0, 10) ?? null;
    if (!meetingDate) continue;
    if (!dataThrough || meetingDate > dataThrough) dataThrough = meetingDate;

    let videoUrl = `https://princegeorgescountymd.legistar.com/LegislationDetail.aspx?ID=${matter.MatterId}&GUID=${matter.MatterGuid}`;
    let clipId = null;
    if (granicusHtml === null) {
      const res = await fetch(GRANICUS_LISTING, { signal: AbortSignal.timeout(30000) });
      granicusHtml = res.ok ? await res.text() : ""; // a failed Granicus fetch shouldn't kill legislative-data ingestion
    }
    if (granicusHtml) {
      clipId = findClipForDate(granicusHtml, meetingDate);
      if (clipId) videoUrl = `https://princegeorgescountymd.granicus.com/MediaPlayer.php?view_id=${GRANICUS_VIEW_ID}&clip_id=${clipId}`;
    }

    const attachments = await legistarGet(`/Matters/${matter.MatterId}/Attachments`);
    const summary = attachments.find((a) => a.MatterAttachmentShowOnInternetPage && /summary/i.test(a.MatterAttachmentName ?? ""))
      ?? attachments.find((a) => a.MatterAttachmentShowOnInternetPage);
    const staffReportUrl = summary?.MatterAttachmentHyperlink ?? null;

    for (const { polId, role } of resolved) {
      const ins = await client.query(
        `INSERT INTO council_sponsorships
           (politician_id, jurisdiction_id, role, clip_id, agenda_item_external_id, meeting_date, item_title, video_url, staff_report_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (politician_id, agenda_item_external_id) DO NOTHING`,
        [polId, COUNTY, role, clipId ?? "unresolved", String(matter.MatterId), meetingDate, matter.MatterTitle.slice(0, 500), videoUrl, staffReportUrl],
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
  console.log(`${SOURCE}: upserted ${upserted} sponsorship(s) across ${matters.length} matter(s), data through ${dataThrough ?? "n/a"}, ${skippedNames.size} unmapped/skipped`);
} catch (e) {
  await client.query(`UPDATE ingestion_runs SET finished_at = now(), status = 'failed', note = $2 WHERE id = $1`, [runId, String(e.message ?? e)]);
  console.error(`${SOURCE} FAILED: ${e.message ?? e}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
