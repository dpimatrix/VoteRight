import { hasAdminAccess } from "@/lib/adminAuth";
import { redirectTo } from "@/lib/redirect";
import { adminMarkJurisdictionProvisioned } from "@/lib/jurisdictionDemand";

export async function POST(request: Request) {
  if (!(await hasAdminAccess("jurisdiction_demand"))) return new Response("forbidden", { status: 403 });
  const form = await request.formData();
  const stateFips = String(form.get("state_fips") ?? "");
  const countyFips = String(form.get("county_fips") ?? "");
  if (!stateFips || !countyFips) return new Response("missing state_fips/county_fips", { status: 400 });
  await adminMarkJurisdictionProvisioned(stateFips, countyFips);
  return redirectTo("/admin/jurisdiction-demand", request);
}
