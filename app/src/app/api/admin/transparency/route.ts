import { isAdmin } from "@/lib/adminAuth";
import { adminAddEndorsement, adminAddExpenditure } from "@/lib/transparency";

export async function POST(request: Request) {
  if (!(await isAdmin())) return new Response("forbidden", { status: 403 });
  const form = await request.formData();
  const action = String(form.get("action") ?? "");
  const s = (k: string) => String(form.get(k) ?? "").trim();

  let res: "ok" | "invalid" = "invalid";
  if (action === "expenditure") {
    res = await adminAddExpenditure({
      committeeName: s("committee_name"),
      committeeType: s("committee_type") || "other",
      raceId: s("race_id") || undefined,
      benefitsPoliticianId: s("benefits_politician_id") || undefined,
      direction: s("direction") === "opposing" ? "opposing" : "supporting",
      amountUsd: Number(s("amount_usd")),
      expenditureDate: s("expenditure_date"),
      purpose: s("purpose") || undefined,
      filingUrl: s("filing_url"),
    });
  } else if (action === "endorsement") {
    res = await adminAddEndorsement({
      orgName: s("org_name"),
      orgType: s("org_type") || "other",
      candidacyId: s("candidacy_id"),
      endorsedAt: s("endorsed_at") || undefined,
      sourceUrl: s("source_url"),
    });
  } else {
    return new Response("unknown action", { status: 400 });
  }
  return Response.redirect(new URL(`/admin/transparency?${res === "ok" ? "ok=1" : "e=1"}`, request.url), 303);
}
