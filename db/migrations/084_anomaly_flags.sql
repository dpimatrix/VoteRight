-- Sybil/coordinated-manipulation anomaly detection (ARCHITECTURE.md §9, and
-- the security-severity conversation 2026-08-15 that named this High:
-- "trivial attack complexity, no privileges required, no interaction
-- required, direct integrity impact on the platform's core function," with
-- zero layered defense behind the self-attested address_verified check
-- today).
--
-- Confirmed live before building this: address_verified alone has no
-- velocity or geographic check backing it anywhere in the codebase, and the
-- ONLY "anomaly" system that actually exists (user_key_events) protects
-- against a stolen SIGNING KEY, a different problem entirely -- not this
-- one. ARCHITECTURE.md §9 names three specific actions as the highest
-- manipulation-payoff targets: seconding, calling the question, and
-- referendum ballot token issuance -- this covers exactly those three (plus
-- the address-verification step itself, the root action a Sybil attacker
-- performs first), not a broader net. Agreement votes are deliberately
-- excluded, same as the doc's own framing: private signals deleted after
-- debate closes, lower stakes than a public act or a ballot.
--
-- Flags for human review, never auto-blocks: a shared IP (a campus, a
-- library, an office) can legitimately produce many real distinct voters in
-- a short window, and IP geolocation is not accurate enough to treat a
-- mismatch as proof of anything on its own -- only a person with context can
-- tell a coordinated attack from an ordinary shared network. This is a
-- detection/visibility layer, not an access-control layer -- it doesn't
-- replace the verification-tier decision (ARCHITECTURE.md §13 item 9, still
-- open, still needs counsel), it just stops today's "zero defense at all"
-- state while that larger decision is pending.

-- Every occurrence of a watched action, logged regardless of outcome --
-- this is what velocity checking counts against ("how many DISTINCT users
-- shared this context recently"), kept separate from the review queue below
-- so that table stays small and reviewer-shaped instead of growing by one
-- row per second/vote/ballot forever.
CREATE TABLE action_context_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    action_type     TEXT NOT NULL CHECK (action_type IN ('address_verification', 'second', 'call_the_question', 'referendum_ballot')),
    -- Hashed, not raw -- same convention as user_key_events.context_hash and
    -- signed_actions.context_hash already use (hashContext() in signing.ts):
    -- a stable value to GROUP BY for velocity counting without storing a raw
    -- IP address. MODPA data-minimization posture (ARCHITECTURE.md §13 item
    -- 12), not a new one invented for this table.
    context_hash    TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_action_context_log_lookup ON action_context_log (context_hash, action_type, created_at);

-- The actual review queue -- only populated when a velocity or geographic
-- check trips, not one row per action.
CREATE TABLE anomaly_flags (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    action_type     TEXT NOT NULL CHECK (action_type IN ('address_verification', 'second', 'call_the_question', 'referendum_ballot')),
    reason          TEXT NOT NULL CHECK (reason IN ('ip_velocity', 'geo_mismatch')),
    detail          TEXT,                                   -- human-readable specifics for the reviewer, e.g. "5th distinct user from this context in 30 minutes"
    context_hash    TEXT,
    related_id      UUID,                                   -- the seconds/call_the_question_votes/referendum_ballot_tokens row this flag concerns, if applicable
    reviewed_at     TIMESTAMPTZ,
    reviewed_action TEXT CHECK (reviewed_action IN ('dismissed', 'confirmed_ok', 'user_flagged_for_review')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_anomaly_flags_unreviewed ON anomaly_flags (created_at) WHERE reviewed_at IS NULL;
