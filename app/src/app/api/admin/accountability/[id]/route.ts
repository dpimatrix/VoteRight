import { adminUpdateCampaign } from "@/lib/accountability";
import { isAdmin } from "@/lib/adminAuth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return new Response("forbidden", { status: 403 });
  const { id } = await params;
  const form = await request.formData();
  await adminUpdateCampaign(
    id,
    String(form.get("status") ?? "") || undefined,
    String(form.get("external_petition_status") ?? "") || undefined,
  );
  return Response.redirect(new URL("/admin/accountability", request.url), 303);
}
