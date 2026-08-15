import { verifiedUserId } from "@/lib/anon";
import { postArgument, postMediaArgument } from "@/lib/debates";
import { hashContext } from "@/lib/signing";

export const runtime = "nodejs"; // fs + child_process (ffmpeg) below need the Node runtime, not edge

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: threadId } = await params;
  const userId = await verifiedUserId();
  if (!userId) return Response.json({ error: "verify" }, { status: 403 });

  // Audio/video arguments arrive as multipart/form-data (a file field); text
  // arguments keep the original JSON body below, unchanged.
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.startsWith("multipart/form-data")) {
    const form = await request.formData();
    const side = String(form.get("side") ?? "");
    const format = String(form.get("format") ?? "");
    const file = form.get("media");
    if (!["for", "against", "neutral_info"].includes(side)) {
      return Response.json({ error: "invalid" }, { status: 400 });
    }
    if (format !== "audio" && format !== "video") {
      return Response.json({ error: "invalid" }, { status: 400 });
    }
    if (!(file instanceof File) || file.size === 0) {
      return Response.json({ error: "invalid" }, { status: 400 });
    }
    const res = await postMediaArgument({
      threadId,
      userId,
      side: side as "for" | "against" | "neutral_info",
      format,
      file,
    });
    if (!res.ok) {
      return Response.json({ error: res.error }, { status: res.error === "processing_failed" ? 500 : 400 });
    }
    return Response.json({ prompted: false, id: res.id });
  }

  const b = (await request.json()) as {
    side?: string; body?: string; citationUrl?: string; citationTitle?: string; claimResponse?: string;
    signature?: string; publicKeyFingerprint?: string;
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
    signature: b.signature || undefined,
    publicKeyFingerprint: b.publicKeyFingerprint || undefined,
    contextHash: hashContext(request.headers.get("x-forwarded-for") ?? "unknown", request.headers.get("user-agent") ?? "unknown"),
  });
  return Response.json(res);
}
