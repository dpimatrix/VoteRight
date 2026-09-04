-- Reverts migration 098 (2026-09-04, owner's own follow-up correction).
-- Donation tiles now create a Stripe Checkout Session dynamically per tap
-- (app/src/lib/donations.ts, /api/donate/checkout) instead of linking to
-- admin-pasted Stripe Payment Links -- the owner pointed out, correctly,
-- that the $5 verification fee already proves Stripe will process any
-- amount sent to it via the API with zero Dashboard pre-setup, the same
-- way createStripeIntent works; there was no real reason to require an
-- admin to hand-create 6 Payment Links (5 fixed tiers + a "customer
-- chooses amount" link for "More") when the app can just do that itself,
-- on the fly, for whatever amount is tapped. These columns were live for
-- under a day and never held real Dashboard-created URLs in production.
ALTER TABLE payment_settings
  DROP COLUMN donation_link_20,
  DROP COLUMN donation_link_50,
  DROP COLUMN donation_link_100,
  DROP COLUMN donation_link_500,
  DROP COLUMN donation_link_1000,
  DROP COLUMN donation_link_more;
