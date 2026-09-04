import { createDonationCheckoutSession } from "./paymentGateways/stripe";
import { getPaymentSettings } from "./paymentVerification";

/* Voluntary donation checkout (migration 099). See createDonationCheckoutSession's
   own comment for why this replaced admin-pasted Stripe Payment Links: no
   Dashboard pre-setup, a Checkout Session is created fresh per tap for
   whatever amount was requested -- the five tile amounts below are fixed
   in code (the owner's own request: "$20, $50, $100, $500, $1000"), and
   "More" is whatever dollar amount the resident types in, converted to
   cents by the caller before this is reached.

   Donations require Stripe specifically -- Authorize.Net has no hosted-
   checkout equivalent in this codebase (Accept.js is a native card-form
   flow, not a redirect target), so this is independent of activeGateway;
   an admin running Authorize.Net for the $5 fee simply sees no donation
   tiles at all rather than a broken "not available" state, same as
   PaymentCheckout.tsx's honest not-yet-supported message for the
   opposite mismatch. */

export const DONATION_TIERS_CENTS = [2000, 5000, 10000, 50000, 100000] as const;

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
  const { url } = await createDonationCheckoutSession(settings.stripe, {
    amountCents,
    successUrl: opts.successUrl,
    cancelUrl: opts.cancelUrl,
  });
  return { ok: true, url };
}
