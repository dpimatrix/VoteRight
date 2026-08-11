-- Town of Garrett Park, MD: fifth of Montgomery County's remaining
-- municipalities. Confirmed live against the real Census geocoder (10814
-- Kenilworth Ave, Garrett Park, MD -> Counties layer: Montgomery County
-- 24/031; Incorporated Places layer: "Garrett Park town"). level=
-- 'municipal', parent=Montgomery County's own ocd_id.
--
-- Structure: Mayor (single, at-large) + 5-member Council (at-large),
-- staggered 2-year terms, elections held the first Monday in May
-- (explicitly confirmed by the town's own site, not estimated) -- Mayor +
-- 2 Council seats in even years, 3 Council seats in odd years. Real
-- officeholders live-verified 2026-08-11 (WebSearch/WebFetch against
-- garrettparkmd.gov): Mayor John H. Stroud, elected May 4, 2026 (term to
-- 2028) -- a sitting Councilmember who won the Mayor's race, vacating his
-- own Council seat; Erika V. Selli was then APPOINTED by the remaining
-- Council (per the Charter's own vacancy-filling provision, confirmed by
-- reading the full charter text) to fill that vacated seat, May 2026,
-- serving the remainder of the seat's term to 2027 -- how_obtained=
-- 'appointed', not 'elected', for her specifically. Gerilee W. Bennett and
-- Lisa K. Max were elected outright May 4, 2026 (term to 2028).
-- Christopher D. Deutsch and Philip M. Schulp were elected May 5, 2025
-- (term to 2027).
--
-- ACCOUNTABILITY: NO recall provision -- confirmed as a genuine absence,
-- not just an unconfirmed gap: the full charter text (extracted via
-- pdftotext from the MGA's 2018 charter reprint, 1,361 lines, cleanly
-- parsed) contains zero instances of "recall" anywhere. Vacancies
-- (including Selli's) are filled by Council appointment, not by any
-- citizen-recall mechanism.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md/place:garrett_park', 'Town of Garrett Park', 'municipal', 'ocd-division/country:us/state:md/county:montgomery')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('2d000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/place:garrett_park', 'Mayor', 'single', 1, 2, FALSE, TRUE, 'municipal'),
  ('2d000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/place:garrett_park', 'Town Council', 'at_large', 5, 2, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('2d000000-0000-4000-8000-000000000101', 'John H. Stroud', NULL, '2d000000-0000-4000-8000-000000000001', 'Mayor of Garrett Park, elected May 4, 2026 -- a sitting Councilmember at the time, whose Council seat was then filled by Council appointment.'),
  ('2d000000-0000-4000-8000-000000000102', 'Christopher D. Deutsch', NULL, '2d000000-0000-4000-8000-000000000002', 'Council member, elected May 5, 2025.'),
  ('2d000000-0000-4000-8000-000000000103', 'Philip M. Schulp', NULL, '2d000000-0000-4000-8000-000000000002', 'Council member, elected May 5, 2025.'),
  ('2d000000-0000-4000-8000-000000000104', 'Erika V. Selli', NULL, '2d000000-0000-4000-8000-000000000002', 'Council member, appointed by the Council in May 2026 to fill the vacancy left when Mayor Stroud (a Councilmember at the time) won the Mayor''s race; serves the remainder of that seat''s term to 2027.'),
  ('2d000000-0000-4000-8000-000000000105', 'Gerilee W. Bennett', NULL, '2d000000-0000-4000-8000-000000000002', 'Council member, elected May 4, 2026.'),
  ('2d000000-0000-4000-8000-000000000106', 'Lisa K. Max', NULL, '2d000000-0000-4000-8000-000000000002', 'Council member, elected May 4, 2026.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('2d000000-0000-4000-8000-000000000001', '2d000000-0000-4000-8000-000000000101', '2026-05-04', 'elected'),
  ('2d000000-0000-4000-8000-000000000002', '2d000000-0000-4000-8000-000000000102', '2025-05-05', 'elected'),
  ('2d000000-0000-4000-8000-000000000002', '2d000000-0000-4000-8000-000000000103', '2025-05-05', 'elected'),
  ('2d000000-0000-4000-8000-000000000002', '2d000000-0000-4000-8000-000000000104', '2026-05-04', 'appointed'),
  ('2d000000-0000-4000-8000-000000000002', '2d000000-0000-4000-8000-000000000105', '2026-05-04', 'elected'),
  ('2d000000-0000-4000-8000-000000000002', '2d000000-0000-4000-8000-000000000106', '2026-05-04', 'elected');
