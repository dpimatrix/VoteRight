import { redirectTo } from "@/lib/redirect";
import { verifiedUserId } from "@/lib/anon";
import { secondProposal, userTier } from "@/lib/debates";
import { hashContext } from "@/lib/signing";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isJson = (request.headers.get("content-type") ?? "").includes("application/json");
  const userId = await verifiedUserId();

  if (isJson) {
    if (!userId) return Response.json({ error: "verify" }, { status: 403 });
    const b = (await request.json()) as { signature?: string; publicKeyFingerprint?: string };
    const res = await secondProposal(
      id,
      userId,
      await userTier(userId),
      b.signature && b.publicKeyFingerprint
        ? {
            signature: b.signature,
            publicKeyFingerprint: b.publicKeyFingerprint,
            contextHash: hashContext(request.headers.get("x-forwarded-for") ?? "unknown", request.headers.get("user-agent") ?? "unknown"),
          }
        : undefined,
    );
    return Response.json(res);
  }

  const form = await request.formData();
  const lang = String(form.get("lang") ?? "en");
  if (!userId) return redirectTo(`/verify?lang=${lang}`, request);
  const signature = form.get("signature") as string | null;
  const publicKeyFingerprint = form.get("publicKeyFingerprint") as string | null;
  const res = await secondProposal(
    id,
    userId,
    await userTier(userId),
    signature && publicKeyFingerprint
      ? {
          signature,
          publicKeyFingerprint,
          contextHash: hashContext(request.headers.get("x-forwarded-for") ?? "unknown", request.headers.get("user-agent") ?? "unknown"),
        }
      : undefined,
  );
  const dest = "selfSecond" in res && res.selfSecond ? `/debates/${id}?lang=${lang}&error=self` : `/debates/${id}?lang=${lang}`;
  return redirectTo(dest, request);
}
