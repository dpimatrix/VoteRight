import { supportCampaign } from "@/lib/accountability";
import { verifiedUserId } from "@/lib/anon";
import { userTier } from "@/lib/debates";
import { hashContext } from "@/lib/signing";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await request.formData();
  const lang = String(form.get("lang") ?? "en");
  const userId = await verifiedUserId();
  if (!userId) return Response.redirect(new URL(`/verify?lang=${lang}`, request.url), 303);
  const signature = form.get("signature") as string | null;
  const publicKeyFingerprint = form.get("publicKeyFingerprint") as string | null;
  await supportCampaign(
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
  return Response.redirect(new URL(`/accountability/${id}?lang=${lang}`, request.url), 303);
}
