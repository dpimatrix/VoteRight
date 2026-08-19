import { verifiedUserId } from "@/lib/anon";
import { PaymentNotConfigured, startCardPayment } from "@/lib/paymentVerification";

/* Requires address_verified FIRST (verifiedUserId(), not the stricter
   paymentVerifiedUserId()) -- payment is an ADDITIONAL identity-strength
   signal layered on top of already knowing which jurisdiction someone
   lives in, not a replacement for it. Without an address on file there's
   no debate/race context to even attach participation to, regardless of
   how strongly identity itself is proven. */
export async function POST() {
  const userId = await verifiedUserId();
  if (!userId) return Response.json({ error: "verify" }, { status: 403 });
  try {
    const result = await startCardPayment(userId);
    return Response.json(result);
  } catch (e) {
    if (e instanceof PaymentNotConfigured) return Response.json({ error: e.message }, { status: 503 });
    throw e;
  }
}
