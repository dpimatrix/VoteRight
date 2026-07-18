import { createCampaign } from "@/lib/accountability";
import { verifiedUserId } from "@/lib/anon";

export async function POST(request: Request) {
  const form = await request.formData();
  const lang = String(form.get("lang") ?? "en");
  const userId = await verifiedUserId();
  if (!userId) return Response.redirect(new URL(`/verify?lang=${lang}`, request.url), 303);
  const res = await createCampaign({
    userId,
    pathwayId: String(form.get("pathway_id") ?? ""),
    targetType: String(form.get("target_type") ?? "politician") as "politician" | "charter_or_law_change",
    politicianId: String(form.get("politician_id") ?? "") || undefined,
    reformTitle: String(form.get("reform_title") ?? "") || undefined,
    description: String(form.get("description") ?? ""),
  });
  const dest = res.ok ? `/accountability/${res.id}?lang=${lang}` : `/accountability?lang=${lang}`;
  return Response.redirect(new URL(dest, request.url), 303);
}
