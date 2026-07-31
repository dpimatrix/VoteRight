import { currentUserId } from "@/lib/anon";
import { ballotForJurisdiction, listBrowsableJurisdictions, userResidence } from "@/lib/jurisdictions";

/* JSON read-side counterpart to the / (ballot) page — used by the native app,
   which can't import server-only page.tsx modules. Mirrors app/src/app/page.tsx's
   data logic, including visitor mode — native has no cookie jar, so the visited
   jurisdiction is passed as a ?visit= query param instead of the web's vr_visit
   cookie (same one-request-scoped, display-only semantics: never touches
   residence or participation rights, which always read
   users.residence_jurisdiction_id in the database). */
export async function GET(request: Request) {
  const userId = await currentUserId();
  const residence = (userId && (await userResidence(userId))) || null;
  // No default jurisdiction — see ensureUser in queries.ts. A brand-new mobile
  // session has an unknown residence until /api/verify resolves a real address.
  const residenceId = residence?.ocd_id ?? null;

  const visit = new URL(request.url).searchParams.get("visit");
  const browsable = await listBrowsableJurisdictions();
  const visited = visit ? (browsable.find((j) => j.ocd_id === visit && j.ocd_id !== residenceId) ?? null) : null;
  const jurisdictionId = visited ? visited.ocd_id : residenceId;

  const offices = jurisdictionId ? await ballotForJurisdiction(jurisdictionId) : [];

  const jurisdictions: { id: string; name: string }[] = [];
  for (const o of offices) {
    if (!jurisdictions.some((j) => j.id === o.jurisdiction_id)) {
      jurisdictions.push({ id: o.jurisdiction_id, name: o.jurisdiction_name });
    }
  }

  return Response.json({
    jurisdictionId,
    residenceId,
    jurisdictions,
    offices,
    visiting: visited ? { ocdId: visited.ocd_id, name: visited.name } : null,
    browsable: browsable.filter((j) => j.ocd_id !== jurisdictionId),
  });
}
