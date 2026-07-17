import { verifiedUserId } from "@/lib/anon";
import { agreeVote } from "@/lib/debates";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await request.formData();
  const lang = String(form.get("lang") ?? "en");
  const back = String(form.get("back") ?? "/debates");
  const response = String(form.get("response") ?? "");
  const userId = await verifiedUserId();
  if (!userId) return Response.redirect(new URL(`/verify?lang=${lang}`, request.url), 303);
  if (["agree", "disagree", "pass"].includes(response)) {
    await agreeVote(id, userId, response as "agree" | "disagree" | "pass");
  }
  return Response.redirect(new URL(`${back}?lang=${lang}`, request.url), 303);
}
