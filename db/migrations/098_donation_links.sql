-- Voluntary donation tiles on the "you're verified" screen (2026-09-03,
-- owner's explicit call after weighing native-payment-sheet vs. hosted-link
-- options for the $20/$50/$100/$500/$1000/"More" tiles requested live
-- testing: Stripe Payment Links, not a second in-app checkout. An admin
-- creates these once in the Stripe Dashboard (five fixed-amount links plus
-- one "customer enters their own amount" link for "More") and pastes the
-- URLs into /admin/payments; tapping a tile just opens that Stripe-hosted
-- page. Deliberately NOT a new payment_verifications-style table with its
-- own webhook -- these are a "give more if you'd like" upsell shown only
-- AFTER the $5 identity-verification charge already succeeded, nothing in
-- this app gates on whether someone donates, so there's no correctness
-- reason to track completion here; Stripe's own dashboard is the record.
-- Also sidesteps reintroducing Apple's in-app-purchase exemption question
-- for donations that mobile's Membership/Subscribe flow already opted out
-- of once (see settings.tsx's own 2026-08-24 comment) -- every tile here,
-- mobile included, opens an external Stripe-hosted page, never a native
-- card form.
ALTER TABLE payment_settings
  ADD COLUMN donation_link_20 TEXT,
  ADD COLUMN donation_link_50 TEXT,
  ADD COLUMN donation_link_100 TEXT,
  ADD COLUMN donation_link_500 TEXT,
  ADD COLUMN donation_link_1000 TEXT,
  ADD COLUMN donation_link_more TEXT;
