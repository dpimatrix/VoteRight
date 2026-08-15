import { redirectTo } from "@/lib/redirect";
import { verifiedUserId } from "@/lib/anon";
import { userTier } from "@/lib/debates";
import { issueBallot } from "@/lib/referenda";
import { hashContext } from "@/lib/signing";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isJson = (request.headers.get("content-type") ?? "").includes("application/json");
  const userId = await verifiedUserId();
  const ip = request.headers.get("x-forwarded-for");
  const requestContext = { ip, contextHash: hashContext(ip ?? "unknown", request.headers.get("user-agent") ?? "unknown") };

  if (isJson) {
    if (!userId) return Response.json({ error: "verify" }, { status: 403 });
    const outcome = await issueBallot(id, userId, await userTier(userId), requestContext);
    return Response.json({ outcome });
  }

  const form = await request.formData();
  const lang = String(form.get("lang") ?? "en");
  if (!userId) return redirectTo(`/verify?lang=${lang}`, request);
  const res = await issueBallot(id, userId, await userTier(userId), requestContext);
  const err = res === "not_eligible" ? "&e=nel" : res === "too_recent" ? "&e=tr" : "";
  return redirectTo(`/referenda/${id}?lang=${lang}${err}`, request);
}
