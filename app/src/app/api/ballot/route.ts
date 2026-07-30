import { currentUserId } from "@/lib/anon";
import { ballotForJurisdiction, COUNTY, userResidence } from "@/lib/jurisdictions";

/* JSON read-side counterpart to the / (ballot) page — used by the native app,
   which can't import server-only page.tsx modules. Mirrors app/src/app/page.tsx's
   data logic; visitor-mode's jurisdiction override isn't ported yet (native has
   no vr_visit cookie equivalent — out of scope for the first validation slice). */
export async function GET() {
  const userId = await currentUserId();
  const residence = (userId && (await userResidence(userId))) || null;
  const jurisdictionId = residence?.ocd_id ?? COUNTY;
  const offices = await ballotForJurisdiction(jurisdictionId);

  const jurisdictions: { id: string; name: string }[] = [];
  for (const o of offices) {
    if (!jurisdictions.some((j) => j.id === o.jurisdiction_id)) {
      jurisdictions.push({ id: o.jurisdiction_id, name: o.jurisdiction_name });
    }
  }

  return Response.json({ jurisdictionId, jurisdictions, offices });
}
