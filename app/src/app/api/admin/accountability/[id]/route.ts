import { redirectTo } from "@/lib/redirect";
import { adminUpdateCampaign } from "@/lib/accountability";
import { hasAdminAccess } from "@/lib/adminAuth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await hasAdminAccess("accountability"))) return new Response("forbidden", { status: 403 });
  const { id } = await params;
  const form = await request.formData();
  await adminUpdateCampaign(
    id,
    String(form.get("status") ?? "") || undefined,
    String(form.get("external_petition_status") ?? "") || undefined,
  );
  return redirectTo("/admin/accountability", request);
}
