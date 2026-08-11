-- POST-RESEARCH FIX (same fix applied to Section 3's migration, caught
-- during central cross-verification before either was committed): removed
-- the comma from "Village of Chevy Chase, Section 5" -- it broke the
-- jurisdiction resolver's substring match against the comma-less
-- Census-derived bare place name. The resolver's word-number-to-numeral
-- normalization fix (also added for Section 3's "Section Three" ->
-- "Section 3" case) covers this entity's "Section Five" -> "Section 5"
-- identically.
--
-- Village of Chevy Chase Section 5, MD: one of six real, separate,
-- adjacent Chevy-Chase-named municipalities in Montgomery County (Town of
-- Chevy Chase, Chevy Chase View, Chevy Chase Village, Village of Chevy
-- Chase Section 3, Village of Chevy Chase Section 5, North Chevy Chase --
-- each with its own charter and elected officials, researched as separate
-- migrations). Confirmed live against the real Census geocoder (3500
-- Thornapple St, Chevy Chase, MD 20815 -> Counties layer: Montgomery
-- County 24/031; Incorporated Places layer: "Chevy Chase Section Five
-- village"), cross-checked against Wikipedia's own cited village centroid
-- coordinates (38.98306, -77.07472), which independently geocode to the
-- same place name. TRAP AVOIDED: Section 5's own Council minutes list its
-- meeting location as "Village Hall, 5906 Connecticut Avenue" -- geocoding
-- that address returns "Chevy Chase Village town" instead, confirming
-- Section 5 borrows a meeting room physically sited in neighboring Chevy
-- Chase Village's own jurisdiction rather than its own; that address was
-- deliberately NOT used as the confirming address for this migration.
-- level='municipal', parent=Montgomery County's own ocd_id.
--
-- STRUCTURE (Charter of Section 5 of the Village of Chevy Chase, current
-- version reprinted June 2024, mgaleg.maryland.gov/pubs/LegisLegal/Muni-
-- Resolutions/2024-municipal-resolution-Chevy-Chase-Section-5-4-24-1.pdf,
-- read via pdftotext): a 5-member Village Council, all elected at-large to
-- 2-year terms, staggered 2/3 across two-year cycles -- 2 seats up in
-- EVEN-numbered years, 3 seats up in ODD-numbered years (Charter Sec.
-- 602). Elections are held on the date of the Annual Meeting, the first
-- Tuesday of May each year (Council may pick an alternate date). GENUINE
-- CHARTER-VERSION DISCREPANCY FOUND: an older 2008 reprint of this same
-- charter (msa.maryland.gov/megafile/msa/speccol/sc5300/sc5339/000113/
-- 019000/019203/unrestricted/20140279e.pdf) instead gives elections as the
-- first Tuesday of APRIL, with the seat-count parity REVERSED (2 seats in
-- odd years, 3 in even years) -- the June 2024 charter text supersedes it
-- and is the version used throughout this migration; the 2026 election
-- cycle (2 seats up, an even year) is consistent only with the 2024
-- version's rule, confirming it's current. The Council chooses one of its
-- own members as Chairman, Vice-Chairman, Treasurer, Secretary, and
-- Building Inspector (Charter Sec. 403); per the Maryland Manual, the
-- Chairman is "chosen by Council in June." Only the Chairman is modeled
-- as a separate office row here (established project pattern); the other
-- internally-assigned titles are noted in bio text only.
--
-- Real officeholders live-verified 2026-08-11, cross-checked across the
-- live Maryland Manual page (msa.maryland.gov/msa/mdmanual/37mun/
-- chevyvill5/html/c.html, page footer dated "Copyright June 18, 2026") and
-- the town's own site (chevychasesection5.org) council-meeting minutes
-- and newsletters: Chairman Gregory S. Chernack, Vice-Chair Sean M.
-- Downey, and Brooke L. Thomas -- all re-elected/elected May 6, 2025 (the
-- 3-seat odd-year cohort), term to 2027; and Peter E. Bass and Lib
-- Feinberg, newly elected May 5, 2026 (the 2-seat even-year cohort), term
-- to 2028, filling the two seats vacated by outgoing Josh Galper and Emily
-- Strulson (both declined to run again; 4 candidates -- Bass, Feinberg,
-- Farooq Hussain, Drew Pollekoff -- contested the 2 open seats per the
-- April 14, 2026 Council minutes and March 2026 newsletter, both directly
-- fetched and pdftotext'd).
-- DISCREPANCY CAUGHT AND RESOLVED: the town's own March 2026 newsletter
-- (pre-election) lists Josh Galper as Vice-Chair and Sean Downey as
-- "Building Inspector*" (duties delegated to the Town Manager); the live
-- Maryland Manual page (dated after the May 2026 election) instead lists
-- Downey as Vice-Chair. Since Galper left the Council (did not run for
-- re-election), the Council evidently reorganized officer titles at or
-- after its June 2026 meeting -- trusted the more current, live Manual
-- page over the pre-election newsletter for Downey's current title. Exact
-- term-start date for Chernack's Chairman office_terms row is NOT directly
-- confirmed (no source gives the specific June reselection date); modeled
-- as the same date as his most recent Council re-election, matching this
-- project's established disclosed-estimate practice for internally-chosen
-- leadership roles (e.g. Barnesville/Brookeville/Poolesville).
--
-- ACCOUNTABILITY: a real, binding citizen recall -- Charter Sec. 603
-- ("Recall of Elected Officials," added by amendment 6/11/02 and retained
-- in the current 2024 charter text), extracted via pdftotext. 20% of
-- registered Section 5 voters must sign a petition stating the reasons for
-- recall (no specific enumerated grounds required, unlike some other
-- Montgomery towns modeled in this project). A certified petition triggers
-- a special recall election within 60 days (or folding the question into
-- another town election scheduled within 90 days); the ballot asks a
-- simple "continued in office: yes/no" question decided by simple
-- majority. Protections: no recall petition may be filed against anyone
-- who has held office less than 3 months, no petition may name more than
-- one official, and no recall election is held if the target's term
-- expires within 90 days of the petition's certification.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md/place:chevy_chase_section5', 'Village of Chevy Chase Section 5', 'municipal', 'ocd-division/country:us/state:md/county:montgomery')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('30900000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/place:chevy_chase_section5', 'Chairman', 'single', 1, 2, FALSE, FALSE, 'municipal'),
  ('30900000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/place:chevy_chase_section5', 'Village Council', 'at_large', 5, 2, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('30900000-0000-4000-8000-000000000101', 'Gregory S. Chernack', NULL, '30900000-0000-4000-8000-000000000001', 'Chairman of the Village Council -- chosen by fellow Council members (per the Maryland Manual, reselected each June). Council member, most recently re-elected May 6, 2025, term to 2027.'),
  ('30900000-0000-4000-8000-000000000102', 'Sean M. Downey', NULL, '30900000-0000-4000-8000-000000000002', 'Village Council member, most recently re-elected May 6, 2025, term to 2027. Currently serves as Vice-Chair per the live Maryland Manual listing; the March 2026 town newsletter had listed him with the Building Inspector duty assignment instead, before a post-election officer reorganization.'),
  ('30900000-0000-4000-8000-000000000103', 'Brooke L. Thomas', NULL, '30900000-0000-4000-8000-000000000002', 'Village Council member, most recently re-elected May 6, 2025, term to 2027. Held the Treasurer duty assignment as of the March 2026 town newsletter.'),
  ('30900000-0000-4000-8000-000000000104', 'Peter E. Bass', NULL, '30900000-0000-4000-8000-000000000002', 'Village Council member, newly elected May 5, 2026, term to 2028 -- one of two winners among four candidates for the two seats vacated by outgoing members Josh Galper and Emily Strulson.'),
  ('30900000-0000-4000-8000-000000000105', 'Lib Feinberg', NULL, '30900000-0000-4000-8000-000000000002', 'Village Council member, newly elected May 5, 2026, term to 2028 -- one of two winners among four candidates for the two seats vacated by outgoing members Josh Galper and Emily Strulson.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('30900000-0000-4000-8000-000000000002', '30900000-0000-4000-8000-000000000101', '2025-05-06', 'elected'),
  ('30900000-0000-4000-8000-000000000001', '30900000-0000-4000-8000-000000000101', '2025-05-06', 'appointed'),
  ('30900000-0000-4000-8000-000000000002', '30900000-0000-4000-8000-000000000102', '2025-05-06', 'elected'),
  ('30900000-0000-4000-8000-000000000002', '30900000-0000-4000-8000-000000000103', '2025-05-06', 'elected'),
  ('30900000-0000-4000-8000-000000000002', '30900000-0000-4000-8000-000000000104', '2026-05-05', 'elected'),
  ('30900000-0000-4000-8000-000000000002', '30900000-0000-4000-8000-000000000105', '2026-05-05', 'elected');

-- Real, binding citizen recall -- Charter Sec. 603. 20% petition threshold,
-- simple-majority up-or-down recall vote, no enumerated grounds required.
INSERT INTO accountability_pathways (jurisdiction_id, office_id, mechanism_type, is_binding, legal_citation, signature_requirement_note, description)
SELECT 'ocd-division/country:us/state:md/place:chevy_chase_section5', id, 'municipal_recall', TRUE,
  'Charter of Section 5 of the Village of Chevy Chase, Sec. 603 (Recall of Elected Officials, added by amendment 6/11/02)',
  '20% of registered Section 5 voters',
  'A recall petition must state the reasons for recall (no specific enumerated grounds required) and be signed by at least 20% of Section 5''s registered voters. If certified by a Council-appointed Board of Elections, a special recall election is held within 60 days (or folded into another town election scheduled within 90 days); the ballot asks whether the official shall be "continued in office," decided by simple majority. No recall petition may be filed against an official who has served less than 3 months, no petition may target more than one official at a time, and no recall election is held if the official''s term expires within 90 days of certification.'
FROM offices WHERE jurisdiction_id = 'ocd-division/country:us/state:md/place:chevy_chase_section5';
