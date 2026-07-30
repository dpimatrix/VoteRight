-- Anomaly detection for signing-key misuse (ARCHITECTURE.md Section 10):
-- 'used_from_new_context' marks the first time a key signs from a context
-- (hashed IP+User-Agent) not seen before for that key - surfaced as an in-app
-- "was this you?" banner. acknowledged_at lets the owner dismiss it.
ALTER TABLE user_key_events DROP CONSTRAINT user_key_events_event_check;
ALTER TABLE user_key_events ADD CONSTRAINT user_key_events_event_check
  CHECK (event IN ('registered', 'rotated', 'revoked', 'used_from_new_context'));
ALTER TABLE user_key_events ADD COLUMN acknowledged_at TIMESTAMPTZ;
