#!/usr/bin/env node
// D2 ingester: Montgomery County Council roll-call votes (docs/DATA-OPS.md D2/§6).
//
// Source: the county's official open-data dataset "Montgomery County Council
// Legislation Bills" (Socrata ksj8-bd3u on data.montgomerycountymd.gov) — one
// row per bill with per-member `yeas`/`nays` name lists, action_date, status,
// and the signed-bill PDF. Facts with citations; no interpretation happens
// here (positions/codings remain the human queue's job, §2.3).
//
// Idempotent by construction: voting_records has UNIQUE(politician_id,
// bill_external_id); re-runs are no-ops. Incremental: fetches rows with
// action_date >= (max ingested - 30d overlap). Names map to politicians by
// accent-stripped last name — unknown names (pre-roster members) are skipped
// and counted, never guessed.
//
// Usage: node db/ingest/votes.mjs [--full] [--url=<postgres url>]
// Scheduling: .github/workflows/ingest.yml (weekly, per DATA-OPS §6).

import { createRequire } from "node:module";
const require = createRequire(new URL("../../app/package.json", import.meta.url));
const { Client } = require("pg");

const SOURCE = "moco-council-bills";
const DATASET = "https://data.montgomerycountymd.gov/resource/ksj8-bd3u.json";
const DATASET_PAGE = "https://data.montgomerycountymd.gov/Government/Montgomery-County-Council-Legislation-Bills/ksj8-bd3u";
const COUNTY = "ocd-division/country:us/state:md/county:montgomery";

const args = process.argv.slice(2);
const full = args.includes("--full");
const url = args.find((a) => a.startsWith("--url="))?.slice(6) ?? process.env.DATABASE_URL ?? "postgres://postgres:vr@localhost:5433/voteright";

const stripAccents = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const lastNameKey = (fullName) => stripAccents(fullName.trim().split(/\s+/).at(-1)).toLowerCase();

const client = new Client({ connectionString: url });
await client.connect();
const run = await client.query(`INSERT INTO ingestion_runs (source) VALUES ($1) RETURNING id`, [SOURCE]);
const runId = run.rows[0].id;

try {
  // Roster map: accent-stripped last name → politician id, but ONLY for people
  // who have ever held an office (office_terms) — they're the only ones who can
  // appear in roll-call name lists, and it keeps unrelated challengers who share
  // a last name (e.g., the two 2026 Wells candidacies) out of the collision set.
  const pols = await client.query(
    `SELECT DISTINCT p.id, p.full_name FROM politicians p
      JOIN office_terms ot ON ot.politician_id = p.id`,
  );
  const byLast = new Map();
  for (const p of pols.rows) {
    const key = lastNameKey(p.full_name);
    if (byLast.has(key)) throw new Error(`ambiguous last name in roster: ${key}`);
    byLast.set(key, p.id);
  }

  let since = "1900-01-01";
  if (!full) {
    const { rows } = await client.query(
      `SELECT (max(voted_at) - interval '30 days')::date::text AS since FROM voting_records WHERE jurisdiction_id = $1`,
      [COUNTY],
    );
    if (rows[0]?.since) since = rows[0].since;
  }

  let upserted = 0;
  let skippedNames = new Set();
  let dataThrough = null;
  for (let offset = 0; ; offset += 1000) {
    const u = new URL(DATASET);
    u.searchParams.set("$limit", "1000");
    u.searchParams.set("$offset", String(offset));
    u.searchParams.set("$order", "action_date");
    u.searchParams.set("$where", `action_date >= '${since}'`);
    const res = await fetch(u, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`socrata ${res.status}`);
    const rows = await res.json();
    if (rows.length === 0) break;

    for (const r of rows) {
      if (!r.bill_no || !r.action_date) continue;
      const votedAt = r.action_date.slice(0, 10);
      if (!dataThrough || votedAt > dataThrough) dataThrough = votedAt;
      const sourceUrl = r.enacted_bill?.url ?? `${DATASET_PAGE}#bill_no=${encodeURIComponent(r.bill_no)}`;
      const title = (r.title ?? "(untitled)").slice(0, 500);
      for (const [names, vote] of [
        [r.yeas, "yea"],
        [r.nays, "nay"],
      ]) {
        if (!names) continue;
        for (const raw of names.split(",")) {
          const key = stripAccents(raw.trim()).toLowerCase();
          if (!key) continue;
          const polId = byLast.get(key);
          if (!polId) {
            skippedNames.add(key);
            continue;
          }
          const ins = await client.query(
            `INSERT INTO voting_records (politician_id, jurisdiction_id, bill_external_id, bill_title, vote, voted_at, source_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (politician_id, bill_external_id) DO NOTHING`,
            [polId, COUNTY, r.bill_no, title, vote, votedAt, sourceUrl],
          );
          upserted += ins.rowCount ?? 0;
        }
      }
    }
    if (rows.length < 1000) break;
  }

  await client.query(
    `UPDATE ingestion_runs SET finished_at = now(), status = 'succeeded',
            rows_upserted = $2, rows_skipped = $3, data_through = $4,
            note = $5
      WHERE id = $1`,
    [runId, upserted, skippedNames.size, dataThrough, skippedNames.size ? `unmapped last names (pre-roster members, skipped): ${[...skippedNames].sort().join(", ")}` : null],
  );
  console.log(`${SOURCE}: upserted ${upserted} vote(s), data through ${dataThrough ?? "n/a"}, ${skippedNames.size} unmapped name(s) skipped`);
} catch (e) {
  await client.query(`UPDATE ingestion_runs SET finished_at = now(), status = 'failed', note = $2 WHERE id = $1`, [runId, String(e.message ?? e)]);
  console.error(`${SOURCE} FAILED: ${e.message ?? e}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
