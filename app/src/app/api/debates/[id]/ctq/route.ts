import { verifiedUserId } from "@/lib/anon";
import { ctqVote } from "@/lib/debates";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: threadId } = await params;
  const form = await request.formData();
  const lang = String(form.get("lang") ?? "en");
  const back = String(form.get("back") ?? "/debates");
  const userId = await verifiedUserId();
  if (!userId) return Response.redirect(new URL(`/verify?lang=${lang}`, request.url), 303);
  await ctqVote(threadId, userId);
  return Response.redirect(new URL(`${back}?lang=${lang}`, request.url), 303);
}
