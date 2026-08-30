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

-- Best-effort backfill for existing rows: a user's CURRENT residence at
-- migration time, which is accurate for anyone who hasn't re-verified
-- elsewhere since their (possibly only) address_attestation -- the common
-- case by far. Inherently approximate for anyone who verified more than
-- once before this migration ever ran (we have no record of what jurisdiction
-- an OLD attestation was actually for) -- every verification going forward
-- captures it directly at the time, so the data self-heals from here.
UPDATE verification_records vr
   SET jurisdiction_id = u.residence_jurisdiction_id
  FROM users u
 WHERE vr.user_id = u.id AND vr.method = 'address_attestation' AND vr.jurisdiction_id IS NULL;
