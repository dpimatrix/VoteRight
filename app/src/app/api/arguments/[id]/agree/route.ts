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
    // Form path has no error UI to surface a rejection to — this is a
    // defense-in-depth backend check, not the primary UX signal; the real
    // UI already only shows these buttons when the vote would be valid.
    await agreeVote(id, userId, response as "agree" | "disagree" | "pass");
  }
  return redirectTo(`${back}?lang=${lang}`, request);
}
