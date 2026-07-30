import { verifiedUserId } from "@/lib/anon";
import { createProposal } from "@/lib/debates";
import { hashContext } from "@/lib/signing";

export async function POST(request: Request) {
  const form = await request.formData();
  const lang = String(form.get("lang") ?? "en");
  const userId = await verifiedUserId();
  if (!userId) return Response.redirect(new URL(`/verify?lang=${lang}`, request.url), 303);
  const res = await createProposal({
    userId,
    topicId: String(form.get("topicId") ?? ""),
    title: String(form.get("title") ?? "").slice(0, 200),
    body: String(form.get("body") ?? "").slice(0, 4000),
    signature: (form.get("signature") as string) || undefined,
    publicKeyFingerprint: (form.get("publicKeyFingerprint") as string) || undefined,
    contextHash: hashContext(request.headers.get("x-forwarded-for") ?? "unknown", request.headers.get("user-agent") ?? "unknown"),
  });
  if (res.signatureInvalid) return Response.redirect(new URL(`/debates?lang=${lang}&error=signature`, request.url), 303);
  return Response.redirect(new URL(`/debates/${res.id}?lang=${lang}`, request.url), 303);
}
