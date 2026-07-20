#!/usr/bin/env node
// Model-suggested position coding (activates the schema's dormant
// coding_method='model_suggested' pathway — docs/CODING-STANDARDS.md governs
// every rule enforced below). Reads bill TITLES ONLY (no full text is in the
// ingested source), asks the model once per fully-uncoded bill whether it
// unambiguously answers one published axis, and if so drafts a position for
// every politician who voted on it. Every row lands with
// confirmed_by_human=FALSE — usable_for_scoring is a generated column, so no
// suggestion can score anyone before a human confirms it in /admin/coding.
//
// This script is deliberately NOT wired into the unattended weekly ingest
// cron: it spends real API budget and drafts claims about real people, so
// each run is a deliberate, owner-approved action (workflow_dispatch or
// local), never silent automation.
//
// Usage: node db/suggest-codings.mjs [--limit=20] [--dry-run] [--url=...]

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(new URL("../app/package.json", import.meta.url));
const { Client } = require("pg");

const args = process.argv.slice(2);
const opt = (name, dflt) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? dflt;
const limit = Number(opt("limit", "20"));
const dryRun = args.includes("--dry-run");
const url = opt("url", process.env.DATABASE_URL ?? "postgres://postgres:vr@localhost:5433/voteright");
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error("ANTHROPIC_API_KEY is required.");
  process.exit(2);
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STANDARDS = readFileSync(path.join(HERE, "..", "docs", "CODING-STANDARDS.md"), "utf8");
const MODEL = "claude-haiku-4-5-20251001";

const client = new Client({ connectionString: url });
await client.connect();

async function askModel(billTitle, axes) {
  const axisList = axes.map((a) => `- key="${a.key}" topic="${a.topic}" question="${a.question}" (-2="${a.negative_pole}", +2="${a.positive_pole}")`).join("\n");
  const prompt = `You are drafting a DRAFT position coding for a civic-transparency platform, governed by these binding standards:

${STANDARDS}

You have ONLY the bill's title (no full text). Bill title: "${billTitle}"

Published axes:
${axisList}

Does this bill title name the EXACT policy one axis's question asks about, or is it a CLEAR ADJACENT match (same underlying disposition, different specific subject — per standard P2 above)? Report either kind; the caller applies P2's magnitude cap in code, not you. Only return no-match if there is truly no discernible connection. Respond with ONLY a JSON object, no other text:

{"exact_match": true|false, "axis_key": "<key or null>", "yea_value": <-2..2 or null>, "subject": "<one clause naming the bill's actual subject, or null>"}

exact_match=true only if the title names the precise policy the axis's pole describes (e.g. title contains "Rent Stabilization" for a rent-cap axis). exact_match=false with a populated axis_key means a clear adjacent match (e.g. a climate-finance mechanism for a zero-emissions-target axis). yea_value is what a YEA vote means on that axis (sign matters), using full magnitude (2) for your confidence in DIRECTION even if exact_match is false — the caller reduces adjacent-match magnitude to 1 automatically. If there is truly no discernible connection to any axis, return {"exact_match": false, "axis_key": null, "yea_value": null, "subject": null}.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.content?.[0]?.text ?? "{}";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  return JSON.parse(jsonMatch ? jsonMatch[0] : "{}");
}

try {
  const axesRes = await client.query(
    `SELECT a.id, a.key, t.name AS topic, a.question, a.negative_pole, a.positive_pole
       FROM topic_axes a JOIN topics t ON t.id = a.topic_id`,
  );
  const axes = axesRes.rows;
  const axisById = new Map(axes.map((a) => [a.key, a]));

  // Bills with votes, where NOT EVERY axis has already been checked/coded for
  // this bill (approximated: bill has at least one vote and no politician_positions
  // row cites its source_url yet — a fully-uncoded bill).
  const billsRes = await client.query(
    `SELECT DISTINCT v.bill_external_id, v.bill_title, v.source_url
       FROM voting_records v
      WHERE NOT EXISTS (
        SELECT 1 FROM politician_positions pp JOIN citations c ON c.id = pp.citation_id
         WHERE c.url = v.source_url
      )
      ORDER BY v.bill_external_id
      LIMIT $1`,
    [limit],
  );

  console.log(`examining ${billsRes.rows.length} fully-uncoded bill(s) (limit ${limit}, model ${MODEL}, dry-run=${dryRun})`);

  let suggested = 0;
  let skipped = 0;
  let positionsCreated = 0;

  for (const bill of billsRes.rows) {
    let draft;
    try {
      draft = await askModel(bill.bill_title, axes);
    } catch (e) {
      console.error(`  ${bill.bill_external_id}: model call failed — ${e.message}`);
      skipped++;
      continue;
    }
    if (!draft.axis_key || draft.yea_value === null || !axisById.has(draft.axis_key)) {
      skipped++;
      continue;
    }
    const axis = axisById.get(draft.axis_key);
    // P2 enforced in code, not trusted from the model: non-exact match caps at magnitude 1.
    const magnitude = draft.exact_match ? Math.min(2, Math.abs(draft.yea_value)) : Math.min(1, Math.abs(draft.yea_value) || 1);
    const yeaValue = Math.sign(draft.yea_value || 1) * magnitude || magnitude;
    suggested++;
    console.log(`  ${bill.bill_external_id} → ${draft.axis_key} (yea=${yeaValue}, exact=${draft.exact_match}) — "${bill.bill_title}"`);

    if (dryRun) continue;

    const votes = await client.query(
      `SELECT politician_id, vote FROM voting_records WHERE bill_external_id = $1 AND vote IN ('yea','nay')`,
      [bill.bill_external_id],
    );
    for (const v of votes.rows) {
      // P1: a nay-to-enact never mirrors full magnitude; it codes at −1 in the
      // opposing direction regardless of the yea value's own magnitude.
      const value = v.vote === "yea" ? yeaValue : Math.sign(-yeaValue) * Math.min(1, Math.abs(yeaValue));
      const subject = draft.subject ? `, on ${draft.subject}` : "";
      const adjacentNote = draft.exact_match ? "" : ` (adjacent to this axis's literal question, not a direct match)`;
      const statement = `${v.vote === "yea" ? "Voted for" : "Voted against"} Bill ${bill.bill_external_id}${subject}${adjacentNote}.`;

      const dup = await client.query(
        `SELECT 1 FROM politician_positions pp JOIN citations c ON c.id = pp.citation_id
          JOIN position_codings pc ON pc.position_id = pp.id
         WHERE pp.politician_id = $1 AND c.url = $2 AND pc.axis_id = $3`,
        [v.politician_id, bill.source_url, axis.id],
      );
      if (dup.rowCount) continue; // P4

      const cit = await client.query(
        `INSERT INTO citations (url, archive_url, title, publisher)
         VALUES ($1, 'https://web.archive.org/web/' || $1, $2, 'Montgomery County legislative record')
         RETURNING id`,
        [bill.source_url, `${bill.bill_external_id} · roll call · ${v.vote.toUpperCase()}`],
      );
      const pos = await client.query(
        `INSERT INTO politician_positions (politician_id, topic_id, statement, source_type, citation_id)
         SELECT $1, topic_id, $2, 'voting_record_inferred', $3 FROM topic_axes WHERE id = $4
         RETURNING id`,
        [v.politician_id, statement, cit.rows[0].id, axis.id],
      );
      await client.query(
        `INSERT INTO position_codings (position_id, axis_id, value, coding_method, confirmed_by_human, coder_note)
         VALUES ($1, $2, $3, 'model_suggested', FALSE, $4)`,
        [pos.rows[0].id, axis.id, value, `Model-drafted (${MODEL}) from bill title only; exact_match=${draft.exact_match}. Awaiting human confirmation.`],
      );
      positionsCreated++;
    }
  }

  console.log(`\ndone: ${suggested} bill(s) matched an axis, ${skipped} skipped (no clear match or error), ${positionsCreated} draft position(s) queued in /admin/coding${dryRun ? " [dry run — nothing written]" : ""}`);
} finally {
  await client.end();
}
