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
  // Real gap found by code review, same class already swept elsewhere on
  // this page's sibling axes actions: decidePriorityWish's WHERE status =
  // 'pending' guard means a second admin racing to decide the same wish
  // gets { ok: false } silently discarded here before -- they'd see the
  // page reload with no error, believing their note/decision was saved
  // when it wasn't.
  const res = await decidePriorityWish(id, admin.id, action === "approve" ? "approved" : "rejected", note);
  return redirectTo(`/admin/priority-axes${res.ok ? "" : "?e=wish_already_decided"}`, request);
}
