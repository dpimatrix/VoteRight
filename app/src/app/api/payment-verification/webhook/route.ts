import { handleGatewayWebhook } from "@/lib/paymentVerification";

/* Stripe and Authorize.Net both sign the RAW request body -- request.text()
   here, never request.json(), or the signature check fails even for a
   legitimate event (any re-serialization changes byte-for-byte content).
   No admin/user auth on this route by design: the signature check IS the
   auth, the same way it works for any webhook receiver. */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const stripeSignature = request.headers.get("stripe-signature");
  const authorizenetSignature = request.headers.get("x-anet-signature");
  try {
    await handleGatewayWebhook(rawBody, { stripeSignature, authorizenetSignature });
  } catch (e) {
    // Stripe/Authorize.Net both retry on non-2xx, which is what we want for
    // a real transient failure -- but a bad signature should never look
    // "retry-able" to whoever sent it, so a bad-signature 400 vs. a real
    // processing error would ideally be distinguished. Kept as one 400 for
    // now: logging the real error server-side is what actually matters for
    // catching a misconfiguration, not the caller-visible status nuance.
    console.error("payment webhook error:", e);
    return new Response("error", { status: 400 });
  }
  return new Response("ok", { status: 200 });
}
