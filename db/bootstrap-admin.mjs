#!/usr/bin/env node
// One-time bootstrap for the first admin account (2026-08-19, migration 086).
// Seeds admin_accounts from the EXISTING ADMIN_TOTP_SECRET env var, so the
// owner's already-enrolled authenticator app entry keeps working with zero
// re-enrollment -- the per-admin accounts model (migration 086) replaces the
// single shared secret this reads from, but only needs to be run once.
// Idempotent: re-running just updates the existing account by username
// rather than erroring or duplicating it.
//
//   ADMIN_TOTP_SECRET=<existing base32 secret> node db/bootstrap-admin.mjs --username=owner
//
// Connection: --url=… > DATABASE_URL > local dev default (same convention as migrate.mjs).

import { createRequire } from "node:module";

const require = createRequire(new URL("../app/package.json", import.meta.url));
const { Client } = require("pg");

const args = process.argv.slice(2);
const opt = (name) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const username = opt("username") ?? "owner";
const url = opt("url") ?? process.env.DATABASE_URL ?? "postgres://postgres:vr@localhost:5433/voteright";
const totpSecret = process.env.ADMIN_TOTP_SECRET;

if (!totpSecret) {
  console.error("ADMIN_TOTP_SECRET must be set in the environment -- this reads the existing secret, it doesn't generate one.");
  process.exit(1);
}

const client = new Client({ connectionString: url });
await client.connect();
try {
  const { rows } = await client.query(
    `INSERT INTO admin_accounts (username, totp_secret) VALUES ($1, $2)
     ON CONFLICT (username) DO UPDATE SET totp_secret = EXCLUDED.totp_secret, disabled_at = NULL
     RETURNING id`,
    [username, totpSecret],
  );
  const adminId = rows[0].id;
  // Every screen key -- imported statically rather than duplicated here
  // would need app/'s TS build; this list is copied from adminAuth.ts's
  // SCREEN_KEYS and must stay in sync (both are short, human-reviewed lists,
  // not worth a build step just to share one array between a .mjs script
  // and a .ts library).
  const screens = [
    "disputes", "coding", "moderation", "anomalies", "payments", "subscriptions",
    "mandates", "accountability", "privacy", "positions", "transparency", "admin_accounts",
  ];
  for (const s of screens) {
    await client.query(
      `INSERT INTO admin_screen_access (admin_id, screen_key) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [adminId, s],
    );
  }
  console.log(`Bootstrapped admin account "${username}" (${adminId}) with all ${screens.length} screens.`);
} finally {
  await client.end();
}
