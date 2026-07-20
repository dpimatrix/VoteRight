import { isAdmin } from "@/lib/adminAuth";
import { createPositionFromVote } from "@/lib/positions";

export async function POST(request: Request) {
  if (!(await isAdmin())) return new Response("forbidden", { status: 403 });
  const form = await request.formData();
  const politicianId = String(form.get("politician_id") ?? "");
  const res = await createPositionFromVote({
    politicianId,
    billExternalId: String(form.get("bill_external_id") ?? ""),
    axisId: String(form.get("axis_id") ?? ""),
    value: Number(form.get("value")),
    statement: String(form.get("statement") ?? ""),
  });
  const q = res === "ok" ? "ok=1" : `e=${res}`;
  return Response.redirect(new URL(`/admin/positions?politician=${politicianId}&${q}`, request.url), 303);
}
