-- Payment-as-verification tier (2026-08-19 decision, replacing the
-- long-open govt_id_verified/counsel-review question from ARCHITECTURE.md
-- §13 item 9). The owner's own conclusion after that item's equity-vs-Sybil
-- tradeoff was raised: government ID document checks (Persona, Stripe
-- Identity) were rejected outright -- confirmed live that neither offers a
-- real free tier (Persona: no free plan, cheapest is $250/mo Essential;
-- Stripe Identity: no free tier, $1.50/check pay-per-use) -- in favor of a
-- different signal entirely: a successful card charge or ACH/eCheck
-- transfer, tied to a real name/bank account, stands in for identity
-- verification. No ID document upload, no KYC vendor call. (Whether to
-- ALSO require an ID upload on top of this is a separate, still-open
-- decision -- this migration only builds the payment side.)
--
-- 'govt_id_verified' was never reachable by any code path (grep-confirmed
-- before this migration) -- renaming it in place to payment_verified is a
-- safe relabel, not a data migration; no existing row uses it.
ALTER TABLE users DROP CONSTRAINT users_verification_tier_check;
ALTER TABLE users ADD CONSTRAINT users_verification_tier_check
    CHECK (verification_tier IN ('unverified','email_verified','address_verified','payment_verified'));

-- Multi-gateway from the start (2026-08-19 owner direction: Stripe is not
-- the only option, Authorize.Net must be selectable too) -- one settings
-- row holds config for every SUPPORTED gateway at once (so switching
-- active_gateway back and forth doesn't lose the other one's keys), plus
-- which one is actually live. This is also the first admin-configurable
-- runtime setting in this project -- everything else is env-var/.env.
-- production today; the owner explicitly asked for the fee and gateway
-- credentials to be set from /admin/payments rather than requiring a VPS
-- deploy to change either. A CHECK pins this to exactly one row rather
-- than trusting application code alone to enforce that.
CREATE TABLE payment_settings (
    id                          INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    fee_cents                   INT,                       -- NULL until an admin sets it; checkout refuses to run unconfigured
    active_gateway              TEXT CHECK (active_gateway IN ('stripe', 'authorizenet')), -- NULL until an admin picks one
    -- Stripe
    stripe_secret_key           TEXT,                       -- server-side only, never sent to any API response
    stripe_publishable_key      TEXT,                       -- safe to expose to the client; ships in the checkout page
    stripe_webhook_secret       TEXT,                       -- verifies incoming Stripe webhook signatures
    -- Authorize.Net (Accept.js/Accept Hosted tokenization -- card/bank
    -- account numbers are tokenized in the browser and never reach
    -- VoteRight's own server, same PCI-conscious posture as Stripe Elements)
    authorizenet_api_login_id   TEXT,
    authorizenet_transaction_key TEXT,                      -- server-side only
    authorizenet_public_client_key TEXT,                    -- safe to expose to the client; used by Accept.js
    authorizenet_signature_key  TEXT,                       -- verifies incoming webhook/Silent Post signatures
    authorizenet_environment    TEXT NOT NULL DEFAULT 'sandbox' CHECK (authorizenet_environment IN ('sandbox', 'production')),
    -- Check (mail-in), gateway-agnostic
    check_payment_enabled       BOOLEAN NOT NULL DEFAULT true,
    check_instructions          TEXT,                       -- mailing address + what to write on the check, shown to the user and admin
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO payment_settings (id) VALUES (1);

-- One row per payment attempt (not per user -- a failed attempt shouldn't
-- overwrite a later successful one, and a repeat/renewal payment keeps its
-- own history). card/ach settle through whichever gateway was active at
-- the time and carry that gateway's own transaction id; check has no
-- gateway involvement at all and is reconciled by hand.
CREATE TABLE payment_verifications (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL REFERENCES users(id),
    method                  TEXT NOT NULL CHECK (method IN ('card', 'ach', 'check')),
    gateway                 TEXT CHECK (gateway IN ('stripe', 'authorizenet')), -- NULL for check
    amount_cents            INT NOT NULL,
    currency                TEXT NOT NULL DEFAULT 'usd',
    -- card/ach only; NULL for check. Unique (per gateway) when present so a
    -- webhook retry can't double-process the same transaction -- a plain
    -- UNIQUE would be wrong here since Stripe's and Authorize.Net's id
    -- spaces aren't guaranteed disjoint.
    gateway_transaction_id  TEXT,
    status                  TEXT NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
    -- check only: a short code the user is asked to write on the check so a
    -- manually-opened envelope can be matched back to this row.
    check_reference_code    TEXT,
    reconciled_by           TEXT,                        -- admin who marked a check received (see admin-roles note below)
    reconciled_at           TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    verified_at             TIMESTAMPTZ                  -- when this row actually promoted the user's verification_tier
);
CREATE UNIQUE INDEX idx_payment_verifications_gateway_txn ON payment_verifications (gateway, gateway_transaction_id) WHERE gateway_transaction_id IS NOT NULL;
CREATE INDEX idx_payment_verifications_user ON payment_verifications (user_id, created_at DESC);
-- The admin reconciliation queue: pending checks only.
CREATE INDEX idx_payment_verifications_pending_check
    ON payment_verifications (created_at) WHERE method = 'check' AND status = 'pending';
