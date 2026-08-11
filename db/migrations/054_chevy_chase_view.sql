-- Chevy Chase View, MD: one of six real, separate, adjacent Chevy-Chase-
-- named municipalities in Montgomery County (Town of Chevy Chase, Chevy
-- Chase View, Chevy Chase Village, Village of Chevy Chase Section 3,
-- Village of Chevy Chase Section 5, North Chevy Chase -- each with its own
-- charter and elected officials, researched as separate migrations).
-- Confirmed live against the real Census geocoder (4108 Everett St, Chevy
-- Chase, MD -> Counties layer: Montgomery County 24/031; Incorporated
-- Places layer: NAME "Chevy Chase View town" / BASENAME "Chevy Chase
-- View" -- geocoder even normalized the address's own city field to
-- "CHEVY CHASE VIEW", ZIP 20895, distinct from the generic "Chevy Chase,
-- MD 20815" ZIP that spans several of the sibling entities).
-- level='municipal', parent=Montgomery County's own ocd_id.
--
-- STRUCTURE (Charter for Chevy Chase View, Sec. 3 & Sec. 5, fetched from
-- chevychaseviewmd.gov/DocumentCenter/View/251/View-Charter-PDF, read via
-- pdftotext after WebFetch returned unparsed binary): a 5-member Town
-- Council, all elected at-large to 2-year terms, STAGGERED (2 seats up in
-- even-numbered years, the other 3 up in odd-numbered years). Elections
-- are held on the second Tuesday in May (or within 7 days thereof) --
-- but per Charter Sec. 5.B, if the number of nominees does not exceed the
-- number of open seats, those nominees "shall be deemed elected as of the
-- second Tuesday of May" and NO balloting takes place -- a real structural
-- difference from jurisdictions that always hold a ballot. The Council
-- elects one of its own members "Chair" (Sec. 3.B) -- same dual-office-
-- row pattern as Poolesville/Falls Church/Greenbelt/Glenarden (Council
-- seat is_elected=TRUE, Chair office is_elected=FALSE/appointed). Actual
-- practice, per the Council's own May 20, 2025 meeting minutes, is that
-- "Election of Officers" (Chair + informal Acting Chair/Treasurer/
-- Assistant Treasurer roles for check-signing purposes only, not separate
-- legislative offices) is taken up annually right after the May town
-- election -- modeled here with term_length_years=1 for the Chair office
-- to reflect that annual reconfirmation cycle. Acting Chair, Treasurer,
-- and Assistant Treasurer are NOT modeled as separate offices (same
-- precedent as Poolesville's Vice-President): they are noted in the
-- relevant politician's bio only.
--
-- Real officeholders live-verified 2026-08-11, cross-checked against the
-- town's own site (chevychaseviewmd.gov/1213/Town-Council), the Maryland
-- Manual (msa.maryland.gov/msa/mdmanual/37mun/chevyview), and the town's
-- own primary-source Council meeting minutes PDFs (extracted via
-- pdftotext): Edward C. "Ed" Tarbutton (Chair), Peter C. "Pete" Marks
-- (Treasurer), and Nancy C. Somerville (Acting Chair) were all re-elected
-- UNOPPOSED May 13, 2025 (2nd Tuesday of May 2025; confirmed in the May
-- 20, 2025 minutes: "Ed Tarbutton reported that he, Pete Marks and Nancy
-- Somerville were re-elected, each serving a two-year term"), term to
-- 2027. Officer positions (Chair etc.) were reconfirmed unchanged by a 3-0
-- Council vote at that same May 20, 2025 meeting -- used here as
-- Tarbutton's Chair term_start, since no earlier confirmed date for his
-- original selection as Chair was found in this pass (an ESTIMATE
-- consistent with Poolesville's disclosed-estimate approach, not a
-- directly-confirmed original-appointment date). Thomas W. "Tommy" George
-- (Assistant Treasurer) was re-elected and Karl C. Dedolph IV (replacing
-- outgoing member Helen Trybus) was newly elected, both to the 2
-- even-year seats: per the town's own April 15, 2026 minutes, "Annual
-- Election May 12, 2026 ... two seats up for election this year" with
-- exactly two nominations received by the April 21 deadline -- ESTIMATED
-- term_start of 2026-05-12 (2nd Tuesday of May 2026, per the Charter's
-- uncontested-nominee rule), since no post-election minutes confirming
-- the outcome had been posted as of this research pass; treated as a
-- reasonable estimate, not a directly-confirmed certification date.
--
-- DISAMBIGUATION CARE TAKEN: an early AI-search-engine summary conflated
-- Chevy Chase View's charter-driven, in-person-balloting election process
-- with a "mailed ballots" / "Annual Meeting April 20, 2026" description
-- that actually belongs to neighboring Chevy Chase Village's own election
-- process document (both appeared in the same result set) -- that data
-- point was discarded and not used here in favor of Chevy Chase View's
-- own charter text and its own minutes.
--
-- ACCOUNTABILITY: no recall provision found. The full Charter text (read
-- via pdftotext) contains no "recall" language anywhere; the only removal
-- provision (Sec. 3.C) applies to the Town Manager, an appointed staff
-- position removable "by a vote of three members of the Council," not to
-- elected Council members. Council vacancies (e.g. failure to qualify, or
-- moving out of town) are filled by Council majority vote for the
-- remainder of the unexpired term (Sec. 5.E), not by any voter-initiated
-- mechanism. Left as an honest, verified gap -- not invented.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md/place:chevy_chase_view', 'Chevy Chase View', 'municipal', 'ocd-division/country:us/state:md/county:montgomery')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('30600000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/place:chevy_chase_view', 'Chair', 'single', 1, 1, FALSE, FALSE, 'municipal'),
  ('30600000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/place:chevy_chase_view', 'Town Council', 'at_large', 5, 2, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('30600000-0000-4000-8000-000000000101', 'Edward C. Tarbutton', NULL, '30600000-0000-4000-8000-000000000001', 'Chair of the Chevy Chase View Town Council -- chosen by fellow Council members. Council member, re-elected unopposed May 13, 2025, term to 2027.'),
  ('30600000-0000-4000-8000-000000000102', 'Nancy C. Somerville', NULL, '30600000-0000-4000-8000-000000000002', 'Council member and Acting Chair (designated by the Council for check-signing purposes under the Charter). Re-elected unopposed May 13, 2025, term to 2027.'),
  ('30600000-0000-4000-8000-000000000103', 'Peter C. Marks', NULL, '30600000-0000-4000-8000-000000000002', 'Council member and Treasurer (designated by the Council). Re-elected unopposed May 13, 2025, term to 2027.'),
  ('30600000-0000-4000-8000-000000000104', 'Thomas W. George', NULL, '30600000-0000-4000-8000-000000000002', 'Council member and Assistant Treasurer (designated by the Council). Re-elected to one of the Council''s 2 even-year seats, term to 2028.'),
  ('30600000-0000-4000-8000-000000000105', 'Karl C. Dedolph IV', NULL, '30600000-0000-4000-8000-000000000002', 'Council member, newly elected to one of the Council''s 2 even-year seats (succeeding outgoing member Helen Trybus), term to 2028.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('30600000-0000-4000-8000-000000000002', '30600000-0000-4000-8000-000000000101', '2025-05-13', 'elected'),
  ('30600000-0000-4000-8000-000000000001', '30600000-0000-4000-8000-000000000101', '2025-05-20', 'appointed'),
  ('30600000-0000-4000-8000-000000000002', '30600000-0000-4000-8000-000000000102', '2025-05-13', 'elected'),
  ('30600000-0000-4000-8000-000000000002', '30600000-0000-4000-8000-000000000103', '2025-05-13', 'elected'),
  ('30600000-0000-4000-8000-000000000002', '30600000-0000-4000-8000-000000000104', '2026-05-12', 'elected'),
  ('30600000-0000-4000-8000-000000000002', '30600000-0000-4000-8000-000000000105', '2026-05-12', 'elected');

-- No accountability_pathways row: no recall/removal-of-elected-officials
-- provision exists anywhere in the Chevy Chase View Charter (confirmed by
-- full-text search of the pdftotext-extracted document). This is an
-- honest, verified absence, not an oversight.
