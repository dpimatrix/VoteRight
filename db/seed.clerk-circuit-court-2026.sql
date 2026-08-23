-- Montgomery County, MD -- Clerk of the Circuit Court, 2026 general election.
-- Real gap found live testing (2026-08-23): this office was part of the
-- original D1 "full county scope" pass's row-office list in principle
-- (same category as Sheriff/State's Attorney/Register of Wills, already
-- tracked) but never actually got a `races` row -- a genuine oversight,
-- not one of the documented staggered-term gaps (Board of Education
-- Districts 2/4, which correctly have no 2026 race at all).
--
-- Sourced and cross-verified from two independent sources, not guessed:
--   1. Maryland State Board of Elections, official primary results --
--      https://elections.maryland.gov/elections/2026/primary_results/gen_results_2026_by_county_16.html
--      Democratic primary: Karen Bushell, unopposed, 111,381 votes (100%).
--      No Republican or other-party section exists for this office on that
--      page -- no other party fielded a candidate.
--   2. Bethesda Magazine (independent local news), confirming: "Karen
--      Bushell is unopposed in her run for re-election as clerk of the
--      Montgomery County Circuit Court" -- 2026-06-24 reporting on the
--      same primary.
-- Conclusion: Karen A. Bushell (D) is the sole candidate for the November
-- 2026 general election, running unopposed. She is also the sitting
-- incumbent (politicians.current_office_id already points at this office
-- from the existing roster ingestion) -- race_incumbents reflects that.

INSERT INTO races (election_cycle_id, office_id, seats_elected)
SELECT
  (SELECT id FROM election_cycles WHERE name = '2026 Maryland General'),
  (SELECT id FROM offices WHERE title = 'Clerk of the Circuit Court'
     AND jurisdiction_id = (SELECT ocd_id FROM jurisdictions WHERE name = 'Montgomery County' AND level = 'county')),
  1
WHERE NOT EXISTS (
  SELECT 1 FROM races WHERE office_id = (
    SELECT id FROM offices WHERE title = 'Clerk of the Circuit Court'
      AND jurisdiction_id = (SELECT ocd_id FROM jurisdictions WHERE name = 'Montgomery County' AND level = 'county')
  )
)
RETURNING id;

INSERT INTO candidacies (politician_id, race_id, party, status)
SELECT
  p.id,
  r.id,
  'D',
  'active'
FROM politicians p, races r
JOIN offices o ON o.id = r.office_id
WHERE p.full_name = 'Karen A. Bushell'
  AND o.title = 'Clerk of the Circuit Court'
  AND o.jurisdiction_id = (SELECT ocd_id FROM jurisdictions WHERE name = 'Montgomery County' AND level = 'county')
ON CONFLICT (politician_id, race_id) DO NOTHING;

INSERT INTO race_incumbents (race_id, politician_id)
SELECT r.id, p.id
FROM politicians p, races r
JOIN offices o ON o.id = r.office_id
WHERE p.full_name = 'Karen A. Bushell'
  AND o.title = 'Clerk of the Circuit Court'
  AND o.jurisdiction_id = (SELECT ocd_id FROM jurisdictions WHERE name = 'Montgomery County' AND level = 'county')
ON CONFLICT DO NOTHING;
