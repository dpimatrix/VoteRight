import { paymentVerifiedUserId, verifiedUserId } from "@/lib/anon";
import { reportThread } from "@/lib/debates";
import { redirectTo } from "@/lib/redirect";
import { hashContext } from "@/lib/signing";

/* Member abuse reports on a debate thread (2026-08-24, migration 093,
   replacing the removed "call the question" route). Same JSON/form dual-mode
   shape every other debate-action route in this file uses (native app vs.
   plain HTML form). :id is the thread id, matching second/ctq's own
   convention for thread-scoped actions under /api/debates/[id]/. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: threadId } = await params;
  const isJson = (request.headers.get("content-type") ?? "").includes("application/json");
  // Same bar as every other debate action -- see anon.ts's paymentVerifiedUserId() doc comment.
  const userId = await paymentVerifiedUserId();
  const ip = request.headers.get("x-forwarded-for");
  const requestContext = { ip, contextHash: hashContext(ip ?? "unknown", request.headers.get("user-agent") ?? "unknown") };

  if (isJson) {
    if (!userId) return Response.json({ error: (await verifiedUserId()) ? "pay" : "verify" }, { status: 403 });
    const b = (await request.json()) as { reason?: string };
    if (!b.reason?.trim()) return Response.json({ error: "invalid" }, { status: 400 });
    const res = await reportThread(threadId, userId, b.reason, requestContext);
    if (!res.ok) return Response.json({ error: res.reason }, { status: 400 });
    return Response.json({ ok: true });
  }

  const form = await request.formData();
  const lang = String(form.get("lang") ?? "en");
  const back = String(form.get("back") ?? "/debates");
  const reason = String(form.get("reason") ?? "").trim();
  if (!userId) return redirectTo((await verifiedUserId()) ? `/verify/payment?lang=${lang}` : `/verify?lang=${lang}`, request);
  // Found live 2026-08-29: this used to discard reportThread()'s own
  // rejection reason entirely (most reachably "closed" -- the thread can
  // close in the gap between page load, where the report form's own
  // rendering was gated on it still being open, and this submit). Now
  // surfaces it via ?error=, rendered as a banner by debates/[id]/page.tsx.
  if (reason) {
    const res = await reportThread(threadId, userId, reason, requestContext);
    if (!res.ok) return redirectTo(`${back}?lang=${lang}&error=${res.reason}`, request);
  }
  return redirectTo(`${back}?lang=${lang}`, request);
}
