import { currentOrNewUserId } from "@/lib/anon";
import { db } from "@/lib/db";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await currentOrNewUserId();
  const res = await db().query(
    `UPDATE user_key_events SET acknowledged_at = now()
      WHERE id = $1 AND user_id = $2 AND event = 'used_from_new_context'`,
    [id, userId],
  );
  return Response.json({ ok: (res.rowCount ?? 0) > 0 });
}
