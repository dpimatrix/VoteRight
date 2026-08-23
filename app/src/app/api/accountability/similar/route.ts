import { similarCampaigns } from "@/lib/accountability";

// Read-only, unauthenticated -- campaigns are already fully public on
// /accountability (title, description, support count), so surfacing the
// same fields here at suggestion time discloses nothing new. Shared by
// both web (client-island fetch) and mobile.
export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const targetType = sp.get("targetType");
  const pathwayId = sp.get("pathwayId");
  if (!pathwayId) return Response.json({ matches: [] });

  if (targetType === "charter_or_law_change") {
    const matches = await similarCampaigns({ targetType, pathwayId, q: sp.get("q") ?? "" });
    return Response.json({ matches });
  }
  if (targetType === "politician") {
    const politicianId = sp.get("politicianId");
    if (!politicianId) return Response.json({ matches: [] });
    const matches = await similarCampaigns({ targetType, pathwayId, politicianId });
    return Response.json({ matches });
  }
  return Response.json({ matches: [] });
}
