-- Town of Laytonsville, MD: eighth of Montgomery County's remaining
-- municipalities. Confirmed live against the real Census geocoder (21406
-- Laytonsville Rd, Laytonsville, MD -> Counties layer: Montgomery County
-- 24/031; Incorporated Places layer: "Laytonsville town"). level=
-- 'municipal', parent=Montgomery County's own ocd_id.
--
-- Structure: Mayor (single, at-large) + 4-member Council (at-large),
-- staggered 2-year terms -- Mayor + 2 Council seats elected in ODD years,
-- the other 2 Council seats in EVEN years, all on the first Monday of May
-- (confirmed directly from the Charter for the even-year cohort; applied
-- consistently to the odd-year cohort). Genuinely distinctive timing gap,
-- also directly confirmed from the Charter: "the regular term of an
-- elected officer shall expire on the first Tuesday in July following
-- the election of his/her successor" -- a roughly two-month gap between
-- election and taking office, unlike every other town modeled so far.
-- Real officeholders live-verified 2026-08-11 (WebSearch/WebFetch against
-- laytonsville.md.us): Mayor Charles D. Hendricks + Councilmembers
-- E. Thomas "Tom" Burke III and Amy L. Koval, all from the May 5, 2025
-- cycle (took office July 1, 2025, term to 2027); Councilmembers Charles
-- A. Bradsher and Christina L. Pellegrino (also Vice-President -- an
-- internally-chosen role, bio text only, same treatment as other towns'
-- Vice Mayor/Council President roles) from the May 4, 2026 cycle (took
-- office July 7, 2026, term to 2028).
--
-- ACCOUNTABILITY: genuinely a DIFFERENT mechanism type from most other
-- Montgomery towns modeled so far -- Laytonsville's charter provides
-- COUNCIL-INITIATED removal, not a voter-petition recall: an elected
-- officer may be removed by an affirmative vote of not less than three
-- of the Town's five elected officers (Mayor + 4 Council), after a public
-- hearing and a finding of misfeasance, malfeasance, or nonfeasance --
-- no citizen recall petition mechanism was found. Modeled as
-- 'supermajority_council_removal', same category already used for
-- Prince George's County's and Glenarden's council-only removal
-- provisions.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md/place:laytonsville', 'Town of Laytonsville', 'municipal', 'ocd-division/country:us/state:md/county:montgomery')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('30100000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/place:laytonsville', 'Mayor', 'single', 1, 2, FALSE, TRUE, 'municipal'),
  ('30100000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/place:laytonsville', 'Town Council', 'at_large', 4, 2, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('30100000-0000-4000-8000-000000000101', 'Charles D. Hendricks', NULL, '30100000-0000-4000-8000-000000000001', 'Mayor of Laytonsville, first elected 2023, most recently re-elected May 5, 2025, took office July 1, 2025, term to 2027.'),
  ('30100000-0000-4000-8000-000000000102', 'E. Thomas "Tom" Burke III', NULL, '30100000-0000-4000-8000-000000000002', 'Town Council member, elected May 5, 2025, took office July 1, 2025, term to 2027.'),
  ('30100000-0000-4000-8000-000000000103', 'Amy L. Koval', NULL, '30100000-0000-4000-8000-000000000002', 'Town Council member, elected May 5, 2025, took office July 1, 2025, term to 2027. Council member since 2019.'),
  ('30100000-0000-4000-8000-000000000104', 'Charles A. Bradsher', NULL, '30100000-0000-4000-8000-000000000002', 'Town Council member, elected May 4, 2026, took office July 7, 2026, term to 2028. Council member since 2002.'),
  ('30100000-0000-4000-8000-000000000105', 'Christina L. Pellegrino', NULL, '30100000-0000-4000-8000-000000000002', 'Vice-President -- chosen by fellow Councilmembers. Town Council member, elected May 4, 2026, took office July 7, 2026, term to 2028.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('30100000-0000-4000-8000-000000000001', '30100000-0000-4000-8000-000000000101', '2025-07-01', 'elected'),
  ('30100000-0000-4000-8000-000000000002', '30100000-0000-4000-8000-000000000102', '2025-07-01', 'elected'),
  ('30100000-0000-4000-8000-000000000002', '30100000-0000-4000-8000-000000000103', '2025-07-01', 'elected'),
  ('30100000-0000-4000-8000-000000000002', '30100000-0000-4000-8000-000000000104', '2026-07-07', 'elected'),
  ('30100000-0000-4000-8000-000000000002', '30100000-0000-4000-8000-000000000105', '2026-07-07', 'elected');

-- Council-initiated removal (not a citizen recall) -- Charter of the Town
-- of Laytonsville. office_id is required by the schema's own CHECK
-- constraint (NULL is only valid for charter_amendment_petition rows), so
-- this is scoped per-office like every other accountability_pathways row
-- in this project, covering both the Mayor and Council offices.
INSERT INTO accountability_pathways (jurisdiction_id, office_id, mechanism_type, is_binding, legal_citation, signature_requirement_note, description)
SELECT 'ocd-division/country:us/state:md/place:laytonsville', id, 'supermajority_council_removal', TRUE,
  'Charter of the Town of Laytonsville',
  NULL,
  'An elected officer (Mayor or Councilmember) may be removed by an affirmative vote of not less than three of the Town''s five elected officers, after a public hearing and a finding by a preponderance of the evidence of misfeasance, malfeasance, or nonfeasance in office. No citizen-initiated recall petition mechanism was found for Laytonsville -- removal is Council-only, unlike several other Montgomery towns modeled in this project.'
FROM offices WHERE jurisdiction_id = 'ocd-division/country:us/state:md/place:laytonsville';
