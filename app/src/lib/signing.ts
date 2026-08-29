import { createHash, createPublicKey, verify as cryptoVerify } from "node:crypto";
import type { PoolClient } from "pg";
import { db } from "./db";
export {
  canonicalArgumentPayload,
  canonicalProposalPayload,
  canonicalSecondPayload,
  canonicalAccountabilitySupportPayload,
  canonicalKeyProofPayload,
} from "./canonical";

/* Non-repudiation ledger for participant civic speech (ARCHITECTURE.md Section 10).
   Ed25519 public keys are stored/transmitted as raw 32-byte base64 everywhere -
   what both Web Crypto's exportKey("raw") and @noble/ed25519 produce - this module
   is the only place that wraps that into the JWK shape node:crypto needs to verify.

   Referendum ballot choices and argument agreement votes are deliberately NEVER
   signed here (Section 10.1/10.2 secret-ballot discipline) - this module is only
   ever called from already-public write paths (arguments, proposals, seconds,
   accountability support). */

// Fixed key for pg_advisory_xact_lock - serializes chain appends across concurrent
// transactions so two writers can't both extend from the same prev_hash. Released
// automatically at COMMIT/ROLLBACK since callers already run inside a transaction.
const CHAIN_LOCK_KEY = 847291003;

function publicKeyFromRaw(rawBase64: string) {
  const raw = Buffer.from(rawBase64, "base64");
  if (raw.length !== 32) throw new Error("invalid Ed25519 public key length");
  return createPublicKey({ key: { kty: "OKP", crv: "Ed25519", x: raw.toString("base64url") }, format: "jwk" });
}

export function verifySignature(canonicalPayload: string, signatureB64: string, publicKeyRawB64: string): boolean {
  try {
    const key = publicKeyFromRaw(publicKeyRawB64);
    return cryptoVerify(null, Buffer.from(canonicalPayload, "utf8"), key, Buffer.from(signatureB64, "base64"));
  } catch {
    return false;
  }
}

export function fingerprint(publicKeyRawB64: string): string {
  return createHash("sha256").update(Buffer.from(publicKeyRawB64, "base64")).digest("base64url").slice(0, 22);
}

export function chainHash(prevHash: string | null, canonicalPayload: string, signatureB64: string): string {
  return createHash("sha256").update(`${prevHash ?? ""}|${canonicalPayload}|${signatureB64}`).digest("base64url");
}

/* A key is "retired" only once it's been explicitly rotated away or revoked
   -- every OTHER event a key can log (registered, recovered,
   used_from_new_context) annotates its history without retiring it, so
   "currently valid" must check against this allowlist, not equality against
   the single literal 'registered'.

   Real bug found live 2026-08-19: both functions below used to require the
   most recent row to be exactly 'registered'. That's true for a key's
   FIRST-ever row, but 'recovered' (ownerOfValidKey below, migration 088's
   identity-recovery feature) and 'used_from_new_context' (anomalyDetection's
   flagIfNewContext, whenever a key signs from a second device/network) both
   log a NEWER row for a key that is still perfectly valid to keep signing
   with. The strict-equality check treated that newer, non-retiring row as if
   the key had been retired -- so right after a successful identity recovery,
   the recovered key could no longer sign anything new (recordSignedAction
   called keyCurrentlyValid and got false), and couldn't even self-heal via
   /api/keys/rotate, which gates on this exact same check. The same flaw
   already existed for any key that had ever signed from two different
   network contexts, predating today's recovery feature. */
const NON_RETIRING_EVENTS = new Set(["registered", "recovered", "used_from_new_context"]);

/** A key is valid for signing iff its most recent user_key_events row (for
    that exact fingerprint) is one of NON_RETIRING_EVENTS above -- a later
    'rotated' or 'revoked' row is what actually retires it. Must be called
    inside the same transaction as the eventual insert to avoid a TOCTOU gap
    between checking and writing. */
export async function keyCurrentlyValid(
  client: PoolClient,
  userId: string,
  publicKeyFingerprint: string,
): Promise<boolean> {
  const { rows } = await client.query(
    `SELECT event FROM user_key_events
      WHERE user_id = $1 AND public_key_fingerprint = $2
      ORDER BY created_at DESC LIMIT 1`,
    [userId, publicKeyFingerprint],
  );
  return NON_RETIRING_EVENTS.has(rows[0]?.event);
}

/** Identity recovery (2026-08-19): which user_id currently owns this key --
    i.e. its most recent user_key_events row for this exact fingerprint is
    one of NON_RETIRING_EVENTS above -- or null if the key was never
    registered, or has since been rotated/revoked away. Same "most recent
    event wins, checked against the non-retiring allowlist" rule
    keyCurrentlyValid() uses, just discovering the user_id instead of
    confirming one already in hand -- that's the whole mechanism behind
    KeySettings.tsx's "Restore from a backup" re-associating a session with
    its original identity. A revoked (or rotated-away) key's most recent
    event is 'revoked'/'rotated', neither of which is in the allowlist, so
    this correctly returns null for it -- a leaked, revoked backup can never
    recover the old identity, and a second recovery with the same backup
    file still finds the right owner instead of minting an unrelated new
    identity (recovery itself logs 'recovered', which stays in the
    allowlist).

    Takes a PoolClient, not db() directly (changed 2026-08-29) -- same
    reasoning as keyCurrentlyValid's own doc comment: must run inside the
    same transaction as the caller's eventual write, behind
    lockKeyFingerprint() below, to avoid a TOCTOU gap. Real bug found live:
    /api/keys/recover used to call this via a bare db() query, completely
    outside any transaction -- a revoke could commit its 'revoked' row
    between this read and recover's later write, and recover would still
    proceed to insert a 'recovered' row (recovered is non-retiring) on top
    of it, silently undoing the revoke and handing the revoker's identity
    to whoever raced it. */
export async function ownerOfValidKey(client: PoolClient, publicKeyFingerprint: string): Promise<string | null> {
  const { rows } = await client.query(
    `SELECT user_id, event FROM user_key_events
      WHERE public_key_fingerprint = $1
      ORDER BY created_at DESC LIMIT 1`,
    [publicKeyFingerprint],
  );
  return rows[0] && NON_RETIRING_EVENTS.has(rows[0].event) ? (rows[0].user_id as string) : null;
}

/** Serializes every read-then-write sequence touching this exact key
    fingerprint's event history across /register, /recover, /revoke, and
    /rotate -- an ordinary transaction alone (which revoke/rotate already
    used) only protects against races within the SAME connection/request;
    it does nothing against a DIFFERENT concurrent request reading the
    pre-commit state via its own separate query, which is exactly how the
    recover-vs-revoke race above was possible even though revoke itself was
    already transactional. hashtext() collisions are possible in principle
    (32-bit) but only cost a spurious lock-wait between two DIFFERENT
    fingerprints that happen to collide, never incorrect behavior --
    advisory locks are just mutual exclusion, not a correctness check on
    their own. Released automatically at COMMIT/ROLLBACK. */
export async function lockKeyFingerprint(client: PoolClient, publicKeyFingerprint: string): Promise<void> {
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [publicKeyFingerprint]);
}

export type ActionType = "argument" | "issue_proposal" | "second" | "accountability_support";

/** Verifies the signature, confirms the key is currently valid, appends one row to
    the hash chain under an advisory lock, and returns its id to attach as
    `signed_action_id` on the caller's own INSERT - all within the caller's already-
    open transaction (see postArgument/secondProposal in debates.ts for the pattern
    this slots into). Throws on any failure; the caller's existing catch/ROLLBACK
    handles it - a rejected signature must not partially write anything. */
export async function recordSignedAction(
  client: PoolClient,
  opts: {
    userId: string;
    publicKeyFingerprint: string;
    actionType: ActionType;
    canonicalPayload: string;
    signature: string;
    contextHash?: string;
  },
): Promise<string> {
  if (!verifySignature(opts.canonicalPayload, opts.signature, await publicKeyFor(client, opts.publicKeyFingerprint))) {
    throw new Error("signature verification failed");
  }
  if (!(await keyCurrentlyValid(client, opts.userId, opts.publicKeyFingerprint))) {
    throw new Error("signing key is not currently valid (unregistered or revoked)");
  }
  await client.query("SELECT pg_advisory_xact_lock($1)", [CHAIN_LOCK_KEY]);
  // Must run BEFORE inserting this action's own row below - otherwise the
  // "have we seen this context before" check would always match against the
  // row this very call is about to create, and nothing would ever be flagged.
  if (opts.contextHash) await flagIfNewContext(client, opts.userId, opts.publicKeyFingerprint, opts.contextHash);
  const head = await client.query(`SELECT chain_hash FROM signed_actions ORDER BY seq DESC LIMIT 1`);
  const prevHash: string | null = head.rows[0]?.chain_hash ?? null;
  const hash = chainHash(prevHash, opts.canonicalPayload, opts.signature);
  const { rows } = await client.query(
    `INSERT INTO signed_actions
       (user_id, public_key_fingerprint, action_type, canonical_payload, signature, prev_hash, chain_hash, context_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [opts.userId, opts.publicKeyFingerprint, opts.actionType, opts.canonicalPayload, opts.signature, prevHash, hash, opts.contextHash ?? null],
  );
  return rows[0].id as string;
}

/** Anomaly detection (required, not optional - see the plan's discussion of why):
    the first time a key signs from a context (hashed IP+User-Agent) not seen
    before for that exact key, log a 'used_from_new_context' event. This is what
    makes a stolen/misused key detectable in practice, without any tracking
    beyond what's needed for this one equality check - never the raw IP/UA. */
async function flagIfNewContext(
  client: PoolClient,
  userId: string,
  publicKeyFingerprint: string,
  contextHash: string,
): Promise<void> {
  const seen = await client.query(
    `SELECT 1 FROM signed_actions WHERE public_key_fingerprint = $1 AND context_hash = $2
     UNION ALL
     SELECT 1 FROM user_key_events WHERE public_key_fingerprint = $1 AND context_hash = $2
     LIMIT 1`,
    [publicKeyFingerprint, contextHash],
  );
  if (seen.rowCount && seen.rowCount > 0) return;
  await client.query(
    `INSERT INTO user_key_events (user_id, event, public_key, public_key_fingerprint, context_hash)
     SELECT $1, 'used_from_new_context', public_key, $2, $3
       FROM user_key_events WHERE public_key_fingerprint = $2 ORDER BY created_at DESC LIMIT 1`,
    [userId, publicKeyFingerprint, contextHash],
  );
}

async function publicKeyFor(client: PoolClient, publicKeyFingerprint: string): Promise<string> {
  const { rows } = await client.query(
    `SELECT public_key FROM user_key_events WHERE public_key_fingerprint = $1 ORDER BY created_at DESC LIMIT 1`,
    [publicKeyFingerprint],
  );
  if (!rows[0]) throw new Error("unknown public key fingerprint");
  return rows[0].public_key as string;
}

/** Hashes an IP + User-Agent pair for the anomaly-detection context check - never
    stores either raw value, only this digest, and only enough of it to compare
    equality (not to recover the inputs). */
export function hashContext(ip: string, userAgent: string): string {
  return createHash("sha256").update(`${ip}|${userAgent}`).digest("base64url").slice(0, 24);
}
