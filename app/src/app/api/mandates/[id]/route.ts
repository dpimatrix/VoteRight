import { mandateDetail } from "@/lib/referenda";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await mandateDetail(id);
  if (!m || m.overlay_status === "below_threshold_unpublished") {
    return Response.json({ error: "not found" }, { status: 404 });
  }
  return Response.json(m);
}
