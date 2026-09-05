import { handleDonationWebhook } from "@/lib/donations";

/* Donation Checkout Session webhook (migration 101) -- a SEPARATE endpoint
   and signing secret from /api/payment-verification/webhook, same
   deliberate-separation pattern /api/subscriptions/webhook already uses
   for its own Stripe surface. Stripe signs the RAW request body -- see
   payment-verification/webhook's own comment on request.text() vs
   request.json(). No admin/user auth by design: the signature check IS
   the auth. */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const stripeSignature = request.headers.get("stripe-signature");
  if (!stripeSignature) return new Response("missing signature", { status: 400 });
  try {
    await handleDonationWebhook(rawBody, stripeSignature);
  } catch (e) {
    console.error("donation webhook error:", e);
    return new Response("error", { status: 400 });
  }
  return new Response("ok", { status: 200 });
}
