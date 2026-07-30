import { currentOrNewUserId } from "@/lib/anon";
import { db } from "@/lib/db";
import { fingerprint as fingerprintOf, hashContext, keyCurrentlyValid } from "@/lib/signing";

/* Routine key replacement (no compromise implied — contrast with /revoke). Retires
   the old key and registers the new one in one transaction: past signatures under
   the old key remain valid, only new signing moves to the new key. */
export async function POST(request: Request) {
  const { oldFingerprint, newPublicKey } = (await request.json()) as {
    oldFingerprint?: string;
    newPublicKey?: string;
  };
  if (!oldFingerprint || !newPublicKey) {
    return Response.json({ error: "oldFingerprint and newPublicKey required" }, { status: 400 });
  }

  const userId = await currentOrNewUserId();
  const newFingerprint = fingerprintOf(newPublicKey);
  const context = hashContext(
    request.headers.get("x-forwarded-for") ?? "unknown",
    request.headers.get("user-agent") ?? "unknown",
  );

  const client = await db().connect();
  try {
    await client.query("BEGIN");
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
