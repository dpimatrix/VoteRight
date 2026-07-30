import { currentUserId } from "@/lib/anon";
import { referendumDetail } from "@/lib/referenda";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await currentUserId();
  const ref = await referendumDetail(id, userId);
  if (!ref) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(ref);
}
