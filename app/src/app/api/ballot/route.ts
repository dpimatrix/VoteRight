import { currentUserId } from "@/lib/anon";
import { lastVerifiedAt } from "@/lib/debates";
import {
  ballotForJurisdiction,
  filterToOwnDistricts,
  hasUnnarrowedDistrictSeats,
  listBrowsableJurisdictions,
  userResidence,
} from "@/lib/jurisdictions";

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
  // Same lastVerifiedAt already used on web's /verify "currently verified"
  // line -- mirrored here so the native Ballot tab's "Verified as X" label
  // can show the same "as of when" (owner asked for this directly,
  // 2026-08-23). ISO string over the wire, formatted client-side per the
  // device's own locale, same as every other timestamp this API returns.
  const residenceVerifiedAt = userId && residence ? await lastVerifiedAt(userId) : null;

  const visit = new URL(request.url).searchParams.get("visit");
  const browsable = await listBrowsableJurisdictions();
  const visited = visit ? (browsable.find((j) => j.ocd_id === visit && j.ocd_id !== residenceId) ?? null) : null;
  const jurisdictionId = visited ? visited.ocd_id : residenceId;

  const allOffices = jurisdictionId ? await ballotForJurisdiction(jurisdictionId) : [];
  // Same district narrowing as the web ballot page (page.tsx) — only on the
  // resident's own ballot, never while browsing another jurisdiction.
  const offices = visited
    ? allOffices
    : filterToOwnDistricts(allOffices, residence
        ? {
            congressional: residence.congressional_district,
            stateSenate: residence.state_senate_district,
            stateHouse: residence.state_house_district,
            countyCouncil: residence.county_council_district,
            boardOfEducation: residence.board_of_education_district,
            appellateCircuit: residence.appellate_circuit,
          }
        : null);

  const jurisdictions: { id: string; name: string }[] = [];
  for (const o of offices) {
    if (!jurisdictions.some((j) => j.id === o.jurisdiction_id)) {
      jurisdictions.push({ id: o.jurisdiction_id, name: o.jurisdiction_name });
    }
  }

  return Response.json({
    jurisdictionId,
    residenceId,
    residenceName: residence?.name ?? null,
    residenceLevel: residence?.level ?? null,
    residenceVerifiedAt: residenceVerifiedAt?.toISOString() ?? null,
    jurisdictions,
    offices,
    hasUnnarrowedDistrictSeats: hasUnnarrowedDistrictSeats(offices),
    visiting: visited ? { ocdId: visited.ocd_id, name: visited.name } : null,
    // Kept in full (not filtered out) so a jurisdiction with children --
    // Montgomery County with Rockville underneath -- still shows as the
    // group parent even when it's also the jurisdiction you're currently on;
    // isCurrent tells the client to render it disabled instead of dropping it.
    browsable: browsable.map((j) => ({ ...j, isCurrent: j.ocd_id === jurisdictionId })),
  });
}
