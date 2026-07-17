import { isAdmin } from "@/lib/adminAuth";
import { moderate } from "@/lib/debates";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return new Response("forbidden", { status: 403 });
  const { id } = await params;
  const form = await request.formData();
  const action = String(form.get("action") ?? "");
  if (!["approved", "removed"].includes(action)) return new Response("bad action", { status: 400 });
  await moderate(id, action as "approved" | "removed");
  return Response.redirect(new URL("/admin/moderation", request.url), 303);
}
