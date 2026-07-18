import { isAdmin } from "@/lib/adminAuth";
import { recordRaceOutcome } from "@/lib/referenda";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return new Response("forbidden", { status: 403 });
  const { id } = await params;
  const form = await request.formData();
  const won = form.getAll("won").map(String).filter(Boolean);
  await recordRaceOutcome(id, won);
  return Response.redirect(new URL("/admin/mandates", request.url), 303);
}
