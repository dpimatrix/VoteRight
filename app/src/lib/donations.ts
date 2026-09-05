import { db } from "./db";
import { createDonationCheckoutSession, handleDonationCheckoutWebhook } from "./paymentGateways/stripe";
import { donationPriceIdFor, getPaymentSettings, DONATION_TIERS_CENTS } from "./paymentVerification";

/* Voluntary donation checkout. Three iterations, in order, on this exact
   feature (2026-09-03/04):
     098: admin-pasted Stripe Payment Links, one per tier -- dropped
          because it needed Dashboard pre-setup for every single amount,
          including "More", when the $5 fee already proves Stripe doesn't
          require that.
     099: fully dynamic -- a Checkout Session created fresh per tap, an
          inline ad-hoc price every time, zero Dashboard objects at all.
     100 (current): dynamic Checkout Session still created per tap (no
          admin action needed to make a NEW tier work), but referencing an
          admin-created Stripe Price when one exists for the tapped
          amount -- donations show up grouped under one real Product in
          Stripe's reporting instead of a fresh one-off "Donation to
          VoteRight" line every time, matching how subscriptions.ts's own
          stripePriceId already works. donationPriceIdFor's own comment in
          paymentVerification.ts has the tier->column mapping.

   "More" has no fixed amount to attach a Price to, so it -- and any tier
   the admin hasn't configured a Price for yet -- always falls back to an
   inline price at request time (createDonationCheckoutSession's own
   comment); nothing here ever blocks a donation for lack of a pre-created
   Price.

   Donations require Stripe specifically -- Authorize.Net has no hosted-
   checkout equivalent in this codebase (Accept.js is a native card-form
   flow, not a redirect target), so this is independent of activeGateway;
   an admin running Authorize.Net for the $5 fee simply sees no donation
   tiles at all rather than a broken "not available" state, same as
   PaymentCheckout.tsx's honest not-yet-supported message for the
   opposite mismatch. */

// Stripe's own minimum for a USD charge; a fat-finger guard above that,
// not a business rule -- there's no real reason to cap a genuine donation,
// but an accidental extra zero (e.g. $10,000,000) shouldn't sail through
// to a live charge attempt unquestioned.
const MIN_DONATION_CENTS = 50;
const MAX_DONATION_CENTS = 100_000_00; // $100,000

export async function startDonationCheckout(
  amountCents: number,
  opts: { successUrl: string; cancelUrl: string },
): Promise<{ ok: true; url: string } | { ok: false; reason: "not_configured" | "bad_amount" | "gateway_error" }> {
  if (!Number.isInteger(amountCents) || amountCents < MIN_DONATION_CENTS || amountCents > MAX_DONATION_CENTS) {
    return { ok: false, reason: "bad_amount" };
  }
  const settings = await getPaymentSettings();
  if (!settings.stripe) return { ok: false, reason: "not_configured" };
  const priceId = donationPriceIdFor(amountCents, settings.donationTierPriceIds);
  try {
    const { url } = await createDonationCheckoutSession(settings.stripe, {
      amountCents,
      priceId,
      successUrl: opts.successUrl,
      cancelUrl: opts.cancelUrl,
    });
    return { ok: true, url };
  } catch (e) {
    // Real bug found live testing 2026-09-05: this had no error handling
    // at all, so a Stripe API rejection (observed cause: a Price ID saved
    // while the account was still in live mode no longer resolves once
    // the account's keys are switched to test mode -- Stripe scopes every
    // object, Price IDs included, to the mode it was created in) crashed
    // the whole route with a raw 500 instead of the donation just working
    // anyway. Since a configured Price ID is a reporting nicety, never a
    // requirement (donationPriceIdFor's own comment), a bad one should
    // degrade to the same inline-price fallback an unconfigured tier
    // already uses -- not take the whole donation down with it. Only
    // retry once, and only if a priceId was actually the thing that might
    // be at fault; if it fails again (or there was no priceId to blame in
    // the first place), that's a real gateway problem worth surfacing.
    if (priceId) {
      console.error(`Donation Checkout Session failed with priceId ${priceId}, retrying with inline pricing:`, e);
      try {
        const { url } = await createDonationCheckoutSession(settings.stripe, {
          amountCents,
          priceId: null,
          successUrl: opts.successUrl,
          cancelUrl: opts.cancelUrl,
        });
        return { ok: true, url };
      } catch (e2) {
        console.error("Donation Checkout Session failed again with inline pricing:", e2);
        return { ok: false, reason: "gateway_error" };
      }
    }
    console.error("Donation Checkout Session failed:", e);
    return { ok: false, reason: "gateway_error" };
  }
}

/** Donor record-keeping (migration 101, owner's explicit request 2026-09-05).
    VoteRight isn't a determined 501(c)(3) yet -- nothing here issues a tax
    receipt or claims deductibility, and no user-facing behavior changes at
    all. Purely defensive: if VoteRight's eventual IRS determination ends up
    retroactive to before it was granted (confirm the specifics with
    counsel/an accountant), this is what makes it possible to go back and
    properly acknowledge whoever donated in the meantime -- the checkout
    flow itself (migrations 099/100) was deliberately built to keep zero
    local donor record otherwise, relying entirely on Stripe's own
    dashboard.

    ON CONFLICT DO NOTHING on the unique session id makes a redelivered
    webhook (Stripe retries on anything other than a 2xx) a no-op rather
    than a duplicate row. */
export async function handleDonationWebhook(rawBody: string, signatureHeader: string): Promise<void> {
  const settings = await getPaymentSettings();
  if (!settings.stripe) throw new Error("Stripe not configured");
  if (!settings.donationWebhookSecret) throw new Error("Donation webhook secret not configured");
  const result = await handleDonationCheckoutWebhook(settings.stripe.secretKey, settings.donationWebhookSecret, rawBody, signatureHeader);
  if (!result) return;
  await db().query(
    `INSERT INTO donation_records (stripe_checkout_session_id, donor_name, donor_email, amount_cents, currency)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (stripe_checkout_session_id) DO NOTHING`,
    [result.stripeCheckoutSessionId, result.donorName, result.donorEmail, result.amountCents, result.currency],
  );
}

// Re-exported so callers that only care about "what are the possible
// tiers" (the admin form, the web/mobile UI's own local constant) don't
// need to reach into paymentVerification.ts directly for it.
export { DONATION_TIERS_CENTS };
