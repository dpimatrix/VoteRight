-- Identity recovery via signing-key backup (2026-08-19). Owner asked
-- directly: "Is it possible to restore the thread to the person and still
-- maintain anonymity?" -- yes, using infrastructure that already existed
-- (the passphrase-encrypted key backup/restore in KeySettings.tsx), just
-- never wired to actually re-associate the recovered identity's user_id.
-- See app/src/lib/signing.ts's ownerOfValidKey() and
-- app/api/keys/recover/route.ts for the mechanism.
--
-- New event value, distinct from a plain 'registered', so the audit trail
-- on the RECOVERED identity's own key history honestly records "this key
-- was used to restore access from a new session" rather than looking like
-- an ordinary re-registration.
ALTER TABLE user_key_events DROP CONSTRAINT user_key_events_event_check;
ALTER TABLE user_key_events ADD CONSTRAINT user_key_events_event_check
    CHECK (event IN ('registered', 'rotated', 'revoked', 'used_from_new_context', 'recovered'));
