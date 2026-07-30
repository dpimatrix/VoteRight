-- Non-repudiation ledger for participant civic speech (ARCHITECTURE.md Section 10).
-- Referendum ballot choices and argument agreement votes stay unsigned by design
-- (Section 10.1/10.2 secret-ballot discipline) — never add those here.

CREATE TABLE user_key_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    event           TEXT NOT NULL CHECK (event IN ('registered','rotated','revoked')),
    public_key      TEXT NOT NULL,
    public_key_fingerprint TEXT NOT NULL,
    context_hash    TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE signed_actions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seq             BIGSERIAL,
    user_id         UUID NOT NULL REFERENCES users(id),
    public_key_fingerprint TEXT NOT NULL,
    action_type     TEXT NOT NULL CHECK (action_type IN ('argument','issue_proposal','second','accountability_support')),
    canonical_payload TEXT NOT NULL,
    signature       TEXT NOT NULL,
    prev_hash       TEXT,
    chain_hash      TEXT NOT NULL UNIQUE,
    context_hash    TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE arguments ADD COLUMN signed_action_id UUID REFERENCES signed_actions(id);
ALTER TABLE issue_proposals ADD COLUMN signed_action_id UUID REFERENCES signed_actions(id);
ALTER TABLE seconds ADD COLUMN signed_action_id UUID REFERENCES signed_actions(id);
ALTER TABLE accountability_campaign_supports ADD COLUMN signed_action_id UUID REFERENCES signed_actions(id);

CREATE INDEX idx_user_key_events_user ON user_key_events(user_id, created_at DESC);
CREATE INDEX idx_user_key_events_fingerprint ON user_key_events(public_key_fingerprint);
CREATE INDEX idx_signed_actions_user ON signed_actions(user_id);
CREATE INDEX idx_signed_actions_fingerprint ON signed_actions(public_key_fingerprint);
CREATE INDEX idx_signed_actions_seq ON signed_actions(seq DESC);
