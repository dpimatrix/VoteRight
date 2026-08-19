import Stripe from "stripe";

export interface StripeCreds {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string | null;
}

/* Not a module-level singleton -- the keys live in the database and an
   admin can change them at runtime without a redeploy, so a cached client
   would silently keep using a stale/revoked key. Cheap to construct per
   request; the SDK does no network I/O until a call is actually made. */
export function stripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey);
}

/** Card confirms client-side almost immediately via the Payment Element;
    ACH (us_bank_account) settles over 1-4 business days and reports
    'processing' in the meantime. Either way, the caller must not trust
    client-side confirmation alone -- see verifyWebhook below. */
export async function createStripeIntent(
  creds: StripeCreds,
  opts: { amountCents: number; userId: string },
): Promise<{ clientSecret: string; stripeIntentId: string }> {
  const stripe = stripeClient(creds.secretKey);
  const intent = await stripe.paymentIntents.create({
    amount: opts.amountCents,
    currency: "usd",
    payment_method_types: ["card", "us_bank_account"],
    metadata: { voteright_user_id: opts.userId },
  });
  return { clientSecret: intent.client_secret!, stripeIntentId: intent.id };
}

export interface StripeWebhookResult {
  stripeIntentId: string;
  method: "card" | "ach";
  status: "succeeded" | "pending" | "failed";
}

/** Verifies the Stripe-Signature header and returns the outcome, or null
    for an event type this app doesn't act on. Never trust a webhook body
    without this -- an unverified webhook is an open door to mint
    payment_verified for free. */
export function handleStripeWebhook(creds: StripeCreds, rawBody: string, signatureHeader: string): StripeWebhookResult | null {
  if (!creds.webhookSecret) throw new Error("Stripe webhook secret not configured");
  const stripe = stripeClient(creds.secretKey);
  const event = stripe.webhooks.constructEvent(rawBody, signatureHeader, creds.webhookSecret);
  if (
    event.type !== "payment_intent.succeeded" &&
    event.type !== "payment_intent.processing" &&
    event.type !== "payment_intent.payment_failed"
  ) {
    return null;
  }
  const intent = event.data.object as Stripe.PaymentIntent;
  const method = intent.payment_method_types?.includes("us_bank_account") ? "ach" : "card";
  const status = event.type === "payment_intent.succeeded" ? "succeeded" : event.type === "payment_intent.processing" ? "pending" : "failed";
  return { stripeIntentId: intent.id, method, status };
}
