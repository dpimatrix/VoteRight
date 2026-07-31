import { verifiedUserId } from "@/lib/anon";
import { userTier } from "@/lib/debates";
import { issueBallot } from "@/lib/referenda";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isJson = (request.headers.get("content-type") ?? "").includes("application/json");
  const userId = await verifiedUserId();

  if (isJson) {
    if (!userId) return Response.json({ error: "verify" }, { status: 403 });
    const outcome = await issueBallot(id, userId, await userTier(userId));
    return Response.json({ outcome });
  }

  const form = await request.formData();
  const lang = String(form.get("lang") ?? "en");
  if (!userId) return Response.redirect(new URL(`/verify?lang=${lang}`, request.url), 303);
  const res = await issueBallot(id, userId, await userTier(userId));
  const err = res === "not_eligible" ? "&e=nel" : res === "too_recent" ? "&e=tr" : "";
  return Response.redirect(new URL(`/referenda/${id}?lang=${lang}${err}`, request.url), 303);
}
