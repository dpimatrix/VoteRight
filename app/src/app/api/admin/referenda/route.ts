import { isAdmin } from "@/lib/adminAuth";
import { scheduleReferendum } from "@/lib/referenda";

export async function POST(request: Request) {
  if (!(await isAdmin())) return new Response("forbidden", { status: 403 });
  const form = await request.formData();
  await scheduleReferendum(
    String(form.get("proposal_id") ?? ""),
    String(form.get("question") ?? ""),
    String(form.get("opens_at") ?? ""),
    String(form.get("closes_at") ?? ""),
  );
  return Response.redirect(new URL("/admin/mandates", request.url), 303);
}
