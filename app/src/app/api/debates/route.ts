import { redirectTo } from "@/lib/redirect";
import { paymentVerifiedUserId, verifiedUserId } from "@/lib/anon";
import { createProposal, listProposals } from "@/lib/debates";
import { hashContext } from "@/lib/signing";

export async function GET() {
  return Response.json({ proposals: await listProposals() });
}

export async function POST(request: Request) {
  const isJson = (request.headers.get("content-type") ?? "").includes("application/json");
  // Debate participation (2026-08-19) requires payment_verified specifically,
  // not just an address -- see anon.ts's paymentVerifiedUserId() doc comment.
  const userId = await paymentVerifiedUserId();

  if (isJson) {
    if (!userId) return Response.json({ error: (await verifiedUserId()) ? "pay" : "verify" }, { status: 403 });
    const b = (await request.json()) as {
      topicId?: string; title?: string; body?: string;
      signature?: string; publicKeyFingerprint?: string;
    };
    const res = await createProposal({
      userId,
      topicId: String(b.topicId ?? ""),
      title: String(b.title ?? "").slice(0, 200),
      body: String(b.body ?? "").slice(0, 4000),
      signature: b.signature || undefined,
      publicKeyFingerprint: b.publicKeyFingerprint || undefined,
      contextHash: hashContext(request.headers.get("x-forwarded-for") ?? "unknown", request.headers.get("user-agent") ?? "unknown"),
    });
    return Response.json(res);
  }

  const form = await request.formData();
  const lang = String(form.get("lang") ?? "en");
  if (!userId) return redirectTo((await verifiedUserId()) ? `/verify/payment?lang=${lang}` : `/verify?lang=${lang}`, request);
  const res = await createProposal({
    userId,
    topicId: String(form.get("topicId") ?? ""),
    title: String(form.get("title") ?? "").slice(0, 200),
    body: String(form.get("body") ?? "").slice(0, 4000),
    signature: (form.get("signature") as string) || undefined,
    publicKeyFingerprint: (form.get("publicKeyFingerprint") as string) || undefined,
    contextHash: hashContext(request.headers.get("x-forwarded-for") ?? "unknown", request.headers.get("user-agent") ?? "unknown"),
  });
  if (res.signatureInvalid) return redirectTo(`/debates?lang=${lang}&error=signature`, request);
  return redirectTo(`/debates/${res.id}?lang=${lang}`, request);
}
