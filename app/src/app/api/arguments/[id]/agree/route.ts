import { verifiedUserId } from "@/lib/anon";
import { agreeVote } from "@/lib/debates";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isJson = (request.headers.get("content-type") ?? "").includes("application/json");
  const userId = await verifiedUserId();

  if (isJson) {
    if (!userId) return Response.json({ error: "verify" }, { status: 403 });
    const b = (await request.json()) as { response?: string };
    if (!["agree", "disagree", "pass"].includes(b.response ?? "")) {
      return Response.json({ error: "invalid" }, { status: 400 });
    }
    await agreeVote(id, userId, b.response as "agree" | "disagree" | "pass");
    return Response.json({ ok: true });
  }

  const form = await request.formData();
  const lang = String(form.get("lang") ?? "en");
  const back = String(form.get("back") ?? "/debates");
  const response = String(form.get("response") ?? "");
  if (!userId) return Response.redirect(new URL(`/verify?lang=${lang}`, request.url), 303);
  if (["agree", "disagree", "pass"].includes(response)) {
    await agreeVote(id, userId, response as "agree" | "disagree" | "pass");
  }
  return Response.redirect(new URL(`${back}?lang=${lang}`, request.url), 303);
}
