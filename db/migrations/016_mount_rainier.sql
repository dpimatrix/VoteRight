-- City of Mount Rainier, MD: another Prince George's municipality modeled to
-- help close the "unmodeled municipalities" gap (after Bowie #009, College
-- Park #010, Hyattsville #011, Laurel #012). Real officeholders
-- live-verified 2026-08-05 (WebSearch/WebFetch against mountrainiermd.org's
-- own Mayor & City Council and City Council pages, cross-checked against
-- Wikipedia, Ballotpedia, the Maryland Manual's Mount Rainier Mayors list,
-- the city's own May 5, 2025 official election-results spreadsheet
-- (mountrainiermd.org/DocumentCenter/View/1665/Election-Unofficial-Results),
-- and the city's own election-night / swearing-in-ceremony news releases).
-- All three primary/independent sources (city site, Wikipedia, Maryland
-- state election records) agree on the same five current officeholders --
-- no Gardiner/Croslin-style discrepancy found this pass.
--
-- Government: Council-Manager, Mayor (elected at-large) + 4 Councilmembers
-- (2 from each of 2 Wards). All seats are 4-year terms -- explicitly
-- labeled "4 Year Term" on the city's own official ballot/results
-- spreadsheet -- with HALF the council (one seat per ward) elected every 2
-- years on a staggered cycle, same genuine-staggering pattern as
-- Hyattsville (#011). Municipal elections are held the first Monday in May
-- of odd years per the city charter.
--
-- Current roster is a real mix of two cohorts. ALL FIVE seats have a
-- confirmed current holder this pass -- no honest gap needed, unlike
-- Laurel (#012):
--   2023 cohort (Ward 1's Danielle Carter, Ward 2's Valerie Woodall):
--   Carter ran unopposed May 1, 2023; Woodall won re-election May 1, 2023
--   with 152 of 249 votes cast (Woodall had first joined the council via an
--   April 25, 2022 special election). Both sworn in May 8, 2023 at a
--   Special Legislative Meeting -- current term 2023-2027.
--   2025 cohort (Mayor Celina Benitez, re-elected; Ward 1's Jenny
--   Hoffpauir; Ward 2's Joseph Jakuta): all elected May 5, 2025, sworn in
--   May 12, 2025 by the Honorable Mahasin El Amin, Clerk of the Court for
--   Prince George's County -- current term 2025-2029. Per the city's own
--   official results spreadsheet: Benitez's citywide tally (summed across
--   both wards' ballots, since every voter votes for Mayor regardless of
--   ward) was 556 votes to runner-up Danielle Carter's 202; Hoffpauir beat
--   Charnette Robinson 245-147 in the contested Ward 1 council race;
--   Jakuta beat Derek Reynolds (92 votes) and Toni George (68 votes) with
--   203 votes in the contested Ward 2 council race.
--
-- NOTABLE WRINKLE, modeled honestly rather than smoothed over: sitting Ward
-- 1 councilmember Danielle Carter ran FOR MAYOR in the same May 5, 2025
-- election and lost to incumbent Benitez -- but Carter's own Ward 1
-- council seat was not up for election that cycle (only the OTHER Ward 1
-- seat was contested, won by Hoffpauir), so Carter simply continues
-- serving out her existing 2023-2027 Ward 1 council term. She is modeled
-- here ONLY as a Ward 1 councilmember (current_office_id points to the
-- Ward 1 council seat), never as a mayoral officeholder -- she lost that
-- race.
--
-- Mayor Benitez was first elected 2021 (sworn in May 10, 2021 as the
-- city's first Latina mayor, succeeding 16-year incumbent Malinda Miles)
-- and previously served as a Ward 1 councilmember 2017-2021.
--
-- is_partisan set FALSE by inference, not a directly-confirmed charter
-- citation this pass -- consistent with every other Maryland municipality
-- modeled so far (Rockville, Gaithersburg, Bowie, College Park,
-- Hyattsville, Laurel all nonpartisan) and no evidence of partisan
-- primaries found; worth a firmer citation if this is ever relied on for a
-- partisan-specific feature.
--
-- No accountability_pathways row added: no verified charter recall/removal
-- citation was found for Mount Rainier specifically -- same already-honest
-- gap as the other five municipalities.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md/place:mount_rainier', 'City of Mount Rainier', 'municipal', 'ocd-division/country:us/state:md/county:prince_georges')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('d0000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/place:mount_rainier', 'Mayor', 'single', 1, 4, FALSE, TRUE, 'municipal'),
  ('d0000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/place:mount_rainier', 'City Council — Ward 1', 'district', 2, 4, FALSE, TRUE, 'municipal'),
  ('d0000000-0000-4000-8000-000000000003', 'ocd-division/country:us/state:md/place:mount_rainier', 'City Council — Ward 2', 'district', 2, 4, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('d0000000-0000-4000-8000-000000000101', 'Celina Benitez', NULL, 'd0000000-0000-4000-8000-000000000001', 'Mayor of Mount Rainier; first elected 2021 (sworn in May 10, 2021) as the city''s first Latina mayor, succeeding 16-year incumbent Malinda Miles. Previously a Ward 1 councilmember, 2017-2021. Re-elected May 5, 2025 with 556 citywide votes (summed across both wards'' ballots), defeating sitting Ward 1 councilmember Danielle Carter (202 votes); sworn in for her second term May 12, 2025.'),
  ('d0000000-0000-4000-8000-000000000102', 'Danielle Carter', NULL, 'd0000000-0000-4000-8000-000000000002', 'City Council Ward 1 member; elected unopposed May 1, 2023, sworn in May 8, 2023 (current term 2023-2027). Ran for Mayor in the May 5, 2025 election and lost to incumbent Celina Benitez, but her own Ward 1 council seat was not up for election that cycle, so she continues serving her existing council term.'),
  ('d0000000-0000-4000-8000-000000000103', 'Jenny Hoffpauir', NULL, 'd0000000-0000-4000-8000-000000000002', 'City Council Ward 1 member; won the contested Ward 1 seat May 5, 2025 with 245 votes to Charnette Robinson''s 147, sworn in May 12, 2025 for a term running 2025-2029.'),
  ('d0000000-0000-4000-8000-000000000104', 'Valerie Woodall', NULL, 'd0000000-0000-4000-8000-000000000003', 'City Council Ward 2 member; first joined the council via an April 25, 2022 special election, then won re-election to a full term May 1, 2023 with 152 of 249 votes cast, sworn in May 8, 2023 (current term 2023-2027).'),
  ('d0000000-0000-4000-8000-000000000105', 'Joseph Jakuta', NULL, 'd0000000-0000-4000-8000-000000000003', 'City Council Ward 2 member; won the contested Ward 2 seat May 5, 2025 with 203 votes to Derek Reynolds'' 92 and Toni George''s 68, sworn in May 12, 2025 for a term running 2025-2029.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('d0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000101', '2025-05-12', 'elected'),
  ('d0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000102', '2023-05-08', 'elected'),
  ('d0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000103', '2025-05-12', 'elected'),
  ('d0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000104', '2023-05-08', 'elected'),
  ('d0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000105', '2025-05-12', 'elected');
