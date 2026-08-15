import { verifiedUserId } from "@/lib/anon";
import { ctqVote } from "@/lib/debates";
import { redirectTo } from "@/lib/redirect";
import { hashContext } from "@/lib/signing";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: threadId } = await params;
  const isJson = (request.headers.get("content-type") ?? "").includes("application/json");
  const userId = await verifiedUserId();
  const ip = request.headers.get("x-forwarded-for");
  const requestContext = { ip, contextHash: hashContext(ip ?? "unknown", request.headers.get("user-agent") ?? "unknown") };

  if (isJson) {
    if (!userId) return Response.json({ error: "verify" }, { status: 403 });
    const res = await ctqVote(threadId, userId, requestContext);
    return Response.json(res);
  }

  const form = await request.formData();
  const lang = String(form.get("lang") ?? "en");
  const back = String(form.get("back") ?? "/debates");
  if (!userId) return redirectTo(`/verify?lang=${lang}`, request);
  await ctqVote(threadId, userId, requestContext);
  return redirectTo(`${back}?lang=${lang}`, request);
}
