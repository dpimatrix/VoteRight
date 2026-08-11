-- Town of Barnesville, MD: ninth of Montgomery County's remaining
-- municipalities, and the smallest yet -- only 3 elected officials total.
-- Confirmed live against the real Census geocoder (18001 Barnesville Rd,
-- Barnesville, MD -> Counties layer: Montgomery County 24/031;
-- Incorporated Places layer: "Barnesville town"). level='municipal',
-- parent=Montgomery County's own ocd_id.
--
-- Structure: 3 Town Commissioners (at-large), ALL elected together every
-- 2 years (first Monday of May, ODD-numbered years only -- confirmed
-- directly from the Charter, so no staggering is possible: the town's
-- only election cycle IS every seat at once). The Commissioners then
-- choose one of their own as "President of the Commission" (informally
-- called Mayor) -- same dual-office-row internal-selection pattern as
-- Poolesville. Real officeholders live-verified 2026-08-11 (WebSearch/
-- WebFetch against barnesvillemd.org): President Michael Zuckerman
-- (Commissioner continuously since 2021, re-elected each cycle) +
-- Commissioners Michael Ortiz and Alex Trouteaud, all from the May 5,
-- 2025 election (term to 2027).
--
-- ACCOUNTABILITY: NO recall provision -- confirmed as a genuine absence
-- (the town's own Town Charter page was read directly and states
-- vacancies are filled only "by an election held after ten days notice,"
-- Charter §74-4 -- no citizen-recall mechanism exists). Distinctive even
-- from Garrett Park's similar "no recall" finding: Barnesville fills a
-- vacancy with a NEW SPECIAL ELECTION, not by remaining-member
-- appointment.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md/place:barnesville', 'Town of Barnesville', 'municipal', 'ocd-division/country:us/state:md/county:montgomery')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('30200000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/place:barnesville', 'President', 'single', 1, 2, FALSE, FALSE, 'municipal'),
  ('30200000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/place:barnesville', 'Town Commission', 'at_large', 3, 2, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('30200000-0000-4000-8000-000000000101', 'Michael S. Zuckerman', NULL, '30200000-0000-4000-8000-000000000001', 'President of the Commission (informally Mayor) -- chosen by fellow Commissioners. Commissioner continuously since 2021, most recently re-elected May 5, 2025.'),
  ('30200000-0000-4000-8000-000000000102', 'Michael J. Ortiz', NULL, '30200000-0000-4000-8000-000000000002', 'Commissioner, elected May 5, 2025.'),
  ('30200000-0000-4000-8000-000000000103', 'Alexander R. Trouteaud', NULL, '30200000-0000-4000-8000-000000000002', 'Commissioner, elected May 5, 2025.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('30200000-0000-4000-8000-000000000002', '30200000-0000-4000-8000-000000000101', '2025-05-05', 'elected'),
  ('30200000-0000-4000-8000-000000000001', '30200000-0000-4000-8000-000000000101', '2025-05-05', 'appointed'),
  ('30200000-0000-4000-8000-000000000002', '30200000-0000-4000-8000-000000000102', '2025-05-05', 'elected'),
  ('30200000-0000-4000-8000-000000000002', '30200000-0000-4000-8000-000000000103', '2025-05-05', 'elected');
