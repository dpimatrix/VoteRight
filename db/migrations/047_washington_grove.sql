-- Town of Washington Grove, MD: sixth of Montgomery County's remaining
-- municipalities. Confirmed live against the real Census geocoder (300
-- Grove Ave, Washington Grove, MD -> Counties layer: Montgomery County
-- 24/031; Incorporated Places layer: "Washington Grove town").
-- level='municipal', parent=Montgomery County's own ocd_id.
--
-- Structure, genuinely distinctive: Mayor serves a ONE-YEAR term (the
-- shortest of any elected office modeled anywhere in this project so
-- far); the 6-member Council serves staggered THREE-year terms (2 seats
-- per year). Elections are held every year on the second Saturday of
-- May -- directly confirmed both by the town's own site ("Mayors are
-- elected to one-year terms... Councilors are elected to three-year
-- terms... elections... on the second Saturday of May") and by reading
-- (via the Read tool's vision capability, the scanned 2025 Certificate
-- of Election Results PDF -- WebFetch/pdftotext both failed on this
-- image-based PDF) the actual May 10, 2025 election certificate, which
-- independently confirms the rule for that year. Real officeholders
-- live-verified 2026-08-11: Mayor John G. Compton (a long-tenured mayor,
-- previously serving 1999-2008 before returning in 2018) elected May 9,
-- 2026 (term to 2027); Mayor Pro Tem Barbara A. Raimondo and Kriss K.
-- Grisham elected May 11, 2024 (term to 2027); John F. Porter and Mary
-- E. Warfield elected May 10, 2025, DIRECTLY CONFIRMED via the
-- certificate (term to 2028); Peter D. Nagrod and Nicholas A. Patrone
-- elected May 9, 2026 alongside the Mayor (term to 2029). Term-
-- expiration years per the Maryland Manual's own Washington Grove page;
-- the 2024 and 2026 exact election dates are computed from the
-- confirmed "second Saturday of May" rule (cross-validated against the
-- one directly-documented year, 2025) rather than independently sourced
-- for those specific years. No recall provision was found for
-- Washington Grove in this pass -- left as an honest unconfirmed gap,
-- not assumed absent (unlike Garrett Park, where the full charter text
-- was actually read and confirmed to lack one).

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md/place:washington_grove', 'Town of Washington Grove', 'municipal', 'ocd-division/country:us/state:md/county:montgomery')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('2e000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/place:washington_grove', 'Mayor', 'single', 1, 1, FALSE, TRUE, 'municipal'),
  ('2e000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/place:washington_grove', 'Town Council', 'at_large', 6, 3, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('2e000000-0000-4000-8000-000000000101', 'John G. Compton', NULL, '2e000000-0000-4000-8000-000000000001', 'Mayor of Washington Grove, elected May 9, 2026 to a one-year term. Previously Mayor 1999-2008; returned to the office in 2018.'),
  ('2e000000-0000-4000-8000-000000000102', 'Barbara A. Raimondo', NULL, '2e000000-0000-4000-8000-000000000002', 'Mayor Pro Tem. Town Council member, elected May 11, 2024, term to 2027.'),
  ('2e000000-0000-4000-8000-000000000103', 'Kriss K. Grisham', NULL, '2e000000-0000-4000-8000-000000000002', 'Town Council member, elected May 11, 2024, term to 2027.'),
  ('2e000000-0000-4000-8000-000000000104', 'John F. Porter', NULL, '2e000000-0000-4000-8000-000000000002', 'Town Council member, elected May 10, 2025, term to 2028.'),
  ('2e000000-0000-4000-8000-000000000105', 'Mary E. Warfield', NULL, '2e000000-0000-4000-8000-000000000002', 'Town Council member, elected May 10, 2025, term to 2028.'),
  ('2e000000-0000-4000-8000-000000000106', 'Peter D. Nagrod', NULL, '2e000000-0000-4000-8000-000000000002', 'Town Council member, elected May 9, 2026, term to 2029.'),
  ('2e000000-0000-4000-8000-000000000107', 'Nicholas A. Patrone', NULL, '2e000000-0000-4000-8000-000000000002', 'Town Council member, elected May 9, 2026, term to 2029.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('2e000000-0000-4000-8000-000000000001', '2e000000-0000-4000-8000-000000000101', '2026-05-09', 'elected'),
  ('2e000000-0000-4000-8000-000000000002', '2e000000-0000-4000-8000-000000000102', '2024-05-11', 'elected'),
  ('2e000000-0000-4000-8000-000000000002', '2e000000-0000-4000-8000-000000000103', '2024-05-11', 'elected'),
  ('2e000000-0000-4000-8000-000000000002', '2e000000-0000-4000-8000-000000000104', '2025-05-10', 'elected'),
  ('2e000000-0000-4000-8000-000000000002', '2e000000-0000-4000-8000-000000000105', '2025-05-10', 'elected'),
  ('2e000000-0000-4000-8000-000000000002', '2e000000-0000-4000-8000-000000000106', '2026-05-09', 'elected'),
  ('2e000000-0000-4000-8000-000000000002', '2e000000-0000-4000-8000-000000000107', '2026-05-09', 'elected');
