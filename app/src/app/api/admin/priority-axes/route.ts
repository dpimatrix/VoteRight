import { currentAdmin, hasAdminAccess } from "@/lib/adminAuth";
import { createDraftAxis } from "@/lib/priorityAxes";
import { redirectTo } from "@/lib/redirect";

export async function POST(request: Request) {
  if (!(await hasAdminAccess("priority_axes"))) return new Response("forbidden", { status: 403 });
  const admin = await currentAdmin();
  if (!admin) return new Response("forbidden", { status: 403 });
  const form = await request.formData();
  const topicId = String(form.get("topic_id") ?? "");
  const newTopicName = String(form.get("new_topic_name") ?? "").trim();
  const res = await createDraftAxis({
    topicId: topicId || undefined,
    newTopicName: newTopicName || undefined,
    key: String(form.get("key") ?? "").trim(),
    question: String(form.get("question") ?? "").trim(),
    negativePole: String(form.get("negative_pole") ?? "").trim(),
    positivePole: String(form.get("positive_pole") ?? "").trim(),
    createdByAdmin: admin.username,
  });
  // Real gap found live 2026-08-31: createDraftAxis()'s own rejection reason
  // (missing topic, missing fields, a duplicate key within the topic, or a
  // real DB error) was discarded outright -- every submission redirected
  // back as if it had succeeded, even a completely-blank required field
  // slipping past a direct/malformed POST. The page's own ERROR_NOTE lookup
  // already handles every OTHER action's rejection reason; this was the one
  // action on the page that never wired into it.
  return redirectTo(`/admin/priority-axes${res.ok ? "" : `?e=${res.reason}`}`, request);
}
