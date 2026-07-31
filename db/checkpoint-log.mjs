#!/usr/bin/env node
// Records one outcome row for the daily checkpoint-and-publish cron job
// (db/checkpoint-and-publish.sh) into the SAME ingestion_runs ledger the
// data-feed ingesters use, under source='checkpoint-publish'. This isn't a
// data feed (nothing is being pulled from an external source) -- it's the
// reverse, publishing our own signed_actions chain head out for public
// tamper-evidence -- but reusing the ledger means it gets the admin
// freshness panel's fresh/stale/failed treatment for free, and "the daily
// checkpoint silently stopped publishing" becomes visible the same way "the
// county stopped publishing bill data" already is.
//
// Called at the END of checkpoint-and-publish.sh, after the full
// compute-then-git-push sequence, so status reflects whether the checkpoint
// actually got PUBLISHED (pushed), not merely computed locally.
//
// Env vars (set by the caller):
//   CHECKPOINT_STATUS  'succeeded' | 'failed'
//   CHECKPOINT_NOTE    free-text outcome detail
//   CHECKPOINT_DATE    YYYY-MM-DD, the checkpoint's own date (data_through)
//   DATABASE_URL       same convention as every other db/*.mjs script

import { createRequire } from "node:module";
const require = createRequire(new URL("../app/package.json", import.meta.url));
const { Client } = require("pg");

const status = process.env.CHECKPOINT_STATUS;
if (status !== "succeeded" && status !== "failed") {
  console.error("CHECKPOINT_STATUS must be 'succeeded' or 'failed'");
  process.exit(2);
}
const note = process.env.CHECKPOINT_NOTE ?? null;
const dataThrough = process.env.CHECKPOINT_DATE ?? null;
const url = process.env.DATABASE_URL ?? "postgres://postgres:vr@localhost:5433/voteright";

const client = new Client({ connectionString: url });
await client.connect();
try {
  await client.query(
    `INSERT INTO ingestion_runs (source, finished_at, status, data_through, note)
     VALUES ('checkpoint-publish', now(), $1, $2, $3)`,
    [status, dataThrough, note],
  );
  console.log(`checkpoint-publish: logged ${status}${dataThrough ? " (data_through " + dataThrough + ")" : ""}`);
} finally {
  await client.end();
}
