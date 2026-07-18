import { cookies } from "next/headers";
import { listBrowsableJurisdictions } from "@/lib/jurisdictions";

/* Visitor mode: a read-only lens on another jurisdiction's ballot. Sets only a
   display cookie — residence, verification, and every participation right are
   untouched (eligibility always reads users.residence_jurisdiction_id). */
export async function POST(request: Request) {
  const form = await request.formData();
  const lang = String(form.get("lang") ?? "en");
  const target = String(form.get("jurisdiction") ?? "");
  const store = await cookies();
  if (!target) {
    store.delete("vr_visit");
  } else {
    const ok = (await listBrowsableJurisdictions()).some((j) => j.ocd_id === target);
    if (ok) {
      store.set("vr_visit", target, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24, path: "/" });
    }
  }
  return Response.redirect(new URL(`/?lang=${lang}`, request.url), 303);
}
