-- Town of Glen Echo, MD: seventh of Montgomery County's remaining
-- municipalities. Confirmed live against the real Census geocoder (6106
-- Harvard Ave, Glen Echo, MD -> Counties layer: Montgomery County 24/031;
-- Incorporated Places layer: "Glen Echo town"). level='municipal',
-- parent=Montgomery County's own ocd_id.
--
-- Structure: Mayor (single, at-large) + 4-member Council (at-large),
-- staggered 4-YEAR terms (2 seats/Mayor one cycle, 2 seats the other),
-- elections in May. Real officeholders live-verified 2026-08-11
-- (WebSearch/WebFetch against glenecho.gov): Mayor Dia C. Costello +
-- returning Councilmembers Matthew R. "Matt" Stiglitz and Daniel E.
-- Spealman, all elected/re-elected May 5, 2025 (term to 2029);
-- Councilmembers Julia A. Wilson and Kellan Steele, elected May 1, 2023
-- (term to 2027). CAUGHT A STALE-SOURCE DISCREPANCY: an older cached
-- Maryland Manual snapshot named "Dawn E. Tanner" for one of the
-- 2027-expiring seats -- the town's own current site (glenecho.gov/
-- contact/) confirms "Kellan Steele" is the actual current holder;
-- trusted the town's own live page over the stale manual cache.
--
-- ACCOUNTABILITY: a real, binding citizen recall -- Charter Section 516,
-- extracted via pdftotext from the MGA's charter PDF: 25% petition
-- threshold (grounds required: failure to uphold the oath of office, or
-- malfeasance/misfeasance/nonfeasance), but genuinely distinctive from
-- every other recall provision modeled in this project so far -- removal
-- requires a TWO-THIRDS supermajority "remove" vote, not a simple
-- majority.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md/place:glen_echo', 'Town of Glen Echo', 'municipal', 'ocd-division/country:us/state:md/county:montgomery')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('2f000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/place:glen_echo', 'Mayor', 'single', 1, 4, FALSE, TRUE, 'municipal'),
  ('2f000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/place:glen_echo', 'Town Council', 'at_large', 4, 4, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('2f000000-0000-4000-8000-000000000101', 'Dia C. Costello', NULL, '2f000000-0000-4000-8000-000000000001', 'Mayor of Glen Echo, elected May 5, 2025, term to 2029.'),
  ('2f000000-0000-4000-8000-000000000102', 'Julia A. Wilson', NULL, '2f000000-0000-4000-8000-000000000002', 'Town Council member, elected May 1, 2023, term to 2027.'),
  ('2f000000-0000-4000-8000-000000000103', 'Kellan Steele', NULL, '2f000000-0000-4000-8000-000000000002', 'Town Council member, elected May 1, 2023, term to 2027.'),
  ('2f000000-0000-4000-8000-000000000104', 'Matthew R. "Matt" Stiglitz', NULL, '2f000000-0000-4000-8000-000000000002', 'Town Council member, re-elected May 5, 2025, term to 2029.'),
  ('2f000000-0000-4000-8000-000000000105', 'Daniel E. Spealman', NULL, '2f000000-0000-4000-8000-000000000002', 'Town Council member, re-elected May 5, 2025, term to 2029.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('2f000000-0000-4000-8000-000000000001', '2f000000-0000-4000-8000-000000000101', '2025-05-05', 'elected'),
  ('2f000000-0000-4000-8000-000000000002', '2f000000-0000-4000-8000-000000000102', '2023-05-01', 'elected'),
  ('2f000000-0000-4000-8000-000000000002', '2f000000-0000-4000-8000-000000000103', '2023-05-01', 'elected'),
  ('2f000000-0000-4000-8000-000000000002', '2f000000-0000-4000-8000-000000000104', '2025-05-05', 'elected'),
  ('2f000000-0000-4000-8000-000000000002', '2f000000-0000-4000-8000-000000000105', '2025-05-05', 'elected');

-- Real, binding citizen recall -- Charter § 516. Two-thirds supermajority
-- required to remove, genuinely different from most other jurisdictions'
-- simple-majority recalls modeled in this project.
INSERT INTO accountability_pathways (jurisdiction_id, office_id, mechanism_type, is_binding, legal_citation, signature_requirement_note, description)
SELECT 'ocd-division/country:us/state:md/place:glen_echo', id, 'municipal_recall', TRUE,
  'Charter of the Town of Glen Echo § 516',
  '25% of qualified voters',
  'Grounds required: failure to uphold the oath of office, or malfeasance, misfeasance, or nonfeasance in office -- general policy disagreement alone does not qualify. If certified, a special election is held within 45 days; the ballot asks "reaffirm" or "remove," and a TWO-THIRDS supermajority of those voting must choose "remove" for the official to be removed -- a higher bar than most other recall provisions modeled in this project, which require only a simple majority.'
FROM offices WHERE jurisdiction_id = 'ocd-division/country:us/state:md/place:glen_echo';
