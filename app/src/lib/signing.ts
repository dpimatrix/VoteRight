import { createHash, createPublicKey, verify as cryptoVerify } from "node:crypto";
import type { PoolClient } from "pg";
export {
  canonicalArgumentPayload,
  canonicalProposalPayload,
  canonicalSecondPayload,
  canonicalAccountabilitySupportPayload,
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

/** A key is valid for signing iff its most recent user_key_events row (for that
    exact fingerprint) is 'registered' - a later 'rotated' or 'revoked' row retires
    it. Must be called inside the same transaction as the eventual insert to avoid
    a TOCTOU gap between checking and writing. */
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
  return rows[0]?.event === "registered";
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
