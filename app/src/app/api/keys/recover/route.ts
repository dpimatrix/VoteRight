import { adoptIdentity, currentOrNewUserId } from "@/lib/anon";
import { db } from "@/lib/db";
import {
  canonicalKeyProofPayload,
  fingerprint as fingerprintOf,
  hashContext,
  lockKeyFingerprint,
  ownerOfValidKey,
  verifySignature,
} from "@/lib/signing";

/* Identity recovery (2026-08-19) -- the "restore from a backup" counterpart
   to /api/keys/register, called from clientSigning.ts's
   importEncryptedBackup() instead of a blind register. A freshly generated
   key (first-ever use) still goes through the plain /register endpoint --
   this one specifically handles the case where the restored key might
   belong to a DIFFERENT, already-existing identity than the current
   session's fresh cookie. See anon.ts's adoptIdentity() and signing.ts's
   ownerOfValidKey() for the two halves of the actual mechanism.

   Native support added 2026-08-24 (mobile/src/lib/signing.ts's own
   importEncryptedBackup()): adoptIdentity() re-points a cookie for web,
   which is invisible and sufficient for a browser -- but a native client
   has no cookie jar (see mobile/services/api.ts) and needs the recovered
   identity's own session id back explicitly so it can persist it
   locally. adoptIdentity() already returned that value; it just went
   unused here before since web never needed it. Only included for
   native callers (detected the same way anon.ts's own currentOrNewUserId
   distinguishes them, via the session header) -- web's response shape is
   completely unchanged, and the recovered session id isn't handed to a
   browser context that has no legitimate use for it anyway.

   Two real vulnerabilities found live 2026-08-29, both closed here:
   (1) No proof of possession -- same gap as /register (see that route's
       own comment). proofSignature, verified against the same
       canonicalKeyProofPayload, is required on both branches below.
   (2) TOCTOU race against /revoke and /rotate: ownerOfValidKey() used to
       be a bare, un-transactioned db() read, completely independent of
       this route's own later writes. A revoke could commit its 'revoked'
       row for this exact fingerprint AFTER this read but BEFORE this
       route's own INSERT -- which would still fire unconditionally,
       logging a 'recovered' row (non-retiring) on top of the just-
       committed revocation and silently undoing it, handing the revoker's
       identity to whoever won the race. Now wrapped in one transaction,
       behind lockKeyFingerprint() -- the same lock /revoke and /rotate
       also now take before their own checks -- so no concurrent request
       touching this fingerprint can interleave with this one at all. */
export async function POST(request: Request) {
  const isNativeClient = !!request.headers.get("x-voteright-session");
  const { publicKey, proofSignature } = (await request.json()) as { publicKey?: string; proofSignature?: string };
  if (!publicKey || !proofSignature) return Response.json({ error: "publicKey and proofSignature required" }, { status: 400 });

  const currentUserId = await currentOrNewUserId();
  const fp = fingerprintOf(publicKey);
  if (!verifySignature(canonicalKeyProofPayload({ userId: currentUserId, fingerprint: fp }), proofSignature, publicKey)) {
    return Response.json({ error: "proof of key possession failed to verify" }, { status: 400 });
  }
  const context = hashContext(
    request.headers.get("x-forwarded-for") ?? "unknown",
    request.headers.get("user-agent") ?? "unknown",
  );

  const client = await db().connect();
  let ownerId: string | null;
  try {
    await client.query("BEGIN");
    await lockKeyFingerprint(client, fp);
    ownerId = await ownerOfValidKey(client, fp);

    // No prior valid owner (a genuinely new key, or one that's since been
    // rotated/revoked away -- see ownerOfValidKey's doc comment on why a
    // revoked backup can never reach this branch) -- or it's already this
    // same session's own key. Either way, nothing to recover: register it
    // plainly under whoever's asking, same as /api/keys/register.
    if (!ownerId || ownerId === currentUserId) {
      await client.query(
        `INSERT INTO user_key_events (user_id, event, public_key, public_key_fingerprint, context_hash)
         VALUES ($1, 'registered', $2, $3, $4)`,
        [currentUserId, publicKey, fp, context],
      );
      await client.query("COMMIT");
      return Response.json({ recovered: false, fingerprint: fp });
    }

    // Real recovery: this key belongs to a DIFFERENT, still-valid identity.
    // Log the event on the identity being recovered (not the abandoned
    // fresh session) while still holding the lock.
    await client.query(
      `INSERT INTO user_key_events (user_id, event, public_key, public_key_fingerprint, context_hash)
       VALUES ($1, 'recovered', $2, $3, $4)`,
      [ownerId, publicKey, fp, context],
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  // Re-point this session's cookie at the recovered identity, now that the
  // 'recovered' event is durably committed. Harmless no-op for a native
  // caller if it also sets a Set-Cookie header -- a client with no cookie
  // jar just ignores it, same as any other response header it doesn't use.
  const anonId = await adoptIdentity(ownerId);
  return Response.json({ recovered: true, fingerprint: fp, ...(isNativeClient ? { anonId } : {}) });
}
