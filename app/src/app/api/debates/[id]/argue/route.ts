import { verifiedUserId } from "@/lib/anon";
import { postArgument } from "@/lib/debates";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: threadId } = await params;
  const userId = await verifiedUserId();
  if (!userId) return Response.json({ error: "verify" }, { status: 403 });
  const b = (await request.json()) as {
    side?: string; body?: string; citationUrl?: string; citationTitle?: string; claimResponse?: string;
  };
  if (!["for", "against", "neutral_info"].includes(b.side ?? "") || !b.body || b.body.length < 10) {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  const res = await postArgument({
    threadId,
    userId,
    side: b.side as "for" | "against" | "neutral_info",
    body: b.body.slice(0, 4000),
    citationUrl: b.citationUrl || undefined,
    citationTitle: b.citationTitle || undefined,
    claimResponse: (["marked_as_opinion", "dismissed"].includes(b.claimResponse ?? "")
      ? b.claimResponse
      : undefined) as "marked_as_opinion" | "dismissed" | undefined,
  });
  return Response.json(res);
}
