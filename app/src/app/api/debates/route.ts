import { verifiedUserId } from "@/lib/anon";
import { createProposal } from "@/lib/debates";

export async function POST(request: Request) {
  const form = await request.formData();
  const lang = String(form.get("lang") ?? "en");
  const userId = await verifiedUserId();
  if (!userId) return Response.redirect(new URL(`/verify?lang=${lang}`, request.url), 303);
  const id = await createProposal(
    userId,
    String(form.get("topicId") ?? ""),
    String(form.get("title") ?? "").slice(0, 200),
    String(form.get("body") ?? "").slice(0, 4000),
  );
  return Response.redirect(new URL(`/debates/${id}?lang=${lang}`, request.url), 303);
}
