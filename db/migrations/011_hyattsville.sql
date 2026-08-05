-- City of Hyattsville, MD: Prince George's third municipality modeled (after
-- Bowie, migration 009, and College Park, migration 010). Real officeholders
-- live-verified 2026-08-05 (WebSearch/WebFetch against hyattsville.org's own
-- Mayor & Council page, cross-checked against Streetcar Suburbs News, Patch,
-- and the mayor's own campaign site).
--
-- CAUGHT AND DISCARDED A REAL DISCREPANCY: an initial aggregated search
-- summary claimed the mayor was "William Gardiner, elected 2022" -- WRONG.
-- The city's own official Mayor & Council page, plus three independent news
-- sources (Streetcar Suburbs, Patch, croslinformayor.com), all agree the
-- real mayor is Robert S. Croslin. Trust the primary source over an
-- aggregated summary; do not repeat the Gardiner claim anywhere.
--
-- Government: Mayor + 10 Council Members, TWO per each of 5 Wards, elected
-- to 4-year terms with HALF the council elected every 2 years (elections
-- held the second Tuesday in May of odd years) -- genuine staggering, unlike
-- Bowie/College Park where the current roster happened to come from one
-- election. The current roster is a real mix of two cohorts:
--   2023 cohort (Mayor Croslin, Waszczak/W1, Schaible/W2, Redmond/W3,
--   Lee/W4, Solomon/W5): elected May 2023 (Croslin ran unopposed, 1,341
--   votes/91%), sworn in at a public oath ceremony June 5, 2023.
--   2025 cohort (Barnes/W1, Strab/W2, Dhokai/W3, Haba/W4, Nisbett/W5):
--   elected May 13, 2025, certified May 15, 2025, sworn in at a public oath
--   ceremony June 2, 2025.
-- Each politician's bio below notes their FIRST-elected year where the
-- city's own page gives one (some of these are long-serving incumbents,
-- e.g. Solomon and Haba both first elected 2013) -- term_start in
-- office_terms reflects their CURRENT term only, not first election.
--
-- is_partisan set FALSE by inference, not a directly-confirmed charter
-- citation this pass -- consistent with every other Maryland municipality
-- modeled so far (Rockville, Gaithersburg, Bowie, College Park all
-- nonpartisan) and no evidence of partisan primaries found; worth a firmer
-- citation if this is ever relied on for a partisan-specific feature.
--
-- No accountability_pathways row added: no verified charter recall/removal
-- citation was found for Hyattsville specifically -- same already-honest
-- gap as the other three municipalities.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md/place:hyattsville', 'City of Hyattsville', 'municipal', 'ocd-division/country:us/state:md/county:prince_georges')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('80000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/place:hyattsville', 'Mayor', 'single', 1, 4, FALSE, TRUE, 'municipal'),
  ('80000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/place:hyattsville', 'City Council — Ward 1', 'district', 2, 4, FALSE, TRUE, 'municipal'),
  ('80000000-0000-4000-8000-000000000003', 'ocd-division/country:us/state:md/place:hyattsville', 'City Council — Ward 2', 'district', 2, 4, FALSE, TRUE, 'municipal'),
  ('80000000-0000-4000-8000-000000000004', 'ocd-division/country:us/state:md/place:hyattsville', 'City Council — Ward 3', 'district', 2, 4, FALSE, TRUE, 'municipal'),
  ('80000000-0000-4000-8000-000000000005', 'ocd-division/country:us/state:md/place:hyattsville', 'City Council — Ward 4', 'district', 2, 4, FALSE, TRUE, 'municipal'),
  ('80000000-0000-4000-8000-000000000006', 'ocd-division/country:us/state:md/place:hyattsville', 'City Council — Ward 5', 'district', 2, 4, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('80000000-0000-4000-8000-000000000101', 'Robert S. Croslin', NULL, '80000000-0000-4000-8000-000000000001', 'Mayor of Hyattsville, current term 2023-2027; ran unopposed in May 2023 (1,341 votes, 91%). First elected to the City Council in 2013.'),
  ('80000000-0000-4000-8000-000000000102', 'Joanne Waszczak', NULL, '80000000-0000-4000-8000-000000000002', 'City Council Ward 1 member, current term 2023-2027, first elected 2021.'),
  ('80000000-0000-4000-8000-000000000103', 'Greg Barnes', NULL, '80000000-0000-4000-8000-000000000002', 'City Council Ward 1 member, current term 2025-2029, first elected 2025.'),
  ('80000000-0000-4000-8000-000000000104', 'Danny Schaible', NULL, '80000000-0000-4000-8000-000000000003', 'City Council Ward 2 member, current term 2023-2027, first elected 2019.'),
  ('80000000-0000-4000-8000-000000000105', 'Emily Strab', NULL, '80000000-0000-4000-8000-000000000003', 'City Council Ward 2 member, current term 2025-2029, first elected 2022.'),
  ('80000000-0000-4000-8000-000000000106', 'Kareem Redmond', NULL, '80000000-0000-4000-8000-000000000004', 'City Council Ward 3 member (Council Vice President), current term 2023-2027, first elected 2023.'),
  ('80000000-0000-4000-8000-000000000107', 'Gopi Dhokai', NULL, '80000000-0000-4000-8000-000000000004', 'City Council Ward 3 member, current term 2025-2029, first elected 2025.'),
  ('80000000-0000-4000-8000-000000000108', 'Michelle Lee', NULL, '80000000-0000-4000-8000-000000000005', 'City Council Ward 4 member, current term 2023-2027, first elected 2023.'),
  ('80000000-0000-4000-8000-000000000109', 'Edouard Haba', NULL, '80000000-0000-4000-8000-000000000005', 'City Council Ward 4 member, current term 2025-2029, first elected 2013.'),
  ('80000000-0000-4000-8000-000000000110', 'Joseph Solomon', NULL, '80000000-0000-4000-8000-000000000006', 'City Council Ward 5 member (Council President), current term 2023-2027, first elected 2013.'),
  ('80000000-0000-4000-8000-000000000111', 'Kelson Nisbett', NULL, '80000000-0000-4000-8000-000000000006', 'City Council Ward 5 member, current term 2025-2029, first elected 2025.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('80000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000101', '2023-06-05', 'elected'),
  ('80000000-0000-4000-8000-000000000002', '80000000-0000-4000-8000-000000000102', '2023-06-05', 'elected'),
  ('80000000-0000-4000-8000-000000000002', '80000000-0000-4000-8000-000000000103', '2025-06-02', 'elected'),
  ('80000000-0000-4000-8000-000000000003', '80000000-0000-4000-8000-000000000104', '2023-06-05', 'elected'),
  ('80000000-0000-4000-8000-000000000003', '80000000-0000-4000-8000-000000000105', '2025-06-02', 'elected'),
  ('80000000-0000-4000-8000-000000000004', '80000000-0000-4000-8000-000000000106', '2023-06-05', 'elected'),
  ('80000000-0000-4000-8000-000000000004', '80000000-0000-4000-8000-000000000107', '2025-06-02', 'elected'),
  ('80000000-0000-4000-8000-000000000005', '80000000-0000-4000-8000-000000000108', '2023-06-05', 'elected'),
  ('80000000-0000-4000-8000-000000000005', '80000000-0000-4000-8000-000000000109', '2025-06-02', 'elected'),
  ('80000000-0000-4000-8000-000000000006', '80000000-0000-4000-8000-000000000110', '2023-06-05', 'elected'),
  ('80000000-0000-4000-8000-000000000006', '80000000-0000-4000-8000-000000000111', '2025-06-02', 'elected');
