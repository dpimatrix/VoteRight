-- POST-RESEARCH FIX (caught during central cross-verification against the
-- other 5 sibling migrations, before any of them were committed): the
-- comma in "Village of Chevy Chase, Section 3" broke the jurisdiction
-- resolver's substring match against the Census-derived bare place name
-- ("Chevy Chase Section 3" has no comma) -- renamed to "Village of Chevy
-- Chase Section 3" (no comma) to match. A second real bug found in the
-- same pass -- Census spells this place "...Section Three village", word
-- form not numeral -- was fixed in the resolver itself
-- (app/src/lib/jurisdictions.ts), not by renaming around it, since every
-- other numbered-seat name in this schema already uses numerals.
--
-- Village of Chevy Chase Section 3, MD: one of six real, separate,
-- adjacent Chevy-Chase-named municipalities in Montgomery County (Town of
-- Chevy Chase, Chevy Chase View, Chevy Chase Village, Village of Chevy
-- Chase Section 3, Village of Chevy Chase Section 5, North Chevy Chase --
-- each with its own charter and elected officials, researched as separate
-- migrations). Confirmed live against the real Census geocoder (6810
-- Delaware St, Chevy Chase, MD -- a real Section 3 property, itself named
-- in the Council's own May 2025 newsletter re: a variance request ->
-- Counties layer: Montgomery County 24/031; Incorporated Places layer:
-- "Chevy Chase Section Three village", GEOID 2416730 -- an unambiguous
-- name distinct from any of the other five siblings). level='municipal',
-- parent=Montgomery County's own ocd_id.
--
-- STRUCTURE (Charter of Section 3 of the Village of Chevy Chase, read via
-- pdftotext after WebFetch returned unparsed binary -- both the Nov 2021
-- reprint served by mgaleg.maryland.gov and the Nov 2023 version served by
-- the village's own site, chevychasesection3.org, were checked and agree
-- on every point used here): a 5-member Village Council, elected
-- at-large to 2-year terms, STAGGERED per Charter Section 602 -- "Two
-- Council members shall be elected in even-numbered years and three
-- Council members in odd-numbered years." Elections are held on the
-- second Tuesday of May each year; the Annual Meeting/swearing-in
-- typically follows within days (observed Wed, May 8 in 2024 -- before
-- that year's 2nd Tuesday -- and Wed, May 14 in 2025, one day after).
-- There is no directly-elected Mayor/Chair: per Charter Section 403, the
-- Council elects from among its own 5 members a Chairman, Vice-Chairman,
-- Treasurer, Secretary and Building Inspector -- same dual-office-row
-- pattern as Poolesville/Martin's Additions (Council seat is_elected=
-- TRUE, Chair office is_elected=FALSE/appointed). The Charter does not
-- state how often these internal officer titles are re-selected (unlike
-- Poolesville's explicit 2-year Presidency or Martin's Additions'
-- explicit annual July reselection), so this migration's Chair
-- term_length_years is an INFERRED default matching the Council's own
-- 2-year cycle, not a directly-stated Charter figure.
--
-- Real officeholders live-verified 2026-08-11, cross-checked across three
-- sources -- the Maryland Manual (msa.maryland.gov/msa/mdmanual/37mun/
-- chevyvill3, current live version), the village's own "About the Village
-- Council" page (chevychasesection3.org/240), and the village's own May
-- 2025 newsletter (chevychasesection3.org/DocumentCenter/View/428,
-- cleanly extracted, unlike several later-dated newsletter PDFs on this
-- site whose extracted text was garbled/double-exposed with an unrelated
-- month's content -- those garbled documents were used only to
-- cross-confirm names/titles already established by the clean sources,
-- never as a sole source for a fact):
--   * Susan Baker Manning -- Chair (chosen by fellow Council members);
--     Council member, re-elected at the May 14, 2025 Annual Meeting
--     (Maryland Manual: term ends 2027, matching the odd-year/3-seat
--     cohort). Chair-selection date is an ESTIMATE tied to this same
--     Council reelection date, same disclosed-estimate convention used at
--     Poolesville/Martin's Additions.
--   * Frederic A. Press ("Fred Press") -- Vice-Chair; Council member,
--     newly elected at the same May 14, 2025 Annual Meeting (term ends
--     2027). The May 2025 newsletter notes he was "one of our founding
--     Councilmembers when Section 3 incorporated as a municipal
--     government" (1982) returning to the Council after time away.
--   * Sarah Efird Stephens -- Buildings & Roads Representative (the
--     Manual's label for the Charter's "Building Inspector" officer
--     seat); Council member, newly elected at the same May 14, 2025
--     Annual Meeting (term ends 2027).
--   * Matthew A. Nader ("Matt Nader") -- Treasurer; Council member, first
--     elected (uncontested, per the Charter's skip-the-ballot-if-
--     uncontested provision) at the May 8, 2024 Annual Meeting,
--     succeeding then-Treasurer Tom Carroll. The Maryland Manual lists
--     his term as ending 2028, which requires a further re-election in
--     2026 (Section 3's even-year/2-seat cohort) -- ESTIMATED, NOT
--     DIRECTLY CONFIRMED BY CLEAN TEXT: the May 2026 newsletter PDF
--     (chevychasesection3.org/DocumentCenter/View/582) was one of the
--     garbled/double-exposed documents, but its legible text did clearly
--     include "Annual Meeting - Wednesday, May 13" (the Wednesday
--     following 2026's actual second Tuesday, May 12) and still listed
--     Nader as Treasurer -- consistent with, but not a clean-text proof
--     of, an uncontested re-election that date. Term-start recorded here
--     as 2026-05-13 on that basis.
--   * John R. Jacob -- Secretary; Council member, same first-elected-
--     2024/re-elected-2026 pattern and same evidentiary caveat as Nader
--     above, succeeding then-Secretary Ellie Nader. Term-start recorded
--     as 2026-05-13.
-- DISCREPANCY NOTED: the Maryland Manual's non-elected-staff listing
-- (Village Manager "Andy Leon Harney") is stale -- the village's own May
-- 2025 newsletter documents a "Hello Kelly/Goodbye Andy Party" and all
-- 2025-2026 newsletters list Kelly Mitch as Village Manager. Not modeled
-- here (not an elected office), but flagged since it shows the Manual can
-- lag the village's own site on non-Council roles.
--
-- ACCOUNTABILITY: no citizen recall provision was found after a real
-- search of the Charter (checked both the Nov 2021 mgaleg.maryland.gov
-- reprint and the Nov 2023 village-hosted version; "recall" does not
-- appear in either). The only removal mechanism in the Charter is
-- internal: Section 401 allows the Council itself (not citizens) to
-- remove a Council member "as a result of extended absenteeism" (missing
-- three or more consecutive regular and/or special Council meetings) by
-- majority Council vote following a public hearing. That is a
-- board-internal removal-for-cause mechanism, not a citizen-initiated
-- accountability pathway, so no accountability_pathways row is inserted
-- here -- left as an honest, confirmed-absent gap rather than guessed.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md/place:chevy_chase_section3', 'Village of Chevy Chase Section 3', 'municipal', 'ocd-division/country:us/state:md/county:montgomery')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('30800000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/place:chevy_chase_section3', 'Chair', 'single', 1, 2, FALSE, FALSE, 'municipal'),
  ('30800000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/place:chevy_chase_section3', 'Village Council', 'at_large', 5, 2, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('30800000-0000-4000-8000-000000000101', 'Susan Baker Manning', NULL, '30800000-0000-4000-8000-000000000001', 'Chair of the Village Council -- chosen by fellow Council members. Council member, re-elected at the May 14, 2025 Annual Meeting, term to 2027.'),
  ('30800000-0000-4000-8000-000000000102', 'Frederic A. Press', NULL, '30800000-0000-4000-8000-000000000002', 'Vice-Chair -- chosen by fellow Council members. Council member, elected May 14, 2025, term to 2027; one of Section 3''s founding Councilmembers when it incorporated in 1982, returning to the Council in this term.'),
  ('30800000-0000-4000-8000-000000000103', 'Sarah Efird Stephens', NULL, '30800000-0000-4000-8000-000000000002', 'Buildings & Roads Representative (the Charter''s "Building Inspector" officer seat) -- chosen by fellow Council members. Council member, elected May 14, 2025, term to 2027.'),
  ('30800000-0000-4000-8000-000000000104', 'Matthew A. Nader', NULL, '30800000-0000-4000-8000-000000000002', 'Treasurer -- chosen by fellow Council members. Council member, first elected (uncontested) May 8, 2024; re-elected (estimated date) May 13, 2026, term to 2028.'),
  ('30800000-0000-4000-8000-000000000105', 'John R. Jacob', NULL, '30800000-0000-4000-8000-000000000002', 'Secretary -- chosen by fellow Council members. Council member, first elected (uncontested) May 8, 2024; re-elected (estimated date) May 13, 2026, term to 2028.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('30800000-0000-4000-8000-000000000002', '30800000-0000-4000-8000-000000000101', '2025-05-14', 'elected'),
  ('30800000-0000-4000-8000-000000000001', '30800000-0000-4000-8000-000000000101', '2025-05-14', 'appointed'),
  ('30800000-0000-4000-8000-000000000002', '30800000-0000-4000-8000-000000000102', '2025-05-14', 'elected'),
  ('30800000-0000-4000-8000-000000000002', '30800000-0000-4000-8000-000000000103', '2025-05-14', 'elected'),
  ('30800000-0000-4000-8000-000000000002', '30800000-0000-4000-8000-000000000104', '2026-05-13', 'elected'),
  ('30800000-0000-4000-8000-000000000002', '30800000-0000-4000-8000-000000000105', '2026-05-13', 'elected');

-- No accountability_pathways row: no citizen recall provision found in the
-- Charter (see comment above) -- an honest, confirmed-absent gap.
