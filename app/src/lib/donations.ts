import { createDonationCheckoutSession } from "./paymentGateways/stripe";
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
): Promise<{ ok: true; url: string } | { ok: false; reason: "not_configured" | "bad_amount" }> {
  if (!Number.isInteger(amountCents) || amountCents < MIN_DONATION_CENTS || amountCents > MAX_DONATION_CENTS) {
    return { ok: false, reason: "bad_amount" };
  }
  const settings = await getPaymentSettings();
  if (!settings.stripe) return { ok: false, reason: "not_configured" };
  const priceId = donationPriceIdFor(amountCents, settings.donationTierPriceIds);
  const { url } = await createDonationCheckoutSession(settings.stripe, {
    amountCents,
    priceId,
    successUrl: opts.successUrl,
    cancelUrl: opts.cancelUrl,
  });
  return { ok: true, url };
}

// Re-exported so callers that only care about "what are the possible
// tiers" (the admin form, the web/mobile UI's own local constant) don't
// need to reach into paymentVerification.ts directly for it.
export { DONATION_TIERS_CENTS };
