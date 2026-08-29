import { currentOrNewUserId } from "@/lib/anon";
import { db } from "@/lib/db";
import { hashContext, keyCurrentlyValid, lockKeyFingerprint } from "@/lib/signing";

/* Revokes a compromised key (e.g. after a backup export leaked) — signatures made
   BEFORE this event remain valid/verifiable forever; the key just can't sign
   anything new after this row lands. This is the response to a suspected leak,
   distinct from /rotate (routine, no-compromise-implied key replacement). */
export async function POST(request: Request) {
  const { fingerprint } = (await request.json()) as { fingerprint?: string };
  if (!fingerprint) return Response.json({ error: "fingerprint required" }, { status: 400 });

  const userId = await currentOrNewUserId();
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    // Found live 2026-08-29: without this, a concurrent /api/keys/recover
    // for this same fingerprint could read the pre-revoke state via its own
    // separate query and still commit a 'recovered' row after this
    // transaction's own commit, silently undoing the revoke. See
    // lockKeyFingerprint's own doc comment.
    await lockKeyFingerprint(client, fingerprint);
    if (!(await keyCurrentlyValid(client, userId, fingerprint))) {
      await client.query("ROLLBACK");
      return Response.json({ error: "key not found or already retired" }, { status: 404 });
    }
    const context = hashContext(
      request.headers.get("x-forwarded-for") ?? "unknown",
      request.headers.get("user-agent") ?? "unknown",
    );
    await client.query(
      `INSERT INTO user_key_events (user_id, event, public_key, public_key_fingerprint, context_hash)
       SELECT $1, 'revoked', public_key, $2, $3
         FROM user_key_events WHERE public_key_fingerprint = $2 ORDER BY created_at DESC LIMIT 1`,
      [userId, fingerprint, context],
    );
    await client.query("COMMIT");
    return Response.json({ ok: true });
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
