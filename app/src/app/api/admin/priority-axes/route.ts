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
  await createDraftAxis({
    topicId: topicId || undefined,
    newTopicName: newTopicName || undefined,
    key: String(form.get("key") ?? "").trim(),
    question: String(form.get("question") ?? "").trim(),
    negativePole: String(form.get("negative_pole") ?? "").trim(),
    positivePole: String(form.get("positive_pole") ?? "").trim(),
    createdByAdmin: admin.username,
  });
  return redirectTo("/admin/priority-axes", request);
}
