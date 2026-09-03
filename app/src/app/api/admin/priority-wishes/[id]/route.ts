import { currentAdmin, hasAdminAccess } from "@/lib/adminAuth";
import { decidePriorityWish } from "@/lib/priorityWishes";
import { redirectTo } from "@/lib/redirect";

// Reuses the priority_axes screen permission rather than a new SCREEN_KEY --
// whoever manages axes is the natural reviewer for suggestions feeding
// into them, and this keeps the admin screen list from growing for what's
// a small, related queue rather than a whole new area of the console.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await hasAdminAccess("priority_axes"))) return new Response("forbidden", { status: 403 });
  const admin = await currentAdmin();
  if (!admin) return new Response("forbidden", { status: 403 });
  const { id } = await params;
  const form = await request.formData();
  const action = String(form.get("action") ?? "");
  const note = String(form.get("note") ?? "").trim() || null;
  if (action !== "approve" && action !== "reject") return new Response("bad action", { status: 400 });
  await decidePriorityWish(id, admin.id, action === "approve" ? "approved" : "rejected", note);
  return redirectTo("/admin/priority-axes", request);
}
