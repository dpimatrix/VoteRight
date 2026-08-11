-- Town of Herndon, VA: second of three incorporated VA towns still inside
-- Fairfax County (see Vienna #039 for the independent-city-vs-town
-- distinction). Confirmed live against the real Census geocoder (765 Lynn
-- St, Herndon, VA -> Counties layer resolves to Fairfax County 51/059;
-- Incorporated Places layer separately returns "Herndon town").
-- level='municipal', parent=Fairfax County's own ocd_id.
--
-- Structure: Mayor (single, at-large) + 6-member Town Council (at-large),
-- both elected together on the same ballot every 2 years (same
-- now-synchronized pattern as Vienna), nonpartisan. Real officeholders
-- live-verified 2026-08-11 (WebSearch against FFXnow's live election-night
-- coverage and the town's own Jan 7, 2025 swearing-in announcement): Mayor
-- Keven J. LeBlanc Jr., elected Nov 5, 2024 (defeating fellow
-- Councilmember Pradip Dhakal), + Councilmembers Naila Alam, Cesar del
-- Aguila, Kelvin Garcia, Clark Hedrick (also chosen Vice Mayor by the
-- Council -- not modeled as a separate office, same convention as
-- Alexandria/Vienna), Michael T. Lloyd, and Alex Reyes -- all sworn in
-- Jan 7, 2025 for the "2025-2026" council term. Party affiliation not
-- confirmed for any of the 7 in this pass (nonpartisan ballot) -- left
-- NULL rather than guessed.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:va/place:herndon', 'Town of Herndon', 'municipal', 'ocd-division/country:us/state:va/county:fairfax')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('27000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:va/place:herndon', 'Mayor', 'single', 1, 2, FALSE, TRUE, 'municipal'),
  ('27000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:va/place:herndon', 'Town Council', 'at_large', 6, 2, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('27000000-0000-4000-8000-000000000101', 'Keven J. LeBlanc Jr.', NULL, '27000000-0000-4000-8000-000000000001', 'Mayor of Herndon, elected Nov 5, 2024, defeating fellow Councilmember Pradip Dhakal.'),
  ('27000000-0000-4000-8000-000000000102', 'Naila Alam', NULL, '27000000-0000-4000-8000-000000000002', 'Town Council member, elected Nov 5, 2024.'),
  ('27000000-0000-4000-8000-000000000103', 'Cesar del Aguila', NULL, '27000000-0000-4000-8000-000000000002', 'Town Council member, elected Nov 5, 2024.'),
  ('27000000-0000-4000-8000-000000000104', 'Kelvin Garcia', NULL, '27000000-0000-4000-8000-000000000002', 'Town Council member, elected Nov 5, 2024.'),
  ('27000000-0000-4000-8000-000000000105', 'Clark Hedrick', NULL, '27000000-0000-4000-8000-000000000002', 'Vice Mayor -- chosen by fellow Councilmembers. Town Council member, elected Nov 5, 2024.'),
  ('27000000-0000-4000-8000-000000000106', 'Michael T. Lloyd', NULL, '27000000-0000-4000-8000-000000000002', 'Town Council member, elected Nov 5, 2024.'),
  ('27000000-0000-4000-8000-000000000107', 'Alex Reyes', NULL, '27000000-0000-4000-8000-000000000002', 'Town Council member, elected Nov 5, 2024.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('27000000-0000-4000-8000-000000000001', '27000000-0000-4000-8000-000000000101', '2025-01-07', 'elected'),
  ('27000000-0000-4000-8000-000000000002', '27000000-0000-4000-8000-000000000102', '2025-01-07', 'elected'),
  ('27000000-0000-4000-8000-000000000002', '27000000-0000-4000-8000-000000000103', '2025-01-07', 'elected'),
  ('27000000-0000-4000-8000-000000000002', '27000000-0000-4000-8000-000000000104', '2025-01-07', 'elected'),
  ('27000000-0000-4000-8000-000000000002', '27000000-0000-4000-8000-000000000105', '2025-01-07', 'elected'),
  ('27000000-0000-4000-8000-000000000002', '27000000-0000-4000-8000-000000000106', '2025-01-07', 'elected'),
  ('27000000-0000-4000-8000-000000000002', '27000000-0000-4000-8000-000000000107', '2025-01-07', 'elected');

-- Same Virginia judicial-removal statute used throughout this project.
INSERT INTO accountability_pathways (jurisdiction_id, office_id, mechanism_type, is_binding, legal_citation, signature_requirement_note, description)
SELECT 'ocd-division/country:us/state:va/place:herndon', id, 'municipal_recall', TRUE,
  'Va. Code Ann. § 24.2-230 et seq. (Removal of Public Officers from Office), esp. § 24.2-233',
  '10% of the votes cast in the officer''s last election',
  'Not a ballot-box recall: registered voters petition the Circuit Court for removal on specific statutory grounds (neglect of duty, misuse of office, or certain criminal convictions). A judge, not the electorate, decides whether to remove the officer.'
FROM offices WHERE jurisdiction_id = 'ocd-division/country:us/state:va/place:herndon';
