-- Town of Bladensburg, MD: second of the PG "town" tier (after Cheverly
-- #019). Real officeholders live-verified 2026-08-05 against: the town's
-- own bladensburgmd.gov elected-officials page, the Maryland Manual's live
-- Bladensburg page (msa.maryland.gov -- an actively-maintained state
-- source, more authoritative here than an old codification, see below),
-- and the Town's own October 2025 General Election Candidate Guide
-- (extracted via pdftotext after WebFetch couldn't parse it).
--
-- CAUGHT A REAL STALE-DOCUMENT DISCREPANCY, same pattern as Glenarden's
-- pre-amendment charter PDF (migration #014): the town's own 1988-ratified
-- "Code of the Town of Bladensburg" (its Charter section, C2-2/C2-3, read
-- in full via pdftotext) states the Mayor's term is "two (2) years" while
-- Councilmen serve "four (4) years" -- an asymmetric split. This directly
-- CONTRADICTS three independent current sources: the Maryland Manual's
-- live page (Mayor James "term expires 2029" -- only possible on a 4-year
-- cycle from a 2025 election), the town's own October 2025 Election Guide
-- (extracted via pdftotext: "ELECT THE FOLLOWING POSITIONS: MAYOR - FOUR
-- YEAR TERM, ONE COUNCIL MEMBER WARD I - FOUR YEAR TERM, ONE COUNCIL
-- MEMBER WARD II - FOUR YEAR TERM" and later, explicitly, "The terms for
-- both Mayor and Councilmember are 4 years"), and multiple aggregated
-- search summaries. The 1988 Code document is treated as stale/superseded
-- by a later charter amendment not reflected in that specific PDF; the
-- CURRENT, confirmed term length for BOTH Mayor and Councilmember is 4
-- years, per the town's own current election guide.
--
-- GOVERNMENT STRUCTURE: Mayor elected at-large + 2 Councilmen per Ward (2
-- Wards), all 4-year terms, genuinely staggered per-seat (like Hyattsville
-- #011 and Mount Rainier #016) -- confirmed directly by the Oct 2025
-- Election Guide itself, which states only ONE Ward 1 seat and ONE Ward 2
-- seat (plus Mayor) were on that ballot, not both of each ward's seats.
-- Current roster is a real mix of two cohorts, cross-confirmed by the
-- Maryland Manual's explicit term-expiration years for each name:
--   2023 cohort (Ward 1's Kalisha Dixon, Ward 2's Marilyn Blount): elected
--   Oct. 2, 2023 (Maryland State Board of Elections' own results
--   document), current term expires 2027.
--   2025 cohort (Mayor Takisha D. James, Ward 1's Trina D. Brown, Ward 2's
--   Carrol H. McBryde): elected Oct. 6, 2025, current term expires 2029.
--
-- TERM-START DATE: the Oct 2025 Election Guide states directly, "The Mayor
-- and Council will take office at the regular December Council Meeting."
-- The only located December 2025 meeting record is dated December 8, 2025
-- -- used as term_start for the 2025 cohort. For the 2023 cohort, no
-- December 2023 meeting record was independently located this pass;
-- December 8, 2023 is used as a disclosed estimate BY ANALOGY to the
-- confirmed 2025 date (same "regular December Council Meeting" rule, same
-- rough time of month), not an independently confirmed date for 2023
-- itself -- same honesty convention as Bowie's Estève/Miller entries
-- (migration #009).
--
-- is_partisan set FALSE by inference: no explicit "nonpartisan" charter
-- declaration found in the (admittedly possibly-stale) Code text obtained,
-- but also no party-designation mechanism of any kind found anywhere in
-- it -- consistent with every other Maryland municipality modeled so far.
--
-- No accountability_pathways row added: the full Code/Charter text
-- obtained this pass (Sections C2-1 through C2-5) describes only
-- involuntary vacancy-by-felony-conviction/death/resignation/moving away,
-- filled by Council appointment -- no citizen recall or petition-based
-- removal mechanism was found. Same already-honest gap as Bowie, College
-- Park, Hyattsville, Laurel, and New Carrollton.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md/place:bladensburg', 'Town of Bladensburg', 'municipal', 'ocd-division/country:us/state:md/county:prince_georges')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('12000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/place:bladensburg', 'Mayor', 'single', 1, 4, FALSE, TRUE, 'municipal'),
  ('12000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/place:bladensburg', 'Town Council — Ward 1', 'district', 2, 4, FALSE, TRUE, 'municipal'),
  ('12000000-0000-4000-8000-000000000003', 'ocd-division/country:us/state:md/place:bladensburg', 'Town Council — Ward 2', 'district', 2, 4, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('12000000-0000-4000-8000-000000000101', 'Takisha D. James', NULL, '12000000-0000-4000-8000-000000000001', 'Mayor of Bladensburg; elected at large Oct. 6, 2025, current term expires 2029.'),
  ('12000000-0000-4000-8000-000000000102', 'Kalisha Dixon', NULL, '12000000-0000-4000-8000-000000000002', 'Town Council Ward 1 member; elected Oct. 2, 2023, current term expires 2027.'),
  ('12000000-0000-4000-8000-000000000103', 'Trina D. Brown', NULL, '12000000-0000-4000-8000-000000000002', 'Town Council Ward 1 member; elected Oct. 6, 2025, current term expires 2029.'),
  ('12000000-0000-4000-8000-000000000104', 'Marilyn Blount', NULL, '12000000-0000-4000-8000-000000000003', 'Town Council Ward 2 member; elected Oct. 2, 2023, current term expires 2027.'),
  ('12000000-0000-4000-8000-000000000105', 'Carrol H. McBryde', NULL, '12000000-0000-4000-8000-000000000003', 'Town Council Ward 2 member; elected Oct. 6, 2025, current term expires 2029.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('12000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000101', '2025-12-08', 'elected'),
  ('12000000-0000-4000-8000-000000000002', '12000000-0000-4000-8000-000000000102', '2023-12-08', 'elected'),
  ('12000000-0000-4000-8000-000000000002', '12000000-0000-4000-8000-000000000103', '2025-12-08', 'elected'),
  ('12000000-0000-4000-8000-000000000003', '12000000-0000-4000-8000-000000000104', '2023-12-08', 'elected'),
  ('12000000-0000-4000-8000-000000000003', '12000000-0000-4000-8000-000000000105', '2025-12-08', 'elected');
