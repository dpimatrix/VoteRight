import { isAdmin } from "@/lib/adminAuth";
import { recordCommitment } from "@/lib/referenda";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return new Response("forbidden", { status: 403 });
  const { id } = await params;
  const form = await request.formData();
  const stance = String(form.get("stance") ?? "no_response") as "commit" | "decline" | "no_response";
  const res = await recordCommitment({
    commitmentId: id,
    stance,
    statement: String(form.get("statement") ?? "") || undefined,
    citationUrl: String(form.get("url") ?? "") || undefined,
    citationTitle: String(form.get("title") ?? "") || undefined,
  });
  const err = res === "needs_citation" ? "?e=cite" : "";
  return Response.redirect(new URL(`/admin/mandates${err}`, request.url), 303);
}
