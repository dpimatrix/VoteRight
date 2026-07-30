#!/usr/bin/env node
// Daily tamper-evidence checkpoint for the signed_actions chain
// (ARCHITECTURE.md Section 10). Writes the current chain head (seq +
// chain_hash) to docs/audit-checkpoints/YYYY-MM-DD.json - once committed and
// pushed, anyone can later recompute the chain from the live database and
// confirm it still produces this exact value. A mismatch proves the
// historical record was altered after this checkpoint was published; this
// script only detects that, it cannot prevent it (see the plan's discussion
// of what this design does and doesn't guarantee).
//
// This script only computes the checkpoint and writes the file - it does not
// commit or push. See docs/DEPLOY.md for how that's wired up (a VPS-side cron
// + git push, not GitHub Actions, since Postgres isn't publicly reachable).
//
// Usage: node db/checkpoint.mjs [--url=<postgres url>]

import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(new URL("../app/package.json", import.meta.url));
const { Client } = require("pg");

const args = process.argv.slice(2);
const url = args.find((a) => a.startsWith("--url="))?.slice(6) ?? process.env.DATABASE_URL ?? "postgres://postgres:vr@localhost:5433/voteright";

const client = new Client({ connectionString: url });
await client.connect();

try {
  const head = await client.query(`SELECT seq, chain_hash FROM signed_actions ORDER BY seq DESC LIMIT 1`);
  const count = await client.query(`SELECT count(*)::int AS n FROM signed_actions`);

  if (head.rowCount === 0) {
    console.log("No signed_actions yet - nothing to checkpoint.");
    process.exit(0);
  }

  const checkpoint = {
    date: new Date().toISOString().slice(0, 10),
    seq: head.rows[0].seq,
    chain_hash: head.rows[0].chain_hash,
    row_count: count.rows[0].n,
  };

  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
  const dir = join(repoRoot, "docs", "audit-checkpoints");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${checkpoint.date}.json`);
  writeFileSync(path, JSON.stringify(checkpoint, null, 2) + "\n");

  console.log(`Wrote checkpoint: ${path}`);
  console.log(JSON.stringify(checkpoint));
} finally {
  await client.end();
}
