import { isAdmin } from "@/lib/adminAuth";
import { adminResolveRequest, executeDeletion } from "@/lib/privacy";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return new Response("forbidden", { status: 403 });
  const { id } = await params;
  const form = await request.formData();
  const action = String(form.get("action") ?? "");
  const note = String(form.get("note") ?? "") || undefined;

  if (action === "in_progress" || action === "completed" || action === "denied") {
    await adminResolveRequest(id, action, note);
  } else if (action === "execute_deletion") {
    await executeDeletion(String(form.get("subject_user_id") ?? ""), id);
  } else {
    return new Response("unknown action", { status: 400 });
  }
  return Response.redirect(new URL("/admin/privacy", request.url), 303);
}
