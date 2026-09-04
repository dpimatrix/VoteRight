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

/** Voluntary donation checkout (migration 099, replacing the admin-pasted
    Stripe Payment Links from 098 -- owner's explicit follow-up call: no
    Dashboard pre-setup at all, not even for fixed tiers, so this creates a
    Checkout Session for whatever amount was tapped at request time, the
    same "call the API fresh each time" shape createStripeIntent above
    already uses for the $5 fee, just Stripe-hosted instead of our own
    native/Elements form. No metadata tying this to a user id -- unlike
    payment verification, nothing in the app reads a donation's outcome,
    so there's nothing here to look up later. */
export async function createDonationCheckoutSession(
  creds: StripeCreds,
  opts: { amountCents: number; successUrl: string; cancelUrl: string },
): Promise<{ url: string }> {
  const stripe = stripeClient(creds.secretKey);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: "Donation to VoteRight" },
          unit_amount: opts.amountCents,
        },
        quantity: 1,
      },
    ],
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
  });
  if (!session.url) throw new Error("Stripe did not return a Checkout Session URL");
  return { url: session.url };
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
export async function handleStripeWebhook(creds: StripeCreds, rawBody: string, signatureHeader: string): Promise<StripeWebhookResult | null> {
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
  // Real bug found live 2026-08-19: intent.payment_method_types is the
  // intent's ALLOWED method types (every intent this app creates allows
  // both card and us_bank_account, per createStripeIntent above), not
  // which one was actually used for THIS charge -- checking it against
  // 'us_bank_account' was true unconditionally, misclassifying every card
  // payment as ACH. The actual method used lives on the specific
  // PaymentMethod object (intent.payment_method, a string id on the
  // webhook payload), which needs its own retrieve call to read .type.
  let method: "card" | "ach" = "card";
  if (typeof intent.payment_method === "string") {
    const pm = await stripe.paymentMethods.retrieve(intent.payment_method);
    method = pm.type === "us_bank_account" ? "ach" : "card";
  }
  const status = event.type === "payment_intent.succeeded" ? "succeeded" : event.type === "payment_intent.processing" ? "pending" : "failed";
  return { stripeIntentId: intent.id, method, status };
}
