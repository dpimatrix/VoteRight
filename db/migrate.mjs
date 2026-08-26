#!/usr/bin/env node
// Dependency-free migration runner (docs/DATA-OPS.md §1). Uses the app's pg —
// nothing new to install. Ledger lives in schema_migrations.
//
//   node db/migrate.mjs status              what's applied / pending
//   node db/migrate.mjs up                  apply pending migrations in order
//   node db/migrate.mjs baseline            mark all pending as applied WITHOUT
//                                           running them (fresh DBs built from the
//                                           full SCHEMA.sql already contain them)
//
// Connection: --url=… > DATABASE_URL (env var, or read directly from
// app/.env.production / app/.env.local if not already set -- this script
// runs standalone, outside Next's own .env.production loading) > local dev
// default.
// Files: db/migrations/NNN_description.sql (append-only, numbered), or --dir=….
//
// Runbook (the PR #4 lesson, systematized): migrations run against Neon BEFORE
// the code that needs them deploys. Every schema change lands in BOTH a
// migration file and docs/SCHEMA.sql.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(new URL("../app/package.json", import.meta.url));
const { Client } = require("pg");

const args = process.argv.slice(2);
const cmd = args.find((a) => !a.startsWith("--")) ?? "status";
const opt = (name) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const dir = opt("dir") ?? path.join(path.dirname(fileURLToPath(import.meta.url)), "migrations");

// Real production failure (2026-08-26): despite this file's own doc comment
// above claiming "DATABASE_URL sourced from app/.env.production first",
// nothing here ever actually read that file -- this script runs standalone
// (not through Next's tooling, which loads .env.production for the app
// itself), so it silently fell through to the local-dev default even in
// production. Same env-file fallback close-and-notify-threads.mjs already
// uses for the identical reason (a systemd --user service/manual script
// invocation doesn't inherit an interactive shell's exported vars either).
if (!process.env.DATABASE_URL) {
  for (const f of ["app/.env.production", "app/.env.local"]) {
    if (!existsSync(f)) continue;
    const m = readFileSync(f, "utf8").match(/^DATABASE_URL=(.*)$/m);
    if (m) {
      process.env.DATABASE_URL = m[1].replace(/^["']|["']$/g, "");
      break;
    }
  }
}
// || not ?? on the final fallback -- an accidentally-exported-but-empty
// DATABASE_URL (hit live during this same incident, from a shell mistake)
// should fall through to the default too, not get used as a literally-empty
// connection string that fails with a confusing SASL error instead of a
// clear "connection refused" against the obvious local default.
const url = opt("url") || process.env.DATABASE_URL || "postgres://postgres:vr@localhost:5433/voteright";

const files = readdirSync(dir)
  .filter((f) => /^\d{3}_[\w-]+\.sql$/.test(f))
  .sort();

const client = new Client({ connectionString: url });
await client.connect();
try {
  await client.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       filename   TEXT PRIMARY KEY,
       applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
       baseline   BOOLEAN NOT NULL DEFAULT FALSE
     )`,
  );
  const { rows } = await client.query(`SELECT filename FROM schema_migrations`);
  const applied = new Set(rows.map((r) => r.filename));
  const pending = files.filter((f) => !applied.has(f));

  if (cmd === "status") {
    console.log(`${files.length} migration(s) on disk · ${applied.size} in ledger · ${pending.length} pending`);
    for (const f of files) console.log(`  [${applied.has(f) ? "x" : " "}] ${f}`);
  } else if (cmd === "baseline") {
    for (const f of pending) {
      await client.query(`INSERT INTO schema_migrations (filename, baseline) VALUES ($1, TRUE)`, [f]);
    }
    console.log(`baseline: marked ${pending.length} migration(s) applied without running`);
  } else if (cmd === "up") {
    let n = 0;
    for (const f of pending) {
      const sql = readFileSync(path.join(dir, f), "utf8");
      process.stdout.write(`applying ${f} … `);
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query(`INSERT INTO schema_migrations (filename) VALUES ($1)`, [f]);
        await client.query("COMMIT");
        console.log("ok");
        n++;
      } catch (e) {
        await client.query("ROLLBACK");
        console.log("FAILED");
        console.error(`  ${e.message}`);
        console.error(`  rolled back; ledger unchanged; later migrations not attempted.`);
        process.exitCode = 1;
        break;
      }
    }
    if (process.exitCode !== 1) console.log(n ? `applied ${n} migration(s)` : "nothing pending");
  } else {
    console.error(`unknown command: ${cmd} (use status | up | baseline)`);
    process.exitCode = 2;
  }
} finally {
  await client.end();
}
