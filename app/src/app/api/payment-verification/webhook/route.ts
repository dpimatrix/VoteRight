import { handleGatewayWebhook } from "@/lib/paymentVerification";

/* Stripe signs the RAW request body -- request.text() here, never
   request.json(), or the signature check fails even for a legitimate event
   (any re-serialization changes byte-for-byte content). No admin/user auth
   on this route by design: the signature check IS the auth, the same way
   it works for any webhook receiver.

   Used to also dispatch Authorize.Net webhooks (x-anet-signature header) --
   removed along with the rest of Authorize.Net support (2026-09-05,
   migration 102); see paymentVerification.ts's own header comment. */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const stripeSignature = request.headers.get("stripe-signature");
  try {
    await handleGatewayWebhook(rawBody, stripeSignature);
  } catch (e) {
    // Stripe retries on non-2xx, which is what we want for a real transient
    // failure -- but a bad signature should never look "retry-able" to
    // whoever sent it, so a bad-signature 400 vs. a real processing error
    // would ideally be distinguished. Kept as one 400 for now: logging the
    // real error server-side is what actually matters for catching a
    // misconfiguration, not the caller-visible status nuance.
    console.error("payment webhook error:", e);
    return new Response("error", { status: 400 });
  }
  return new Response("ok", { status: 200 });
}
