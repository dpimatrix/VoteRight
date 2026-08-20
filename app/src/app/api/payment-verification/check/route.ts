import { redirectTo } from "@/lib/redirect";
import { verifiedUserId } from "@/lib/anon";
import { submitCheckPayment } from "@/lib/paymentVerification";

// JSON mode added 2026-08-19 for mobile (no <form> to post, no cookie-based
// redirect flow to follow) -- same isJson dual-mode pattern already
// established in /api/verify: Content-Type: application/json in and out,
// otherwise the original web form/redirect behavior, unchanged.
export async function POST(request: Request) {
  const isJson = (request.headers.get("content-type") ?? "").includes("application/json");
  const userId = await verifiedUserId();

  if (isJson) {
    if (!userId) return Response.json({ error: "verify" }, { status: 403 });
    const { referenceCode, instructions, feeCents } = await submitCheckPayment(userId);
    return Response.json({ referenceCode, instructions, feeCents });
  }

  const form = await request.formData();
  const lang = String(form.get("lang") ?? "en");
  if (!userId) return redirectTo(`/verify?lang=${lang}`, request);
  const { referenceCode } = await submitCheckPayment(userId);
  return redirectTo(`/verify/payment?lang=${lang}&checkCode=${referenceCode}`, request);
}
