import { isAdmin } from "@/lib/adminAuth";
import { adminCodingAction } from "@/lib/queries";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) return new Response("forbidden", { status: 403 });
  const { id } = await params;
  const form = await request.formData();
  const action = String(form.get("action") ?? "");
  if (!["confirm", "reject", "up", "down"].includes(action)) {
    return new Response("unknown action", { status: 400 });
  }
  await adminCodingAction(id, action as "confirm" | "reject" | "up" | "down");
  return Response.redirect(new URL("/admin/coding", request.url), 303);
}
