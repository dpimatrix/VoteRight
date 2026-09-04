-- Third iteration on donation tiles (2026-09-04, owner's own follow-up
-- after seeing the subscription tiers' clean Product-catalog entries):
-- the $20/$50/$100/$500/$1000 tiles now reference an admin-created Stripe
-- Price when one exists for that amount, same stripePriceId pattern
-- subscription_plans already uses -- donations show up grouped under a
-- real Product in Stripe's reporting instead of a fresh ad-hoc "Donation
-- to VoteRight" line item on every tap (099's fully-dynamic approach).
-- "More" has no fixed amount to attach a Price to, so it (and any tier
-- left unconfigured here) still falls back to an inline price at request
-- time -- see createDonationCheckoutSession's own comment.
--
-- Flat columns on payment_settings, not a new table: unlike
-- subscription_plans (admin-editable display name + price + Stripe Price
-- per tier), the five dollar amounts here are fixed in code
-- (DONATION_TIERS_CENTS in donations.ts, the owner's own literal request
-- "$20, $50, $100, $500, $1000") -- only the Stripe Price reference
-- varies, so one row's worth of columns is the whole story.
ALTER TABLE payment_settings
  ADD COLUMN donation_price_id_20   TEXT,
  ADD COLUMN donation_price_id_50   TEXT,
  ADD COLUMN donation_price_id_100  TEXT,
  ADD COLUMN donation_price_id_500  TEXT,
  ADD COLUMN donation_price_id_1000 TEXT;
