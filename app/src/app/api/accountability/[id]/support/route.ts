import { supportCampaign } from "@/lib/accountability";
import { verifiedUserId } from "@/lib/anon";
import { userTier } from "@/lib/debates";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await request.formData();
  const lang = String(form.get("lang") ?? "en");
  const userId = await verifiedUserId();
  if (!userId) return Response.redirect(new URL(`/verify?lang=${lang}`, request.url), 303);
  await supportCampaign(id, userId, await userTier(userId));
  return Response.redirect(new URL(`/accountability/${id}?lang=${lang}`, request.url), 303);
}
