import { currentOrNewUserId } from "@/lib/anon";
import { db } from "@/lib/db";
import {
  canonicalKeyProofPayload,
  fingerprint as fingerprintOf,
  hashContext,
  keyCurrentlyValid,
  lockKeyFingerprint,
  verifySignature,
} from "@/lib/signing";

/* Routine key replacement (no compromise implied — contrast with /revoke). Retires
   the old key and registers the new one in one transaction: past signatures under
   the old key remain valid, only new signing moves to the new key.

   Real vulnerability found live 2026-08-29, same shape as /register's own
   (see that route's comment): the new key's 'registered' INSERT had no
   proof the caller held ITS private key -- an attacker who already owned
   ANY currently-valid key of their own (the one precondition this route
   already checks) could call /rotate with a VICTIM's publicly-observed key
   as newPublicKey, becoming its most-recent owner and hijacking the
   victim's next recovery attempt exactly as /register's own bug would
   have, just via a different endpoint. newKeyProofSignature closes it the
   same way, bound to this same caller's userId. */
export async function POST(request: Request) {
  const { oldFingerprint, newPublicKey, newKeyProofSignature } = (await request.json()) as {
    oldFingerprint?: string;
    newPublicKey?: string;
    newKeyProofSignature?: string;
  };
  if (!oldFingerprint || !newPublicKey || !newKeyProofSignature) {
    return Response.json({ error: "oldFingerprint, newPublicKey, and newKeyProofSignature required" }, { status: 400 });
  }

  const userId = await currentOrNewUserId();
  const newFingerprint = fingerprintOf(newPublicKey);
  if (!verifySignature(canonicalKeyProofPayload({ userId, fingerprint: newFingerprint }), newKeyProofSignature, newPublicKey)) {
    return Response.json({ error: "proof of new-key possession failed to verify" }, { status: 400 });
  }
  const context = hashContext(
    request.headers.get("x-forwarded-for") ?? "unknown",
    request.headers.get("user-agent") ?? "unknown",
  );

  const client = await db().connect();
  try {
    await client.query("BEGIN");
    // Found live 2026-08-29: same race /revoke now also guards against --
    // locked on oldFingerprint specifically, since that's the row a
    // concurrent /api/keys/recover could otherwise resurrect after this
    // transaction retires it. See lockKeyFingerprint's own doc comment.
    await lockKeyFingerprint(client, oldFingerprint);
    if (!(await keyCurrentlyValid(client, userId, oldFingerprint))) {
      await client.query("ROLLBACK");
      return Response.json({ error: "old key not found or already retired" }, { status: 404 });
    }
    await client.query(
      `INSERT INTO user_key_events (user_id, event, public_key, public_key_fingerprint, context_hash)
       SELECT $1, 'rotated', public_key, $2, $3
         FROM user_key_events WHERE public_key_fingerprint = $2 ORDER BY created_at DESC LIMIT 1`,
      [userId, oldFingerprint, context],
    );
    await client.query(
      `INSERT INTO user_key_events (user_id, event, public_key, public_key_fingerprint, context_hash)
       VALUES ($1, 'registered', $2, $3, $4)`,
      [userId, newPublicKey, newFingerprint, context],
    );
    await client.query("COMMIT");
    return Response.json({ fingerprint: newFingerprint });
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
