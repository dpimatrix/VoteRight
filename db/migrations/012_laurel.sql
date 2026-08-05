-- City of Laurel, MD: Prince George's fourth municipality modeled (after
-- Bowie #009, College Park #010, Hyattsville #011). Real officeholders
-- live-verified 2026-08-05 (WebSearch/WebFetch against cityoflaurel.org's
-- own official election-results pages, cross-checked against WJLA, FOX 5 DC,
-- and the Maryland Manual).
--
-- Government: Mayor (4-year term) + 5 Council seats: 2 from Ward 1, 2 from
-- Ward 2, 1 At-Large (2-year terms). Charter language found in one search
-- ("all five Councilmembers" elected together every 2 years) appears to be
-- EITHER stale/pre-amendment text or an imprecise summary -- it directly
-- contradicts the city's own dated, primary official-results pages, which
-- unambiguously label each 2025 ward race as "(1 seat)", not 2. The primary
-- election-results pages are trusted here over the ambiguous charter
-- snippet.
--
-- HONEST GAP, same pattern as the Board of Education District 2/4 rows in
-- seed.roster-2026-full-scope.sql ("exist as offices... current holders not
-- yet researched"): Ward 1 and Ward 2 each structurally have 2 seats
-- (seat_count=2 below, confirmed by both the 2023 4-candidate/2-seat races
-- and the charter's own "two councilmembers elected from each...ward"
-- language), but only ONE current holder per ward could be confirmed this
-- pass. Nov 2025's official results show each ward race was for exactly
-- one seat (Simmons beat incumbent Kole in Ward 1; Clark beat Mills in
-- Ward 2) -- meaning the OTHER seat in each ward (last filled alongside
-- Kole/Mills' original 2023 wins, per a 4-candidate/2-seat race that year)
-- has a term that didn't come up in this cycle, and its current holder
-- could not be independently confirmed (plausibly Ward 1's DeWalt, a 2023
-- co-winner with Kole, but not verified -- NOT fabricated here). Revisit in
-- a future pass, same as the BOE gap.
--
-- Mayor Sydnor made history as Laurel's first Black mayor (elected Nov 7,
-- 2023, sworn in Nov 27, 2023) after three prior terms as a Ward
-- councilmember (first elected 2017).
--
-- Confirmed current-term term_start dates: Mayor Sydnor's sworn-in date is
-- directly reported (Nov 27, 2023). The three 2025 winners' term_start uses
-- the city charter's own stated rule -- "two years from the fourth Monday
-- in November after the election" -- applied to the Nov 4, 2025 election:
-- the fourth Monday in November 2025 is Nov 24, 2025.
--
-- is_partisan set FALSE by inference (consistent with every MD municipality
-- modeled so far), not a directly-confirmed charter citation this pass.
--
-- No accountability_pathways row added: no verified charter recall/removal
-- citation was found for Laurel specifically -- same already-honest gap as
-- the other three municipalities.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md/place:laurel', 'City of Laurel', 'municipal', 'ocd-division/country:us/state:md/county:prince_georges')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('90000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/place:laurel', 'Mayor', 'single', 1, 4, FALSE, TRUE, 'municipal'),
  ('90000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/place:laurel', 'City Council — At-Large', 'at_large', 1, 2, FALSE, TRUE, 'municipal'),
  ('90000000-0000-4000-8000-000000000003', 'ocd-division/country:us/state:md/place:laurel', 'City Council — Ward 1', 'district', 2, 2, FALSE, TRUE, 'municipal'),
  ('90000000-0000-4000-8000-000000000004', 'ocd-division/country:us/state:md/place:laurel', 'City Council — Ward 2', 'district', 2, 2, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('90000000-0000-4000-8000-000000000101', 'Keith R. Sydnor', NULL, '90000000-0000-4000-8000-000000000001', 'Mayor of Laurel; elected Nov 7, 2023 as the city''s first Black mayor, defeating four other candidates. Previously a Ward councilmember for three terms (first elected 2017).'),
  ('90000000-0000-4000-8000-000000000102', 'Brencis D. Smith', NULL, '90000000-0000-4000-8000-000000000002', 'City Council At-Large member (Council President); won the Nov 4, 2025 at-large seat after a mandatory recount, defeating incumbent Christine M. Johnson.'),
  ('90000000-0000-4000-8000-000000000103', 'Adrian G. Simmons', NULL, '90000000-0000-4000-8000-000000000003', 'City Council Ward 1 member (President Pro Tem); won one Ward 1 seat Nov 4, 2025, defeating incumbent James Kole. The second Ward 1 seat''s current holder could not be confirmed this pass -- honest gap, not fabricated.'),
  ('90000000-0000-4000-8000-000000000104', 'Kyla M. Clark', NULL, '90000000-0000-4000-8000-000000000004', 'City Council Ward 2 member; re-elected to one Ward 2 seat Nov 4, 2025, defeating Jeffrey W. Mills. First elected 2023. The second Ward 2 seat''s current holder could not be confirmed this pass -- honest gap, not fabricated.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('90000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000101', '2023-11-27', 'elected'),
  ('90000000-0000-4000-8000-000000000002', '90000000-0000-4000-8000-000000000102', '2025-11-24', 'elected'),
  ('90000000-0000-4000-8000-000000000003', '90000000-0000-4000-8000-000000000103', '2025-11-24', 'elected'),
  ('90000000-0000-4000-8000-000000000004', '90000000-0000-4000-8000-000000000104', '2025-11-24', 'elected');
