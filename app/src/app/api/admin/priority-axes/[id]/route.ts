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

  // Real gap found live 2026-08-31: update_draft/delete_draft/
  // submit_for_review/send_back_to_draft/retire all guard their own UPDATE/
  // DELETE with a `WHERE ... AND status = 'X'` clause -- the exact same
  // TOCTOU-race shape already fixed this session for agree/ctq/report/
  // second/certify/publish/redact (another admin, or this admin's own
  // stale page, acting on an axis whose status already changed) -- but
  // unlike approve_and_publish just below, none of these five checked
  // their own {ok: boolean} result at all. ERROR_NOTE's existing "race"
  // message already fits every one of these cases exactly ("someone else
  // already acted on this axis"), so this reuses it rather than inventing
  // near-duplicate copy per action.
  let ok = true;
  switch (action) {
    case "update_draft":
      ok = (
        await updateDraftAxis(id, {
          question: String(form.get("question") ?? "").trim(),
          negativePole: String(form.get("negative_pole") ?? "").trim(),
          positivePole: String(form.get("positive_pole") ?? "").trim(),
        })
      ).ok;
      break;
    case "delete_draft":
      ok = (await deleteDraftAxis(id)).ok;
      break;
    case "submit_for_review":
      ok = (await submitForReview(id)).ok;
      break;
    case "send_back_to_draft":
      ok = (await sendBackToDraft(id)).ok;
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
      ok = (await retireAxis(id, supersededBy || undefined)).ok;
      break;
    }
    default:
      return new Response("unknown action", { status: 400 });
  }
  return redirectTo(`/admin/priority-axes${ok ? "" : "?e=race"}`, request);
}
