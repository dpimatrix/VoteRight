-- Town of North Brentwood, MD: incorporated 1924 under Chapter 508, Acts of
-- 1924 -- one of the first Black-founded/incorporated municipalities in
-- Maryland (noted here as background, not independently re-researched, per
-- the task brief). Real officeholders and charter structure live-verified
-- 2026-08-05/06 against: the town's own northbrentwood.com "Elected
-- Officials" and "Government" pages; the live Maryland Manual page
-- (msa.maryland.gov/msa/mdmanual/37mun/northbrent/html/n.html, NOT the
-- stale 2023 archived snapshot that a first-pass WebSearch surfaced); the
-- actual codified Charter of the Town of North Brentwood (eCode360,
-- custId NO3874, Articles IV "The Council", V "The Mayor", and VII
-- "Registration, Nomination, and Elections" read in FULL via curl -- 403'd
-- to WebFetch's own fetcher, worked with a browser User-Agent); and the
-- actual PDF of Charter Amendment Resolution No. 01-2022 (downloaded from
-- northbrentwood.com's own Legislation page, extracted via pdftotext after
-- WebFetch could only summarize it) -- this last document turned out to be
-- essential, see below.
--
-- CAUGHT A REAL STALE-NAME DISCREPANCY (same pattern flagged in the task
-- brief): the Maryland Manual's 2023-dated archival snapshot and a
-- first-pass aggregated search both surface "Charles F. Wiley" as the Ward
-- 1 Councilmember. Wiley's term in fact ended May 2024 (independently
-- confirmed by BOTH the town's own live site, which now shows Jacqueline
-- L. Morales in Ward 1 with a term expiring 2028, AND Charter Amendment
-- Resolution 01-2022 itself, whose own WHEREAS clause -- written in
-- September 2022 -- states Wiley's then-current term was due to expire in
-- "May of the given year ... Ward 1, 2024," i.e. even the amendment's
-- drafters, writing in 2022, already knew Wiley's seat would turn over in
-- 2024). Wiley's name is not used below except in this note.
--
-- A SECOND, LARGER DISCREPANCY, RESOLVED BY READING THE ACTUAL 2022
-- AMENDMENT TEXT: eCode360's codified Charter (last updated through
-- 2021-06-07) reads Section 401 as saying Council "wards" were formally
-- ELIMINATED by Charter Amendment Resolution 2008-1 (effective 3-25-2008)
-- and replaced with three numbered at-large "Council seats" (Seat 1
-- elected in odd years with the Mayor; Seats 2 and 3 in even years) -- yet
-- the town's own LIVE 2026 website consistently labels the same three
-- council positions "Ward I / II / III". Since eCode360's codification
-- predates 2022, this looked like it might just be outdated public-facing
-- branding on the town's part. It is not: the town's own Legislation page
-- links a "Proposed Charter Amendment Resolution 01-2022" (with a
-- companion "*Public Notice of CAR 01-2022", both PDFs hosted directly on
-- northbrentwood.com), which was downloaded and read in full via
-- pdftotext. That resolution amends Sections 401, 501, and 709, and its
-- redline explicitly ADDS the word "WARD" back into the seat labels
-- (e.g. Section 709: "...one person to serve as Councilmember (Council
-- seat [[1]] WARD 2)"), while its own WHEREAS clause independently
-- confirms "the ward boundaries are not described elsewhere in the
-- Charter as said Ward descriptions were repealed years ago" -- i.e. the
-- 2022 amendment restored "Ward N" as the official name of each numbered
-- seat, WITHOUT restoring any geographic district/residency requirement.
-- Every current seat is still elected townwide. This is why the three
-- Council offices below are titled "Ward 1/2/3" (matching the town's
-- current, legally correct usage) but modeled with seat_type = 'at_large',
-- not 'district'. I could not find any record of this 2022 amendment
-- actually being voted down or superseded, and its resulting provisions
-- (4-year terms, current 2027/2028 term-expiration years, "Ward"-labeled
-- seats) are independently corroborated by BOTH the live Maryland Manual
-- page AND the town's own live site, giving strong confidence it is in
-- effect.
--
-- The SAME 2022 amendment also changed term lengths from two years to
-- FOUR years (Sections 401(a) and 501, both redlined "term of [[two]]
-- FOUR years"), and fixed the election calendar (Section 709 as amended):
-- Mayor + Ward 2 are elected together on the first Monday of May every
-- fourth year starting 2023; Ward 1 + Ward 3 are elected together on the
-- first Monday of May every fourth year starting 2024. This exactly
-- matches the term-expiration years independently shown on both the live
-- Maryland Manual page and the town's own site: Mayor and Ward 2 expire
-- 2027 (elected 2023); Ward 1 and Ward 3 expire 2028 (elected 2024).
--
-- TERM-START DATES: derived, not guessed, from Charter Sections 501 ("The
-- newly elected mayor shall take office on the third Monday of May
-- following the election") and 401(a) (Councilmembers' terms turn over
-- "on the 3rd Monday following the election of their successors"). May 1,
-- 2023 (confirmed the actual first-Monday-of-May 2023 election date by
-- the town's own "Recent Election Results (May 1, 2023)" page, where
-- Robinson and Baynes are both shown re-elected unopposed) gives a
-- third-Monday take-office date of May 15, 2023 for Mayor + Ward 2. May 6,
-- 2024 (the actual first Monday of May 2024) gives a third-Monday
-- take-office date of May 20, 2024 for Ward 1 + Ward 3.
--
-- NAME FORMATS: the Maryland Manual gives fuller middle-initial forms
-- (e.g. "Aaron D. Baynes") than the town's own site ("Aaron Baynes") --
-- same person in every case, not a discrepancy; fuller forms used as
-- full_name below, per the Cheverly-migration convention.
--
-- is_partisan set FALSE by inference: the full text of Articles IV (The
-- Council), V (The Mayor), and VII (Registration, Nomination, and
-- Elections), plus the full 2022 amendment text, were all read in full and
-- searched for "partisan" and "party" -- zero matches in any of them. No
-- explicit "nonpartisan" declaration was found, but also no party-
-- designation mechanism of any kind, consistent with every other Maryland
-- municipality modeled so far.
--
-- No accountability_pathways row added: the full Charter table of
-- contents (all 13 Articles) was enumerated and Article VII (Elections)
-- was read in full -- zero "recall" matches anywhere in the Charter.
-- Section 716 ("Vacancies in Elective Office") provides only for
-- INVOLUNTARY vacancies (death, resignation, forfeiture, removal) to be
-- filled by Council appointment (if under 180 days remain) or a special
-- election (if 180+ days remain, or for any Mayor vacancy) -- no citizen
-- recall or petition-based removal mechanism exists. Same already-honest
-- gap as Bowie, College Park, Hyattsville, Laurel, New Carrollton,
-- Bladensburg, Edmonston, and Brentwood.
--
-- Vice-Mayor: Charter Section 507 has the Mayor appoint "the senior member
-- of the Council" as Vice-Mayor after each Town election -- an internal
-- role assigned to a sitting Councilmember, not a separately elected
-- office, so (per the Brentwood-migration convention) it is noted only in
-- Baynes's bio below, not modeled as its own office/politician row.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md/place:north_brentwood', 'Town of North Brentwood', 'municipal', 'ocd-division/country:us/state:md/county:prince_georges')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('1e000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/place:north_brentwood', 'Mayor', 'single', 1, 4, FALSE, TRUE, 'municipal'),
  ('1e000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/place:north_brentwood', 'Town Council — Ward 1', 'at_large', 1, 4, FALSE, TRUE, 'municipal'),
  ('1e000000-0000-4000-8000-000000000003', 'ocd-division/country:us/state:md/place:north_brentwood', 'Town Council — Ward 2', 'at_large', 1, 4, FALSE, TRUE, 'municipal'),
  ('1e000000-0000-4000-8000-000000000004', 'ocd-division/country:us/state:md/place:north_brentwood', 'Town Council — Ward 3', 'at_large', 1, 4, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('1e000000-0000-4000-8000-000000000101', 'Petrella A. Robinson', NULL, '1e000000-0000-4000-8000-000000000001', 'Mayor of North Brentwood since 2007; most recently re-elected unopposed May 1, 2023 under the Charter''s 4-year term (per Charter Amendment Resolution 01-2022); current term expires 2027. North Brentwood, incorporated in 1924, is one of the first Black-founded/incorporated municipalities in Maryland.'),
  ('1e000000-0000-4000-8000-000000000102', 'Jacqueline L. Morales', NULL, '1e000000-0000-4000-8000-000000000002', 'Town Council Ward 1 member; elected May 6, 2024, succeeding Charles F. Wiley, whose term ended that year. Current term expires 2028. "Ward 1" is the seat''s official Charter-defined name, not a residency-based district -- the seat is elected townwide.'),
  ('1e000000-0000-4000-8000-000000000103', 'Aaron D. Baynes', NULL, '1e000000-0000-4000-8000-000000000003', 'Town Council Ward 2 member and Vice-Mayor; on the Council since 2007, most recently re-elected unopposed May 1, 2023 alongside the Mayor under the Charter''s 4-year term. Current term expires 2027. "Ward 2" is the seat''s official Charter-defined name, not a residency-based district -- the seat is elected townwide.'),
  ('1e000000-0000-4000-8000-000000000104', 'Evan K. Dame', NULL, '1e000000-0000-4000-8000-000000000004', 'Town Council Ward 3 member; on the Council since 2017, most recently re-elected May 6, 2024. Current term expires 2028. "Ward 3" is the seat''s official Charter-defined name, not a residency-based district -- the seat is elected townwide.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('1e000000-0000-4000-8000-000000000001', '1e000000-0000-4000-8000-000000000101', '2023-05-15', 'elected'),
  ('1e000000-0000-4000-8000-000000000002', '1e000000-0000-4000-8000-000000000102', '2024-05-20', 'elected'),
  ('1e000000-0000-4000-8000-000000000003', '1e000000-0000-4000-8000-000000000103', '2023-05-15', 'elected'),
  ('1e000000-0000-4000-8000-000000000004', '1e000000-0000-4000-8000-000000000104', '2024-05-20', 'elected');
