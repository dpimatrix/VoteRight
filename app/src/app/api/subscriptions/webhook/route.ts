import { handleSubscriptionWebhook } from "@/lib/subscriptions";

/* Deliberately a SEPARATE Stripe webhook destination from
   /api/payment-verification/webhook (see subscriptions.ts's header
   comment) -- its own signing secret, so this can be set up/rotated
   without touching the already-verified-live payment_verified path. Raw
   body required for signature verification, same as the other webhook. */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("missing signature", { status: 400 });
  try {
    await handleSubscriptionWebhook(rawBody, signature);
  } catch (e) {
    console.error("subscription webhook error:", e);
    return new Response("error", { status: 400 });
  }
  return new Response("ok", { status: 200 });
}
