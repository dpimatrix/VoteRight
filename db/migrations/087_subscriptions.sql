-- Membership & sustainability funding (ARCHITECTURE.md §14, 2026-08-19).
-- Recurring Stripe Billing subscriptions, deliberately separate from
-- payment_settings/payment_verifications (migration 085, one-time
-- PaymentIntent flow for payment_verified identity) -- own webhook
-- destination/secret so the already-verified payment_verified webhook
-- path is never touched by this work. See §14's governing constraint:
-- nothing here may ever affect voting weight, ballot completeness, match
-- accuracy, or debate participation -- those stay exactly as
-- payment_verified (alone) already governs them.

ALTER TABLE users ADD COLUMN subscription_tier TEXT
    CHECK (subscription_tier IN ('supporter', 'patron', 'champion'));
ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN subscription_status TEXT
    CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete'));
ALTER TABLE users ADD COLUMN subscription_current_period_end TIMESTAMPTZ;

-- Exactly 3 fixed rows (seeded below), not an arbitrary admin-creatable
-- list -- the tier taxonomy itself is a product decision (§14.1), only the
-- price/copy/Stripe wiring per tier is admin-configurable.
CREATE TABLE subscription_plans (
    tier            TEXT PRIMARY KEY CHECK (tier IN ('supporter', 'patron', 'champion')),
    display_name    TEXT NOT NULL,
    price_display   TEXT,               -- e.g. "$4/mo" -- UI label only; the real charge amount lives on the Stripe Price itself
    stripe_price_id TEXT,               -- NULL until an admin configures it; checkout refuses to start for a tier without one
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO subscription_plans (tier, display_name, price_display) VALUES
    ('supporter', 'Supporter', '$4/mo'),
    ('patron', 'Civic Patron', '$12/mo'),
    ('champion', 'Civic Champion', '$40/mo');

-- Separate from payment_settings on purpose (see header) -- same Stripe
-- account/secret key, but a distinct webhook destination with its own
-- signing secret, so this can be configured/rotated without touching the
-- payment_verified webhook that's already live in production.
CREATE TABLE subscription_settings (
    id                    INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    stripe_webhook_secret TEXT,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO subscription_settings (id) VALUES (1);

-- Champion-tier bulk/API access (§14.1). One active key per user in
-- practice (enforced in application code, not a constraint here, so a
-- rotation can briefly overlap old/new) -- raw key shown once at
-- creation, only its hash persisted, same non-recoverable-secret posture
-- as every credential in this app.
CREATE TABLE api_keys (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id),
    key_hash     TEXT NOT NULL UNIQUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at TIMESTAMPTZ,
    revoked_at   TIMESTAMPTZ
);
CREATE INDEX idx_api_keys_user ON api_keys (user_id) WHERE revoked_at IS NULL;
