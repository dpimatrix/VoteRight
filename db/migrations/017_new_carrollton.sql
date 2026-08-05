-- City of New Carrollton, MD: Prince George's municipality modeled after Bowie
-- (#009), College Park (#010), Hyattsville (#011), and Laurel (#012). Real
-- officeholders live-verified 2026-08-05 (WebSearch/WebFetch against
-- newcarrolltonmd.gov's own official Mayor & City Council pages, the city's
-- own scanned/certified May 5, 2025 election-results document, and the
-- city's own scanned May 21, 2025 City Council Workshop Meeting minutes --
-- all three primary sources agree).
--
-- Government: Mayor (1 seat) + City Council (5 seats, ALL AT-LARGE -- no
-- wards/districts; confirmed both by the 1971 Charter language found via
-- search, "a Mayor and a Council of five (5) members, elected at large," and
-- directly by the certified May 5, 2025 results sheet, which lists all 8
-- council candidates in one undivided at-large field competing for 5 seats),
-- 2-year terms for both Mayor and Council, NOT staggered -- the entire
-- Mayor + 5-member Council slate is elected together every 2 years (first
-- Monday in May), and the current roster is entirely a single May 5, 2025
-- cohort, all sworn in together May 21, 2025. A charter-amendment ballot
-- question on the SAME May 5, 2025 ballot asking whether to extend the
-- Mayor's term to 4 years (beginning no earlier than May 2027) was
-- REJECTED by voters (250 Yes / 345 No) -- so the 2-year term for Mayor
-- (and, per the same charter passage, Council) remains current and
-- confirmed, not a stale assumption.
--
-- CAUGHT AND DISCARDED A REAL DISCREPANCY, same pattern as the
-- Gardiner/Croslin case in migration 011: an aggregated WebSearch summary
-- reported the Alternate Treasurer's name as "Briana L. Urbina." No such
-- middle initial appears anywhere on the city's own site (staff directory
-- page, individual bio page, or page headers) or on the certified election
-- results sheet -- both consistently give "Briana Urbina," no middle
-- initial. The aggregated-summary "L." is treated as fabricated and
-- discarded; "Briana Urbina" (as the city itself spells it) is used below.
-- Separately, the city's own May 21, 2025 meeting minutes misspell one
-- councilmember as "Angelli Sybel Malavé" -- but the city's own official
-- bio page (newcarrolltonmd.gov/1362/Agnelli-Sybel-Malav-MPA-MPH) AND the
-- certified election-results sheet both independently spell it "Agnelli"
-- (no middle "n"); the minutes' spelling is treated as the one-off typo and
-- discarded in favor of the two agreeing primary sources.
--
-- Confirmed current-term details, directly from the two primary documents:
-- the certified "Monday, May 5, 2025, Municipal General Election Official
-- Results" sheet gives exact vote totals for every candidate (Mayor:
-- Nembhard 275 defeating incumbent Katrina R. Dodro 266 and John Anthony
-- Weisenberg 141; Council, top 5 of 8 at-large candidates seated: Mills 373,
-- Rosenberg 370, Lashley 362, Malavé 362, Urbina 355 -- the 6th-place
-- finisher, outgoing councilmember David Chi-Wai Lai at 336, lost his seat).
-- The city's own May 21, 2025 City Council Workshop Meeting minutes then
-- directly record the Clerk of the Circuit Court administering the oath of
-- office to Mayor Nembhard, Mayor Nembhard in turn administering the oath
-- to all five incoming councilmembers by name ("the 2025-2027 Council"),
-- and the Council's own self-organization immediately afterward into Chair
-- (Rosenberg), Vice Chair (Mills), Mayor Pro-Tem (Lashley), Alternate
-- Treasurer (Urbina), and Councilmember (Malavé) -- exactly matching the
-- roles shown on the city's live Mayor & City Council page today. term_start
-- for all six seats below uses this directly-confirmed May 21, 2025
-- swearing-in date, not the May 5, 2025 election date.
--
-- Mayor Nembhard's return is a real non-consecutive-term story, not
-- smoothed over: per the Maryland Manual's own mayors list, she was first
-- Mayor 2020-2023 (the city's first Black, first Caribbean-American, and
-- first woman Mayor), was succeeded by Katrina R. Dodro (2023-2025), then
-- defeated Dodro to reclaim the office in the May 5, 2025 election above.
--
-- is_partisan set FALSE by inference, not a directly-confirmed charter
-- citation this pass -- consistent with every other Maryland municipality
-- modeled so far, and further supported by the certified results sheet
-- itself, which lists every Mayor and Council candidate with no party
-- label of any kind.
--
-- No accountability_pathways row added: no verified charter recall/removal
-- citation was found for New Carrollton specifically this pass -- same
-- already-honest gap as Rockville, Gaithersburg, Bowie, College Park,
-- Hyattsville, and Laurel.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md/place:new_carrollton', 'City of New Carrollton', 'municipal', 'ocd-division/country:us/state:md/county:prince_georges')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('e0000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/place:new_carrollton', 'Mayor', 'single', 1, 2, FALSE, TRUE, 'municipal'),
  ('e0000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/place:new_carrollton', 'City Council — At-Large', 'at_large', 5, 2, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('e0000000-0000-4000-8000-000000000101', 'Phelecia E. Nembhard', NULL, 'e0000000-0000-4000-8000-000000000001', 'Mayor of New Carrollton; won a non-consecutive second term in the May 5, 2025 at-large election (275 votes), defeating incumbent Mayor Katrina R. Dodro (266) and John Anthony Weisenberg (141). Previously Mayor 2020-2023 -- the city''s first Black, first Caribbean-American, and first woman Mayor -- and a Council member/Council Chair (2018-2020) before that. Sworn in May 21, 2025.'),
  ('e0000000-0000-4000-8000-000000000102', 'Duane H. Rosenberg', NULL, 'e0000000-0000-4000-8000-000000000002', 'City Council member (Chair); won an at-large seat in the May 5, 2025 election (370 votes). Previously Mayor of New Carrollton (2018-2020) and a longtime city official/City Treasurer.'),
  ('e0000000-0000-4000-8000-000000000103', 'Cynthia DB Mills', NULL, 'e0000000-0000-4000-8000-000000000002', 'City Council member (Vice Chair); won an at-large seat in the May 5, 2025 election, the top vote-getter among council candidates (373 votes).'),
  ('e0000000-0000-4000-8000-000000000104', 'Lincoln HG Lashley', NULL, 'e0000000-0000-4000-8000-000000000002', 'City Council member (Mayor Pro Tem); won an at-large seat in the May 5, 2025 election (362 votes, tied with Malavé).'),
  ('e0000000-0000-4000-8000-000000000105', 'Briana Urbina', NULL, 'e0000000-0000-4000-8000-000000000002', 'City Council member (Alternate Treasurer); won an at-large seat in the May 5, 2025 election (355 votes). Outgoing Council Chair of the prior (2023-2025) council.'),
  ('e0000000-0000-4000-8000-000000000106', 'Agnelli Sybel Malavé', NULL, 'e0000000-0000-4000-8000-000000000002', 'City Council member; won an at-large seat in the May 5, 2025 election (362 votes, tied with Lashley). Holds MPA and MPH degrees.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('e0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000101', '2025-05-21', 'elected'),
  ('e0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000102', '2025-05-21', 'elected'),
  ('e0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000103', '2025-05-21', 'elected'),
  ('e0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000104', '2025-05-21', 'elected'),
  ('e0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000105', '2025-05-21', 'elected'),
  ('e0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000106', '2025-05-21', 'elected');
