-- Town of Cheverly, MD: first of the "town" tier (17 remaining after all 10
-- PG "city" tier municipalities were modeled in #009-#018). Real
-- officeholders live-verified 2026-08-05 against: the town's own
-- cheverly-md.gov Mayor & Council page; the Town of Cheverly's own
-- CERTIFIED May 5, 2025 election-results document (elections.maryland.gov,
-- a scanned PDF read directly via vision, not a secondhand summary --
-- exact vote totals for every race, signed by all 4 Board of Elections
-- Supervisors); and the actual Charter of the Town of Cheverly (Maryland
-- General Assembly's own PDF reprint, extracted via pdftotext -- Sections
-- C-9 through C-10.1 read in full, not a search-engine snippet).
--
-- Government: Mayor + 6 Councilmembers (one per Ward, Charter Section C-9:
-- "The Mayor shall be elected for a period of three (3) years and each of
-- the Councilmembers shall be elected for a period of two (2) years").
-- Despite the mismatched term lengths (which will drift the Mayor's and
-- Council's election cycles apart over subsequent cycles -- not fully
-- traced here, not needed for a correct CURRENT roster), the certified May
-- 5, 2025 results document directly confirms Mayor and all 6 Council seats
-- were in fact ALL contested on the same single ballot this cycle, so the
-- current roster is unambiguous.
--
-- TERM-START DATE: Charter Section C-9.A: newly elected officials "shall
-- take office before the next council meeting succeeding their election by
-- taking an oath." No source found this pass pins down the exact calendar
-- date of that first post-election meeting; May 5, 2025 (the certified
-- election date itself) is used as a reasonable, disclosed estimate, same
-- convention as Bowie's Estève/Miller entries (migration #009) -- not a
-- fabricated precise oath date.
--
-- CERTIFIED MAY 5, 2025 RESULTS (exact vote totals, read directly from the
-- scanned certified document): Mayor -- Micah Watson 939 over Kayce
-- Munyeneh 704. Ward 1 -- Christopher Wade 283 (unopposed but for
-- scattered write-ins). Ward 2 -- John LeGloahec 121, a genuinely close
-- 3-way race over Bryan Barnett-Woods (110) and Daphne Felten-Green (107).
-- Ward 3 -- Nicole Bryner 248 over a certified write-in, Lane Thompson
-- (100). Ward 4 -- David Tansey 302 (clear win). Ward 5 -- Charly Garces 11
-- (unopposed; Ward 5 is a small ward, hence the low absolute count). Ward 6
-- -- the certified document spells this seat's winner "Amy Jean Fry" (156
-- votes, over a certified write-in, Elaine Johnson, 80); the town's own
-- live website instead spells her "Amy Jean Chung Fry" -- same person, a
-- name-format variant between the certified 2025 document and the current
-- site, not a different-person error; the certified document's spelling is
-- used as full_name below, with the site's fuller form noted in her bio.
--
-- is_partisan set FALSE by inference: the full charter text obtained this
-- pass contains no "nonpartisan" declaration comparable to Bowie/District
-- Heights' explicit language, but also no party-designation mechanism of
-- any kind anywhere in it (confirmed by a full-text search of the
-- document) -- consistent with every other Maryland municipality modeled
-- so far.
--
-- ACCOUNTABILITY: Charter Section C-10.1, "Recall of elected officials,"
-- read and quoted directly (not inferred): a petition signed by 30% of the
-- Town's registered voters (Mayor) or 30% of a ward's registered voters
-- (Councilmember) triggers Board of Elections verification, a public
-- hearing within 30 days, then a binding special reaffirm/remove election
-- within 45 days; a majority "remove" vote vacates the seat immediately.
-- The petition must state one of four specific grounds: failure to uphold
-- the oath of office, malfeasance, misfeasance, or nonfeasance. Modeled as
-- one accountability_pathways row per office (Mayor + all 6 Wards), same
-- fan-out pattern as migrations #013/#014.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md/place:cheverly', 'Town of Cheverly', 'municipal', 'ocd-division/country:us/state:md/county:prince_georges')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('11000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/place:cheverly', 'Mayor', 'single', 1, 3, FALSE, TRUE, 'municipal'),
  ('11000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/place:cheverly', 'Town Council — Ward 1', 'district', 1, 2, FALSE, TRUE, 'municipal'),
  ('11000000-0000-4000-8000-000000000003', 'ocd-division/country:us/state:md/place:cheverly', 'Town Council — Ward 2', 'district', 1, 2, FALSE, TRUE, 'municipal'),
  ('11000000-0000-4000-8000-000000000004', 'ocd-division/country:us/state:md/place:cheverly', 'Town Council — Ward 3', 'district', 1, 2, FALSE, TRUE, 'municipal'),
  ('11000000-0000-4000-8000-000000000005', 'ocd-division/country:us/state:md/place:cheverly', 'Town Council — Ward 4', 'district', 1, 2, FALSE, TRUE, 'municipal'),
  ('11000000-0000-4000-8000-000000000006', 'ocd-division/country:us/state:md/place:cheverly', 'Town Council — Ward 5', 'district', 1, 2, FALSE, TRUE, 'municipal'),
  ('11000000-0000-4000-8000-000000000007', 'ocd-division/country:us/state:md/place:cheverly', 'Town Council — Ward 6', 'district', 1, 2, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('11000000-0000-4000-8000-000000000101', 'Micah Watson', NULL, '11000000-0000-4000-8000-000000000001', 'Mayor of Cheverly; won the May 5, 2025 election with 939 votes over Kayce Munyeneh (704).'),
  ('11000000-0000-4000-8000-000000000102', 'Christopher Wade', NULL, '11000000-0000-4000-8000-000000000002', 'Town Council Ward 1 member; won the May 5, 2025 election with 283 votes.'),
  ('11000000-0000-4000-8000-000000000103', 'John LeGloahec', NULL, '11000000-0000-4000-8000-000000000003', 'Town Council Ward 2 member; won a close 3-way May 5, 2025 race with 121 votes over Bryan Barnett-Woods (110) and Daphne Felten-Green (107).'),
  ('11000000-0000-4000-8000-000000000104', 'Nicole Bryner', NULL, '11000000-0000-4000-8000-000000000004', 'Town Council Ward 3 member; won the May 5, 2025 election with 248 votes over a certified write-in candidate, Lane Thompson (100).'),
  ('11000000-0000-4000-8000-000000000105', 'David Tansey', NULL, '11000000-0000-4000-8000-000000000005', 'Town Council Ward 4 member; won the May 5, 2025 election with 302 votes.'),
  ('11000000-0000-4000-8000-000000000106', 'Charly Garces', NULL, '11000000-0000-4000-8000-000000000006', 'Town Council Ward 5 member; won the May 5, 2025 election unopposed (11 votes cast in this small ward).'),
  ('11000000-0000-4000-8000-000000000107', 'Amy Jean Fry', NULL, '11000000-0000-4000-8000-000000000007', 'Town Council Ward 6 member (also given as "Amy Jean Chung Fry" on the town''s current website -- same person, name-format variant); won the May 5, 2025 election with 156 votes over a certified write-in candidate, Elaine Johnson (80).');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('11000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000101', '2025-05-05', 'elected'),
  ('11000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000102', '2025-05-05', 'elected'),
  ('11000000-0000-4000-8000-000000000003', '11000000-0000-4000-8000-000000000103', '2025-05-05', 'elected'),
  ('11000000-0000-4000-8000-000000000004', '11000000-0000-4000-8000-000000000104', '2025-05-05', 'elected'),
  ('11000000-0000-4000-8000-000000000005', '11000000-0000-4000-8000-000000000105', '2025-05-05', 'elected'),
  ('11000000-0000-4000-8000-000000000006', '11000000-0000-4000-8000-000000000106', '2025-05-05', 'elected'),
  ('11000000-0000-4000-8000-000000000007', '11000000-0000-4000-8000-000000000107', '2025-05-05', 'elected');

INSERT INTO accountability_pathways (jurisdiction_id, office_id, mechanism_type, is_binding, legal_citation, signature_requirement_note, description)
SELECT 'ocd-division/country:us/state:md/place:cheverly', id, 'municipal_recall', TRUE,
  'Charter of the Town of Cheverly, Section C-10.1 (Recall of elected officials)',
  '30% of the Town''s registered voters to recall the Mayor; 30% of the Councilmember''s ward''s registered voters to recall a Councilmember',
  'A petition signed by the required threshold, presented to the Mayor and Council at a regular town meeting, must state one of four specific grounds: failure to uphold the oath of office, malfeasance, misfeasance, or nonfeasance. If the Board of Election Supervisors verifies the petition, a public hearing is held within 30 days and a binding special "reaffirm or remove" election within 45 days -- citywide for the Mayor, ward-only for a Councilmember. A majority "remove" vote vacates the seat immediately.'
FROM offices WHERE jurisdiction_id = 'ocd-division/country:us/state:md/place:cheverly';
