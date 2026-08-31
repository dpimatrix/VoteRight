import { redirectTo } from "@/lib/redirect";
import { createCampaign, creatableTargets, listCampaigns } from "@/lib/accountability";
import { currentUserId, verifiedUserId } from "@/lib/anon";

export async function GET() {
  const userId = await currentUserId();
  const [campaigns, targets] = await Promise.all([listCampaigns(userId), creatableTargets(userId)]);
  return Response.json({ campaigns, pathways: targets.pathways, politicians: targets.politicians });
}

export async function POST(request: Request) {
  const isJson = (request.headers.get("content-type") ?? "").includes("application/json");
  const userId = await verifiedUserId();

  if (isJson) {
    if (!userId) return Response.json({ error: "verify" }, { status: 403 });
    const b = (await request.json()) as {
      targetType?: "politician" | "charter_or_law_change";
      pathwayId?: string;
      politicianId?: string;
      reformTitle?: string;
      description?: string;
      citationUrl?: string;
    };
    const res = await createCampaign({
      userId,
      pathwayId: String(b.pathwayId ?? ""),
      targetType: b.targetType ?? "politician",
      politicianId: b.politicianId || undefined,
      reformTitle: b.reformTitle || undefined,
      description: String(b.description ?? ""),
      citationUrl: b.citationUrl || undefined,
    });
    return Response.json(res);
  }

  const form = await request.formData();
  const lang = String(form.get("lang") ?? "en");
  if (!userId) return redirectTo(`/verify?lang=${lang}`, request);
  const res = await createCampaign({
    userId,
    pathwayId: String(form.get("pathway_id") ?? ""),
    targetType: String(form.get("target_type") ?? "politician") as "politician" | "charter_or_law_change",
    politicianId: String(form.get("politician_id") ?? "") || undefined,
    reformTitle: String(form.get("reform_title") ?? "") || undefined,
    description: String(form.get("description") ?? ""),
    citationUrl: String(form.get("citation_url") ?? "") || undefined,
  });
  // Real gap found live 2026-08-31: createCampaign()'s own rejection reason
  // ("pathway" -- bad id, or "pathway_mismatch" -- e.g. a reform campaign
  // submitted against a non-petition pathway) used to be discarded outright
  // here, redirecting back to a bare "/accountability" with zero indication
  // anything failed -- same silent-no-op class already fixed this session
  // for every debate action and the referenda/mandate admin actions, just
  // never extended to this form.
  const dest = res.ok ? `/accountability/${res.id}?lang=${lang}` : `/accountability?lang=${lang}&error=1`;
  return redirectTo(dest, request);
}
