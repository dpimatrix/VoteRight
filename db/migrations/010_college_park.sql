-- City of College Park, MD: Prince George's County's second-largest
-- municipality (2 of 27 in the county now modeled, following Bowie in
-- migration 009). Real officeholders live-verified 2026-08-05
-- (WebSearch/WebFetch against collegeparkmd.gov's own Mayor & Council /
-- staff-directory pages, cross-checked against dbknews.com's Nov 2025
-- election coverage and CAIR's press release on Mayor Kabir).
--
-- Government: Mayor (elected at-large) + 8 District Councilmembers, TWO
-- per each of 4 districts, nonpartisan, 4-year terms. The city charter
-- allows staggered terms, but the entire current roster -- Mayor and all
-- 8 councilmembers -- comes from the SAME November 4, 2025 general
-- election, inaugurated together Tuesday, December 2, 2025 (confirmed via
-- the city's own election-results announcement, not assumed from the
-- "staggered" charter language alone).
--
-- Mayor Kabir's own history is real and a little more layered than a
-- single election: first won a May 2023 SPECIAL election (sworn in
-- May 16, 2023) to fill a mayoral vacancy, ran unopposed for a full term
-- Nov 2023, then won re-election Nov 4, 2025 -- it's the 2025 win/Dec 2
-- 2025 inauguration that is his CURRENT term_start below, not the earlier
-- special election.
--
-- No accountability_pathways row added: no verified charter recall/removal
-- citation was found for College Park specifically -- same already-honest
-- gap that exists for Rockville, Gaithersburg, and Bowie today, not
-- fabricated here.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md/place:college_park', 'City of College Park', 'municipal', 'ocd-division/country:us/state:md/county:prince_georges')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('70000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/place:college_park', 'Mayor', 'single', 1, 4, FALSE, TRUE, 'municipal'),
  ('70000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/place:college_park', 'City Council — District 1', 'district', 2, 4, FALSE, TRUE, 'municipal'),
  ('70000000-0000-4000-8000-000000000003', 'ocd-division/country:us/state:md/place:college_park', 'City Council — District 2', 'district', 2, 4, FALSE, TRUE, 'municipal'),
  ('70000000-0000-4000-8000-000000000004', 'ocd-division/country:us/state:md/place:college_park', 'City Council — District 3', 'district', 2, 4, FALSE, TRUE, 'municipal'),
  ('70000000-0000-4000-8000-000000000005', 'ocd-division/country:us/state:md/place:college_park', 'City Council — District 4', 'district', 2, 4, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('70000000-0000-4000-8000-000000000101', 'S.M. Fazlul Kabir', NULL, '70000000-0000-4000-8000-000000000001', 'Mayor of College Park; re-elected Nov 4, 2025. First won the office in a May 2023 special election (sworn in May 16, 2023) after serving on the City Council since 2011 -- Maryland''s first Muslim mayor.'),
  ('70000000-0000-4000-8000-000000000102', 'Jacob T. Hernandez', NULL, '70000000-0000-4000-8000-000000000002', 'City Council District 1 member, elected Nov 4, 2025.'),
  ('70000000-0000-4000-8000-000000000103', 'Alan Y. Hew', NULL, '70000000-0000-4000-8000-000000000002', 'City Council District 1 member, elected Nov 4, 2025.'),
  ('70000000-0000-4000-8000-000000000104', 'Holly Simmons', NULL, '70000000-0000-4000-8000-000000000003', 'City Council District 2 member, elected Nov 4, 2025.'),
  ('70000000-0000-4000-8000-000000000105', 'Kelly Jordan', NULL, '70000000-0000-4000-8000-000000000003', 'City Council District 2 member, elected Nov 4, 2025.'),
  ('70000000-0000-4000-8000-000000000106', 'Daniel Oates', NULL, '70000000-0000-4000-8000-000000000004', 'City Council District 3 member, elected Nov 4, 2025.'),
  ('70000000-0000-4000-8000-000000000107', 'Ray Ranker', NULL, '70000000-0000-4000-8000-000000000004', 'City Council District 3 member, elected Nov 4, 2025.'),
  ('70000000-0000-4000-8000-000000000108', 'Maria E. Mackie', NULL, '70000000-0000-4000-8000-000000000005', 'City Council District 4 member (Mayor Pro Tem), elected Nov 4, 2025.'),
  ('70000000-0000-4000-8000-000000000109', 'Denise Mitchell', NULL, '70000000-0000-4000-8000-000000000005', 'City Council District 4 member, elected Nov 4, 2025.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('70000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000101', '2025-12-02', 'elected'),
  ('70000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000102', '2025-12-02', 'elected'),
  ('70000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000103', '2025-12-02', 'elected'),
  ('70000000-0000-4000-8000-000000000003', '70000000-0000-4000-8000-000000000104', '2025-12-02', 'elected'),
  ('70000000-0000-4000-8000-000000000003', '70000000-0000-4000-8000-000000000105', '2025-12-02', 'elected'),
  ('70000000-0000-4000-8000-000000000004', '70000000-0000-4000-8000-000000000106', '2025-12-02', 'elected'),
  ('70000000-0000-4000-8000-000000000004', '70000000-0000-4000-8000-000000000107', '2025-12-02', 'elected'),
  ('70000000-0000-4000-8000-000000000005', '70000000-0000-4000-8000-000000000108', '2025-12-02', 'elected'),
  ('70000000-0000-4000-8000-000000000005', '70000000-0000-4000-8000-000000000109', '2025-12-02', 'elected');
