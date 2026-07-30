import { currentUserId } from "@/lib/anon";
import { debateDetail } from "@/lib/debates";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await currentUserId();
  const detail = await debateDetail(id, userId);
  if (!detail) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(detail);
}
