import { redirectTo } from "@/lib/redirect";
import { hasAdminAccess } from "@/lib/adminAuth";
import { recordRaceOutcome } from "@/lib/referenda";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await hasAdminAccess("mandates"))) return new Response("forbidden", { status: 403 });
  const { id } = await params;
  const form = await request.formData();
  const won = form.getAll("won").map(String).filter(Boolean);
  await recordRaceOutcome(id, won);
  return redirectTo("/admin/mandates", request);
}
