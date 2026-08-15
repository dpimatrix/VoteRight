import { isAdmin } from "@/lib/adminAuth";
import { reviewAnomaly } from "@/lib/anomalyDetection";
import { redirectTo } from "@/lib/redirect";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return new Response("forbidden", { status: 403 });
  const { id } = await params;
  const form = await request.formData();
  const action = String(form.get("action") ?? "");
  if (!["dismissed", "confirmed_ok", "user_flagged_for_review"].includes(action)) {
    return new Response("bad action", { status: 400 });
  }
  await reviewAnomaly(id, action as "dismissed" | "confirmed_ok" | "user_flagged_for_review");
  return redirectTo("/admin/anomalies", request);
}
