import { currentAdmin, hasAdminAccess } from "@/lib/adminAuth";
import { redirectTo } from "@/lib/redirect";
import { researchJurisdiction } from "@/lib/jurisdictionDemand";

export async function POST(request: Request) {
  if (!(await hasAdminAccess("jurisdiction_demand"))) return new Response("forbidden", { status: 403 });
  const admin = await currentAdmin();
  if (!admin) return new Response("forbidden", { status: 403 });
  const form = await request.formData();
  const stateFips = String(form.get("state_fips") ?? "");
  const countyFips = String(form.get("county_fips") ?? "");
  if (!stateFips || !countyFips) return new Response("missing state_fips/county_fips", { status: 400 });
  // place_names arrives comma-joined from the queue page's own hidden field
  // (plain form POST, no client JS) -- never empty-string-split into a
  // bogus single blank entry.
  const placeNamesRaw = String(form.get("place_names") ?? "").trim();
  const placeNames = placeNamesRaw ? placeNamesRaw.split(",") : [];
  // No countyName to pass -- by construction, every row on this queue is a
  // county VoteRight hasn't seeded a jurisdictions row for yet, so there's
  // nothing to look up; researchJurisdiction() already falls back to the
  // bare FIPS pair when this is null.
  const res = await researchJurisdiction(stateFips, countyFips, null, placeNames, admin.username);
  return redirectTo(`/admin/jurisdiction-demand${res.ok ? "" : `?e=${res.reason}`}`, request);
}
