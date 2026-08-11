-- Town of Chevy Chase, MD: one of six real, separate, adjacent Chevy-Chase-
-- named municipalities in Montgomery County (Town of Chevy Chase, Chevy
-- Chase View, Chevy Chase Village, Village of Chevy Chase Section 3,
-- Village of Chevy Chase Section 5, North Chevy Chase -- each with its own
-- charter and elected officials, researched as separate migrations). This
-- is the original/largest of the six (incorporated 1918 as former Section
-- 4 of the Village of Chevy Chase; MD Manual entry at msa.maryland.gov/
-- msa/mdmanual/37mun/chevychase/html/c.html -- the un-suffixed "chevychase"
-- subdirectory, distinct from the "chevychase3"/"chevychase5" sections and
-- from Chevy Chase Village's and Chevy Chase View's own separate entries).
-- Confirmed live against the real Census geocoder (4301 Willow Lane, the
-- Town's own Town Hall address -> Counties layer: Montgomery County
-- 24/031; Incorporated Places layer: "Chevy Chase town", GEOID 2416620).
-- level='municipal', parent=Montgomery County's own ocd_id.
--
-- STRUCTURE (Charter of the Town of Chevy Chase, reprinted Nov 2024,
-- extracted via pdftotext after WebFetch returned unparsed binary):
-- Article II Section 201 -- a 5-member Council, all elected AT-LARGE
-- (no wards/sections), 2-year terms. Section 404 sets a staggered cycle:
-- 2 seats elected the first Tuesday in May of ODD years, 3 seats the
-- first Tuesday in May of EVEN years. Section 205: at its annual
-- organizational meeting (held within 15 days of the election, Section
-- 204), the Council elects from among its own 5 members a Mayor (head of
-- town government, presides at meetings), a Treasurer, and a Secretary;
-- "additional officers may be designated" -- in practice a Vice-Mayor and
-- a Community Liaison, per the Town's current site and its own meeting
-- minutes. Section 205(e): a Councilmember elected Mayor may not serve
-- more than 2 consecutive 1-year terms except by unanimous Council vote.
-- Modeled with the same dual-office-row convention used for Falls Church/
-- Poolesville/Brookeville/Garrett Park: an elected 'Town Council' office
-- (seat_count=5, is_elected=TRUE) plus a separate single-seat 'Mayor'
-- office (is_elected=FALSE, term_length_years=1, filled by internal
-- Council vote -- how_obtained='appointed'). Vice-Mayor, Treasurer,
-- Secretary, and Community Liaison are NOT modeled as separate office
-- rows (same treatment as Falls Church's Vice Mayor and Gaithersburg's
-- Council Vice-President) -- noted in each politician's bio text only.
--
-- Real officeholders live-verified 2026-08-11 (WebFetch of
-- townofchevychase.org/121/Town-Council, cross-checked against the
-- Town's own May 19, 2026 Council meeting minutes -- pdftotext-extracted
-- after WebFetch returned unparsed binary -- and against the Maryland
-- Manual's chevychase/html/c.html and cmayors.html pages, plus the
-- official May 5, 2026 election-results PDF from elections.maryland.gov,
-- also pdftotext-extracted): the May 19, 2026 minutes record newly
-- elected Councilmembers Rich Brancato, Barney Rush, and Joy White taking
-- the oath of office that day, and the Council then voting unanimously to
-- appoint officers: Joy White as Mayor, Barney Rush as Vice-Mayor, Carlo
-- Colella as Treasurer, Rich Brancato as Secretary, and Tambra Leonard as
-- Community Liaison. White/Rush/Brancato were elected to the Council May
-- 5, 2026 (the 3-seat/even-year cycle; official state results: Rush 327
-- votes, White 315, Brancato 313, term to 2028). Colella and Leonard ran
-- unopposed and were elected to the Council May 6, 2025 (the 2-seat/
-- odd-year cycle; term to 2027), sworn in at that cycle's own
-- organizational meeting, confirmed by the Town's own May 2025 Forecast
-- newsletter to have been held May 14, 2025. Rush previously served as
-- Mayor in three separate, non-consecutive stretches per the Maryland
-- Manual's mayoral-history page (2018-2020, 2021-2023, 2025-2026) before
-- the Council chose White in his place May 19, 2026; White herself had
-- earlier served two Council terms through May 2025 per her own farewell
-- note in that month's Town newsletter, before returning to the Council
-- in the 2026 election. No discrepancy found between the Town's own
-- current site, its own primary-source meeting minutes, and the Maryland
-- Manual on the current roster -- all three agree.
--
-- ACCOUNTABILITY: NO recall provision found -- confirmed as a genuine
-- absence, not just an unconfirmed gap: the full charter text (extracted
-- via pdftotext, all 10 articles / 34 sections, cleanly parsed) contains
-- zero instances of "recall" anywhere. Article II Section 210 provides
-- only a citizen REFERENDUM to repeal a newly adopted ordinance (10% of
-- qualified voters petition within 30 days of adoption; majority vote
-- repeals it) -- not a removal mechanism for officeholders. Council
-- vacancies (Section 408) are filled by majority vote of the remaining
-- Councilmembers, not by any citizen-recall or special-election process.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md/place:chevy_chase_town', 'Town of Chevy Chase', 'municipal', 'ocd-division/country:us/state:md/county:montgomery')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('30500000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/place:chevy_chase_town', 'Mayor', 'single', 1, 1, FALSE, FALSE, 'municipal'),
  ('30500000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/place:chevy_chase_town', 'Town Council', 'at_large', 5, 2, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('30500000-0000-4000-8000-000000000101', 'Joy R. White', NULL, '30500000-0000-4000-8000-000000000001', 'Mayor of the Town of Chevy Chase -- chosen unanimously by fellow Councilmembers at the May 19, 2026 organizational meeting. Elected to the Town Council May 5, 2026, term to 2028; previously served two earlier Council terms through May 2025.'),
  ('30500000-0000-4000-8000-000000000102', 'Barney S. Rush', NULL, '30500000-0000-4000-8000-000000000002', 'Vice-Mayor -- chosen by fellow Councilmembers May 19, 2026. Elected to the Town Council May 5, 2026, term to 2028. Previously Mayor in three separate stretches: 2018-2020, 2021-2023, and 2025-2026.'),
  ('30500000-0000-4000-8000-000000000103', 'Richard W. "Rich" Brancato', NULL, '30500000-0000-4000-8000-000000000002', 'Secretary -- chosen by fellow Councilmembers May 19, 2026. Elected to the Town Council May 5, 2026, term to 2028.'),
  ('30500000-0000-4000-8000-000000000104', 'Carlo S. Colella', NULL, '30500000-0000-4000-8000-000000000002', 'Treasurer -- chosen by fellow Councilmembers May 19, 2026. Elected to the Town Council May 6, 2025 (unopposed), term to 2027.'),
  ('30500000-0000-4000-8000-000000000105', 'Tambra A. Leonard', NULL, '30500000-0000-4000-8000-000000000002', 'Community Liaison -- chosen by fellow Councilmembers May 19, 2026. Elected to the Town Council May 6, 2025 (unopposed), term to 2027.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('30500000-0000-4000-8000-000000000002', '30500000-0000-4000-8000-000000000101', '2026-05-19', 'elected'),
  ('30500000-0000-4000-8000-000000000001', '30500000-0000-4000-8000-000000000101', '2026-05-19', 'appointed'),
  ('30500000-0000-4000-8000-000000000002', '30500000-0000-4000-8000-000000000102', '2026-05-19', 'elected'),
  ('30500000-0000-4000-8000-000000000002', '30500000-0000-4000-8000-000000000103', '2026-05-19', 'elected'),
  ('30500000-0000-4000-8000-000000000002', '30500000-0000-4000-8000-000000000104', '2025-05-14', 'elected'),
  ('30500000-0000-4000-8000-000000000002', '30500000-0000-4000-8000-000000000105', '2025-05-14', 'elected');
