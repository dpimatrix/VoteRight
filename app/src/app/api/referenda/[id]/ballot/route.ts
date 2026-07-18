import { verifiedUserId } from "@/lib/anon";
import { userTier } from "@/lib/debates";
import { issueBallot } from "@/lib/referenda";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await request.formData();
  const lang = String(form.get("lang") ?? "en");
  const userId = await verifiedUserId();
  if (!userId) return Response.redirect(new URL(`/verify?lang=${lang}`, request.url), 303);
  const res = await issueBallot(id, userId, await userTier(userId));
  const err = res === "not_eligible" ? "&e=nel" : "";
  return Response.redirect(new URL(`/referenda/${id}?lang=${lang}${err}`, request.url), 303);
}
