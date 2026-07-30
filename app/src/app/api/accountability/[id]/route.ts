import { campaignDetail } from "@/lib/accountability";
import { currentUserId } from "@/lib/anon";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await currentUserId();
  const c = await campaignDetail(id, userId);
  if (!c) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(c);
}
