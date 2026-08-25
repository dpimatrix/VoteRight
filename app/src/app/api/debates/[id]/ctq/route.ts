import { paymentVerifiedUserId, verifiedUserId } from "@/lib/anon";
import { ctqVote } from "@/lib/debates";
import { redirectTo } from "@/lib/redirect";
import { hashContext } from "@/lib/signing";

/* Restored 2026-08-24 (migration 094) after being removed in migration 093
   -- see debates.ts's ctqVote() header comment for why the underlying
   mechanism came back with floors rather than staying removed. :id is the
   thread id, matching second/report's own convention for thread-scoped
   actions under /api/debates/[id]/. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: threadId } = await params;
  const isJson = (request.headers.get("content-type") ?? "").includes("application/json");
  // Debate participation (2026-08-19) requires payment_verified specifically
  // -- see anon.ts's paymentVerifiedUserId() doc comment.
  const userId = await paymentVerifiedUserId();
  const ip = request.headers.get("x-forwarded-for");
  const requestContext = { ip, contextHash: hashContext(ip ?? "unknown", request.headers.get("user-agent") ?? "unknown") };

  if (isJson) {
    if (!userId) return Response.json({ error: (await verifiedUserId()) ? "pay" : "verify" }, { status: 403 });
    const res = await ctqVote(threadId, userId, requestContext);
    return Response.json(res);
  }

  const form = await request.formData();
  const lang = String(form.get("lang") ?? "en");
  const back = String(form.get("back") ?? "/debates");
  if (!userId) return redirectTo((await verifiedUserId()) ? `/verify/payment?lang=${lang}` : `/verify?lang=${lang}`, request);
  await ctqVote(threadId, userId, requestContext);
  return redirectTo(`${back}?lang=${lang}`, request);
}
