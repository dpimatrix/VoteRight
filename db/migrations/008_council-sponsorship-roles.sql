-- Widen council_sponsorships.role for Virginia's Boards of Supervisors:
-- Fairfax and Arlington operate on staff-prepared agenda items with a
-- "moved/seconded" parliamentary convention, not Maryland's bill-sponsorship
-- convention ('lead_sponsor'/'co_sponsor'). Overloading the existing values
-- to mean "moved/seconded" would blur two genuinely different facts, so this
-- adds two new, distinct role values instead of repurposing the old ones.
ALTER TABLE council_sponsorships DROP CONSTRAINT council_sponsorships_role_check;
ALTER TABLE council_sponsorships ADD CONSTRAINT council_sponsorships_role_check
  CHECK (role IN ('lead_sponsor', 'co_sponsor', 'mover', 'seconder'));
