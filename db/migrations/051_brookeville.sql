-- Town of Brookeville, MD: tenth of Montgomery County's remaining
-- municipalities. Confirmed live against the real Census geocoder (5 High
-- St, Brookeville, MD -> Counties layer: Montgomery County 24/031;
-- Incorporated Places layer: "Brookeville town"). level='municipal',
-- parent=Montgomery County's own ocd_id.
--
-- Structure, same 3-commissioner "no mayor" shape as Barnesville/
-- Poolesville: 3 Commissioners, at-large, 2-year terms, but staggered
-- 2-1 across TWO consecutive years (2 seats one year, 1 seat the next),
-- with an election held every single year (Second Tuesday in May) as a
-- result -- confirmed directly from the town's own site. Commissioners
-- choose one of their own as "President of the Commission" (no separate
-- Mayor office). Real officeholders live-verified 2026-08-11 (WebSearch/
-- WebFetch against townofbrookevillemd.org): President Dan Ennis,
-- elected May 12, 2026 (term to 2028); Nick Roy and Dan Donnelly, elected
-- May 13, 2025 (term to 2027, the "2 seats" year of the cycle).
--
-- ACCOUNTABILITY: NO recall provision -- confirmed as a genuine absence
-- via the full charter text (extracted via pdftotext, 815 lines, cleanly
-- parsed, zero instances of "recall"), same pattern as Garrett Park.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md/place:brookeville', 'Town of Brookeville', 'municipal', 'ocd-division/country:us/state:md/county:montgomery')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('30300000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/place:brookeville', 'President', 'single', 1, 2, FALSE, FALSE, 'municipal'),
  ('30300000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/place:brookeville', 'Town Commission', 'at_large', 3, 2, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('30300000-0000-4000-8000-000000000101', 'Dan Ennis', NULL, '30300000-0000-4000-8000-000000000001', 'President of the Commission -- chosen by fellow Commissioners. Commissioner, re-elected May 12, 2026, term to 2028.'),
  ('30300000-0000-4000-8000-000000000102', 'Nick Roy', NULL, '30300000-0000-4000-8000-000000000002', 'Commissioner, elected May 13, 2025, term to 2027.'),
  ('30300000-0000-4000-8000-000000000103', 'Dan Donnelly', NULL, '30300000-0000-4000-8000-000000000002', 'Commissioner, elected May 13, 2025, term to 2027.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('30300000-0000-4000-8000-000000000002', '30300000-0000-4000-8000-000000000101', '2026-05-12', 'elected'),
  ('30300000-0000-4000-8000-000000000001', '30300000-0000-4000-8000-000000000101', '2026-05-12', 'appointed'),
  ('30300000-0000-4000-8000-000000000002', '30300000-0000-4000-8000-000000000102', '2025-05-13', 'elected'),
  ('30300000-0000-4000-8000-000000000002', '30300000-0000-4000-8000-000000000103', '2025-05-13', 'elected');
