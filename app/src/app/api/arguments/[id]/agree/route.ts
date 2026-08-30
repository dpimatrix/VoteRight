import { paymentVerifiedUserId, verifiedUserId } from "@/lib/anon";
import { agreeVote } from "@/lib/debates";
import { redirectTo } from "@/lib/redirect";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isJson = (request.headers.get("content-type") ?? "").includes("application/json");
  // Debate participation (2026-08-19) requires payment_verified specifically,
  // not just an address -- see anon.ts's paymentVerifiedUserId() doc comment.
  const userId = await paymentVerifiedUserId();

  if (isJson) {
    if (!userId) return Response.json({ error: (await verifiedUserId()) ? "pay" : "verify" }, { status: 403 });
    const b = (await request.json()) as { response?: string };
    if (!["agree", "disagree", "pass"].includes(b.response ?? "")) {
      return Response.json({ error: "invalid" }, { status: 400 });
    }
    const res = await agreeVote(id, userId, b.response as "agree" | "disagree" | "pass");
    if (!res.ok) return Response.json({ error: res.reason }, { status: 409 });
    return Response.json({ ok: true });
  }

  const form = await request.formData();
  const lang = String(form.get("lang") ?? "en");
  const back = String(form.get("back") ?? "/debates");
  const response = String(form.get("response") ?? "");
  if (!userId) return redirectTo((await verifiedUserId()) ? `/verify/payment?lang=${lang}` : `/verify?lang=${lang}`, request);
  if (["agree", "disagree", "pass"].includes(response)) {
    // Found live 2026-08-29: this used to discard agreeVote()'s own
    // rejection reason entirely -- reachable in normal use, not just a
    // direct-POST bypass: the argument's own moderation status, or the
    // thread's open/closed state, can both change in the gap between page
    // load (where the vote buttons' own rendering is gated on both) and
    // this submit.
    const res = await agreeVote(id, userId, response as "agree" | "disagree" | "pass");
    if (!res.ok) return redirectTo(`${back}?lang=${lang}&error=${res.reason}`, request);
  }
  return redirectTo(`${back}?lang=${lang}`, request);
}
