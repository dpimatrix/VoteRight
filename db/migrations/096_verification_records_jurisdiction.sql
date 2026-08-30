-- Real eligibility-gaming gap found live 2026-08-29 (code review of the
-- voter-facing referendum ballot system). issueBallot()'s "residency
-- established before the referendum opened" anti-gaming check (added to
-- stop last-minute address-switching to swing an already-open vote) only
-- verified that the user had EVER completed ANY address_attestation before
-- opens_at -- not that the SPECIFIC jurisdiction they attested at that time
-- was the one that actually makes them eligible. verification_records
-- carried no jurisdiction of its own, so there was nothing else to check
-- against.
--
-- Concretely: verify in Jurisdiction X on day 1, wait for Referendum R to
-- open in Jurisdiction Y on day 30, re-verify into Y on day 31 (no rate
-- limit on re-verifying), vote in R, then switch back to X -- the day-1
-- attestation satisfied "some address_attestation before opens_at" even
-- though it had nothing to do with Y. This column is what closes it:
-- issueBallot's query (app/src/lib/referenda.ts) now walks UP from each
-- pre-opens_at verification record's OWN attested jurisdiction, not from
-- the user's CURRENT residence, when checking the anti-gaming condition.
ALTER TABLE verification_records ADD COLUMN jurisdiction_id TEXT REFERENCES jurisdictions(ocd_id);

-- Best-effort backfill: ONLY each user's single MOST RECENT
-- address_attestation row gets their current residence -- that one row is
-- genuinely accurate, since residence_jurisdiction_id always follows the
-- latest verification by construction (see verifyAddress in
-- app/src/lib/debates.ts). Real gap caught before this ever shipped
-- (2026-08-30 self-review): an earlier version of this backfill stamped
-- EVERY pre-migration row -- including OLDER ones for a jurisdiction the
-- user has since moved away from -- with their current residence, which
-- would have silently re-opened the exact gaming gap this migration exists
-- to close for anyone who had already jurisdiction-hopped before this
-- migration ran: their old, actually-different-jurisdiction attestation
-- would misrepresent itself as an early legitimate residency in wherever
-- they live NOW. Older rows are deliberately left NULL (unknown) rather
-- than guessed -- a NULL jurisdiction_id can never satisfy issueBallot's
-- anti-gaming join, which is the safe direction to fail in for an
-- eligibility check: at worst it under-credits a legitimate old
-- attestation, never over-credits an illegitimate one. Every verification
-- going forward captures its own jurisdiction directly at the time, so the
-- data self-heals from here regardless.
UPDATE verification_records vr
   SET jurisdiction_id = u.residence_jurisdiction_id
  FROM users u
 WHERE vr.user_id = u.id
   AND vr.method = 'address_attestation'
   AND vr.jurisdiction_id IS NULL
   AND vr.id = (
     SELECT vr2.id FROM verification_records vr2
      WHERE vr2.user_id = vr.user_id AND vr2.method = 'address_attestation'
      ORDER BY vr2.verified_at DESC LIMIT 1
   );
