-- Donor record-keeping (2026-09-05, owner's explicit request). VoteRight
-- isn't a determined 501(c)(3) yet -- no application filed, per the owner
-- directly -- so nothing here issues a tax receipt or claims
-- deductibility; this is purely defensive record-keeping. Many
-- organizations' eventual IRS exempt-status determination applies
-- retroactively to their formation date when the application is filed
-- within the required window (confirm the specifics with counsel/an
-- accountant for VoteRight's own situation) -- if that happens here,
-- donations collected before determination could become retroactively
-- deductible, and VoteRight would want to be able to go back and
-- properly acknowledge whoever gave during that gap. Without this table,
-- that would be impossible: the checkout flow (migrations 099/100) was
-- deliberately built to keep zero local donor record, relying entirely
-- on Stripe's own dashboard as the ledger, which is fine for bookkeeping
-- but not for donor outreach months later.
--
-- Populated by a NEW, separate webhook (own signing secret, same
-- deliberate-separation pattern payment_settings.stripe_webhook_secret
-- and subscription_settings.stripe_webhook_secret already establish for
-- their own Stripe surfaces) listening for checkout.session.completed on
-- donation Checkout Sessions specifically -- see donations.ts's
-- handleDonationWebhook. donor_name/donor_email come from Stripe's own
-- Checkout Session customer_details, whatever the donor typed on
-- Stripe's hosted page -- VoteRight's own UI never asks for either.
CREATE TABLE donation_records (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_checkout_session_id  TEXT NOT NULL UNIQUE,
    donor_name                  TEXT,
    donor_email                 TEXT,
    amount_cents                INT NOT NULL,
    currency                    TEXT NOT NULL DEFAULT 'usd',
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dedicated webhook secret for donation Checkout Sessions -- reuses the
-- same Stripe secret key already in payment_settings (one Stripe
-- account), but its own webhook destination, so a donation event is
-- never mistaken for -- or accidentally processed by -- the $5
-- verification webhook or the subscriptions webhook.
ALTER TABLE payment_settings
  ADD COLUMN donation_webhook_secret TEXT;
