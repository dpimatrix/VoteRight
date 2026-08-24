import { currentAdmin, hasAdminAccess } from "@/lib/adminAuth";
import {
  approveAndPublish,
  deleteDraftAxis,
  retireAxis,
  sendBackToDraft,
  submitForReview,
  updateDraftAxis,
} from "@/lib/priorityAxes";
import { redirectTo } from "@/lib/redirect";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await hasAdminAccess("priority_axes"))) return new Response("forbidden", { status: 403 });
  const admin = await currentAdmin();
  if (!admin) return new Response("forbidden", { status: 403 });
  const { id } = await params;
  const form = await request.formData();
  const action = String(form.get("action") ?? "");

  switch (action) {
    case "update_draft":
      await updateDraftAxis(id, {
        question: String(form.get("question") ?? "").trim(),
        negativePole: String(form.get("negative_pole") ?? "").trim(),
        positivePole: String(form.get("positive_pole") ?? "").trim(),
      });
      break;
    case "delete_draft":
      await deleteDraftAxis(id);
      break;
    case "submit_for_review":
      await submitForReview(id);
      break;
    case "send_back_to_draft":
      await sendBackToDraft(id);
      break;
    case "approve_and_publish": {
      const res = await approveAndPublish(id, admin.username);
      if (!res.ok) {
        // Same self-review case the database's own CHECK constraint would
        // reject -- caught here first for a page the admin can actually
        // read, not a raw constraint-violation error page.
        return redirectTo(`/admin/priority-axes?e=${res.reason}`, request);
      }
      break;
    }
    case "retire": {
      const supersededBy = String(form.get("superseded_by_axis_id") ?? "").trim();
      await retireAxis(id, supersededBy || undefined);
      break;
    }
    default:
      return new Response("unknown action", { status: 400 });
  }
  return redirectTo("/admin/priority-axes", request);
}
