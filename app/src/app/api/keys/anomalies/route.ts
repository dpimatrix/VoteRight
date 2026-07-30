import { currentOrNewUserId } from "@/lib/anon";
import { db } from "@/lib/db";

/* Unacknowledged "signed from a new context" events for the current session's
   identity - the client polls this once per page load to decide whether to
   show the in-app banner (see app/src/lib/signing.ts's flagIfNewContext). */
export async function GET() {
  const userId = await currentOrNewUserId();
  const { rows } = await db().query(
    `SELECT id, created_at FROM user_key_events
      WHERE user_id = $1 AND event = 'used_from_new_context' AND acknowledged_at IS NULL
      ORDER BY created_at DESC`,
    [userId],
  );
  return Response.json({ anomalies: rows });
}
