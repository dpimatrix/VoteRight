-- Town of University Park, MD: PG "town" tier. Real officeholders
-- live-verified 2026-08-05/06 against: the Maryland Manual's live page
-- (msa.maryland.gov, copyright-dated July 09, 2026 -- gives every current
-- officeholder with term-expiration year and notes which ran unopposed in
-- which cycle); the town's own upmd.org live pages -- specifically the
-- Mayor's Office page, the Town Council roster page (/198/Town-Council),
-- and the structured Staff Directory (/Directory.aspx?eid=NN, which carries
-- a machine-readable p-job-title microformat field, read directly from raw
-- HTML via curl after WebFetch's summarizer produced a contradictory read
-- on one page -- see below); Wikipedia's University_Park,_Maryland article
-- (independent third cross-check on the Mayor's name); and the actual
-- Charter of the Town of University Park (Chapter C on ecode360.com/UN3905
-- -- the site sits behind Cloudflare and blocked both WebFetch and curl on
-- its /print/ endpoint with a 403/"Attention Required," but plain curl with
-- a real browser User-Agent on the individual numbered-section URLs (e.g.
-- ecode360.com/32862356) succeeded and returned full section text --
-- Article III (Secs. 301-312), Article IV (401-402), and Article V
-- (501-508) all read in full, not snippets, plus the complete section-title
-- table of contents for all 8 Articles / ~85 sections of the Charter).
--
-- GOVERNMENT STRUCTURE, directly confirmed from Charter Section 301: "The
-- Common Council shall consist of seven members and a Mayor who shall be
-- elected as set forth in Article V. The Mayor and Council members shall
-- each hold office for a term of two years." Section 202 establishes 7
-- wards; the Mayor is elected at-large (Section 301/Article V), each
-- Councilmember by their own ward (one seat per ward, confirmed by the
-- live roster and Directory). Genuine per-office staggering, directly
-- confirmed (not assumed): Maryland Manual shows Mayor + Wards 1, 3, 7 all
-- expiring 2028 (elected together, unopposed, in the May 12, 2026 town
-- election -- 407 votes for Mayor Morrissey; 50/49/52 for Wards 1/3/7
-- respectively) while Wards 2, 4, 5, 6 all expire 2027 (elected together,
-- unopposed, in the May 6, 2025 town election). The town's own Town
-- Elections page states this rotation explicitly: "Odd years: Wards 2, 4,
-- 5, and 6 vote together" / "Even years: Mayor and Wards 1, 3, and 7 vote
-- together." A clean 4/4 split of the 8 elected offices, not a partial or
-- ad hoc stagger.
--
-- CAUGHT THREE REAL STALE-BIO-PAGE DISCREPANCIES (the exact pitfall this
-- pass was warned about) -- the town's site carries individual numbered
-- bio pages (upmd.org/204, /205, /208, etc.) for Council members that are
-- NOT reliably updated after each election. Read via raw curl (not
-- WebFetch's summarizer, which on one of these pages returned "Laurie
-- Morrissey is a Ward 3 Councilmember, not the Mayor" -- a plausible-
-- sounding but wrong claim that would have been a serious error if taken
-- at face value): (1) upmd.org/204/Laurie-Morrissey's own subhead literally
-- reads "Ward 3 Councilmember" (with a leftover mailto href of
-- "bhess@upmd.org", evidence the page template was recycled from an even
-- older officeholder and never fully updated after Morrissey became
-- Mayor). (2) upmd.org/205/Nathaniel-Morgan reads "Nathaniel Morgan, III,
-- Ward 4 Councilmember" -- superseded; Ward 4 is currently held by Cynthia
-- Mowery (see below). (3) upmd.org/208/Martha-Wells reads "Martha Wells,
-- Ward 6 Councilmember" -- superseded; Ward 6 is currently held by Grant
-- Godfrey. All three are resolved the same way: the LIVE Town Council
-- roster page (/198/Town-Council), the LIVE structured Staff Directory
-- (/Directory.aspx?eid=NN, which carries a proper p-job-title field), and
-- the Maryland Manual's July 2026 page all independently and consistently
-- agree with each other on the current 8 names below, against all three
-- stale individual bio pages. Wikipedia's article was fetched as a fourth,
-- fully independent source and also names Morrissey as current Mayor,
-- resolving the Mayor question conclusively. Morgan and Wells are NOT used
-- anywhere below.
--
-- NAME-FORMAT VARIANT (same pattern as Cheverly's Amy Jean Fry /Amy Jean
-- Chung Fry, migration #019): the Maryland Manual lists Ward 4's
-- officeholder as "Mary C. Reuter-Mowery"; the town's own live Town Council
-- page and Staff Directory (eid=25) both instead call her "Cynthia
-- Mowery" throughout, including her own directory bio ("Cynthia Mowery has
-- lived in UP since 1988..."). Same person -- likely going by her middle
-- name locally. The Maryland Manual's fuller formal-name form is used as
-- full_name below; "Cynthia Mowery" is noted in her bio as how the town
-- itself currently presents her.
--
-- TERM-START DATES: Charter Section 301 fixes the rule: "All officers
-- elected after May, 2011 shall take office at the close of the last
-- regular meeting in June." For the 2026-elected cohort (Mayor, Wards 1,
-- 3, 7) this is DIRECTLY confirmed, not just formula-derived: the town's
-- own AgendaCenter calendar lists actual 2026 Mayor & Common Council
-- meeting dates including "Jun 1, 2026" and "Jun 22, 2026" (no meeting on
-- the naively-expected "3rd Monday," June 15 -- the real schedule that
-- month skipped a week), and the town's "UPdate" newsletter posted
-- Thursday, June 18, 2026 states "join us Monday as newly elected and
-- returning Mayor and Council members are sworn into office" -- read
-- together, these directly pin the actual swearing-in to June 22, 2026,
-- used below for the Mayor/Ward1/Ward3/Ward7 term_start. For the
-- 2025-elected cohort (Wards 2, 4, 5, 6) no equivalent direct confirmation
-- (archived newsletter or meeting calendar) could be retrieved this pass
-- (Wayback Machine's API returned HTTP 429 on every attempt, and a search
-- for the relevant archived "UPdate" newsletter by guessing nearby IDs
-- came up empty) -- June 16, 2025 (the "3rd Monday in June" the Charter
-- formula would naively predict) is used below as a DISCLOSED ESTIMATE,
-- not a confirmed date; given the 2026 case just showed that exact formula
-- can miss the real date by about a week, this figure could plausibly be
-- off by a similar margin.
--
-- is_partisan set FALSE, DIRECTLY CONFIRMED (not inferred): Charter Section
-- 504(b), read in full: "The use of party affiliation or designation,
-- nicknames, titles, degrees or other designations on the ballot is
-- prohibited."
--
-- No accountability_pathways row added -- a CONFIRMED absence, not an
-- access gap. The complete Charter table of contents (all 8 Articles, ~85
-- sections) was retrieved, and the only section titled "Removal from
-- Office" (Section 309) was read in full: it provides only for automatic
-- suspension by operation of law upon an elected official's felony (or
-- morally-turpitudinous misdemeanor) conviction, governed by Article XV,
-- Section 3 of the Maryland Constitution -- not a citizen recall or
-- petition-based removal mechanism. Section 308 ("Vacancies in Office"),
-- also read in full, covers only death/resignation/unexcused absence/
-- incapacity, filled by Council vote or a special election depending on
-- time remaining -- again not a recall of a sitting officeholder. No
-- "Recall" section exists anywhere in the Charter. Same honest gap as
-- Bowie, College Park, Hyattsville, Laurel, New Carrollton, Bladensburg,
-- Edmonston, Brentwood, and Morningside.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md/place:university_park', 'Town of University Park', 'municipal', 'ocd-division/country:us/state:md/county:prince_georges')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('22000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/place:university_park', 'Mayor', 'single', 1, 2, FALSE, TRUE, 'municipal'),
  ('22000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/place:university_park', 'Town Council — Ward 1', 'district', 1, 2, FALSE, TRUE, 'municipal'),
  ('22000000-0000-4000-8000-000000000003', 'ocd-division/country:us/state:md/place:university_park', 'Town Council — Ward 2', 'district', 1, 2, FALSE, TRUE, 'municipal'),
  ('22000000-0000-4000-8000-000000000004', 'ocd-division/country:us/state:md/place:university_park', 'Town Council — Ward 3', 'district', 1, 2, FALSE, TRUE, 'municipal'),
  ('22000000-0000-4000-8000-000000000005', 'ocd-division/country:us/state:md/place:university_park', 'Town Council — Ward 4', 'district', 1, 2, FALSE, TRUE, 'municipal'),
  ('22000000-0000-4000-8000-000000000006', 'ocd-division/country:us/state:md/place:university_park', 'Town Council — Ward 5', 'district', 1, 2, FALSE, TRUE, 'municipal'),
  ('22000000-0000-4000-8000-000000000007', 'ocd-division/country:us/state:md/place:university_park', 'Town Council — Ward 6', 'district', 1, 2, FALSE, TRUE, 'municipal'),
  ('22000000-0000-4000-8000-000000000008', 'ocd-division/country:us/state:md/place:university_park', 'Town Council — Ward 7', 'district', 1, 2, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('22000000-0000-4000-8000-000000000101', 'Laurie K. Morrissey', NULL, '22000000-0000-4000-8000-000000000001', 'Mayor of University Park; ran unopposed and was re-elected May 12, 2026 (407 votes cast), sworn in June 22, 2026 for a 2-year term. Term expires 2028. Elected at-large per Charter Article V.'),
  ('22000000-0000-4000-8000-000000000102', 'Craig D. Kussmaul', NULL, '22000000-0000-4000-8000-000000000002', 'Town Council Ward 1 member; ran unopposed and was re-elected May 12, 2026 (50 votes cast), sworn in June 22, 2026 for a 2-year term. Term expires 2028.'),
  ('22000000-0000-4000-8000-000000000103', 'Mary F. Gathercole', NULL, '22000000-0000-4000-8000-000000000003', 'Town Council Ward 2 member; ran unopposed and was re-elected in the May 6, 2025 town election. Term expires 2027.'),
  ('22000000-0000-4000-8000-000000000104', 'Casey M. Kelby', NULL, '22000000-0000-4000-8000-000000000004', 'Town Council Ward 3 member; ran unopposed and was re-elected May 12, 2026 (49 votes cast), sworn in June 22, 2026 for a 2-year term. Term expires 2028.'),
  ('22000000-0000-4000-8000-000000000105', 'Mary C. Reuter-Mowery', NULL, '22000000-0000-4000-8000-000000000005', 'Town Council Ward 4 member; ran unopposed and was re-elected in the May 6, 2025 town election. Term expires 2027. Goes by "Cynthia Mowery" on the town''s own current website and staff directory -- same person, name-format variant.'),
  ('22000000-0000-4000-8000-000000000106', 'David M. McGaughey', NULL, '22000000-0000-4000-8000-000000000006', 'Town Council Ward 5 member; ran unopposed and was re-elected in the May 6, 2025 town election. Term expires 2027.'),
  ('22000000-0000-4000-8000-000000000107', 'Grant D. Godfrey', NULL, '22000000-0000-4000-8000-000000000007', 'Town Council Ward 6 member; ran unopposed and was re-elected in the May 6, 2025 town election. Term expires 2027.'),
  ('22000000-0000-4000-8000-000000000108', 'Kimberly A. Lopez', NULL, '22000000-0000-4000-8000-000000000008', 'Town Council Ward 7 member; ran unopposed and was re-elected May 12, 2026 (52 votes cast), sworn in June 22, 2026 for a 2-year term. Term expires 2028.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('22000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000101', '2026-06-22', 'elected'),
  ('22000000-0000-4000-8000-000000000002', '22000000-0000-4000-8000-000000000102', '2026-06-22', 'elected'),
  ('22000000-0000-4000-8000-000000000003', '22000000-0000-4000-8000-000000000103', '2025-06-16', 'elected'),
  ('22000000-0000-4000-8000-000000000004', '22000000-0000-4000-8000-000000000104', '2026-06-22', 'elected'),
  ('22000000-0000-4000-8000-000000000005', '22000000-0000-4000-8000-000000000105', '2025-06-16', 'elected'),
  ('22000000-0000-4000-8000-000000000006', '22000000-0000-4000-8000-000000000106', '2025-06-16', 'elected'),
  ('22000000-0000-4000-8000-000000000007', '22000000-0000-4000-8000-000000000107', '2025-06-16', 'elected'),
  ('22000000-0000-4000-8000-000000000008', '22000000-0000-4000-8000-000000000108', '2026-06-22', 'elected');
