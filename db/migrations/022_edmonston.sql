-- Town of Edmonston, MD: fourth of the PG "town" tier (after Cheverly
-- #019, Bladensburg #020, Berwyn Heights #021). Real officeholders
-- live-verified 2026-08-05 against: the Maryland Manual's live page
-- (msa.maryland.gov -- gives every current officeholder with term-
-- expiration year), a WebSearch of the town's own May 4, 2026 election
-- coverage, and the actual Charter of the Town of Edmonston (Maryland
-- General Assembly's 2024 PDF reprint, extracted via pdftotext after
-- WebFetch couldn't parse it -- Sections 4-6 read in full).
--
-- CAUGHT A REAL STALE-NAME DISCREPANCY: an initial aggregated search
-- result named "Tracy Gant" as Mayor (sourced from a Local Government
-- Insurance Trust page, evidently outdated). The town held its regular
-- election May 4, 2026, and BOTH the town's own May-2026 election coverage
-- AND the Maryland Manual's live page independently confirm the current
-- Mayor is Julio A. Maltez, not Gant -- Gant's name is not used anywhere
-- below.
--
-- GOVERNMENT STRUCTURE, directly confirmed from the Charter text (Section
-- 4): "The officers of said town shall consist of a Mayor and four (4)
-- Councilmen, the Mayor to be elected by the combined vote of said town
-- [i.e. at-large], and four (4) Councilmen to be elected, two (2) by each
-- ward." Section 5, also read directly: "the Mayor and Council members
-- shall all be elected at the same time" -- confirming NO staggering (all
-- 5 seats elected together every cycle, unlike Hyattsville/Mount
-- Rainier/Bladensburg) -- consistent with the Maryland Manual showing all
-- 5 current officeholders with the SAME term-expiration year, 2029.
--
-- TERM-START DATE: Charter Section 5, quoted directly: officials elected
-- in a given cycle "take office on the first Monday in June" following
-- the May election, for three-year terms. The May 4, 2026 election's
-- first Monday in June 2026 is June 1, 2026 (June 1, 2026 is itself a
-- Monday) -- used as term_start for all 5 current officeholders, not a
-- guess.
--
-- is_partisan set FALSE by inference: the Charter sections read this pass
-- contain no explicit "nonpartisan" declaration, but also describe no
-- party-designation mechanism of any kind -- consistent with every other
-- Maryland municipality modeled so far, though not as directly confirmed
-- as e.g. Bowie/District Heights' explicit charter language.
--
-- No accountability_pathways row added: Charter Section 6 (read in full)
-- describes only involuntary vacancy via 3-consecutive-meeting absence,
-- resignation, or death, filled by Council appointment or a special
-- election depending on timing -- no citizen recall or petition-based
-- removal mechanism was found. Same already-honest gap as Bowie, College
-- Park, Hyattsville, Laurel, New Carrollton, and Bladensburg.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md/place:edmonston', 'Town of Edmonston', 'municipal', 'ocd-division/country:us/state:md/county:prince_georges')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('14000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/place:edmonston', 'Mayor', 'single', 1, 3, FALSE, TRUE, 'municipal'),
  ('14000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/place:edmonston', 'Town Council — Ward 1', 'district', 2, 3, FALSE, TRUE, 'municipal'),
  ('14000000-0000-4000-8000-000000000003', 'ocd-division/country:us/state:md/place:edmonston', 'Town Council — Ward 2', 'district', 2, 3, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('14000000-0000-4000-8000-000000000101', 'Julio A. Maltez', NULL, '14000000-0000-4000-8000-000000000001', 'Mayor of Edmonston; won the May 4, 2026 election, elected at-large. Term expires 2029.'),
  ('14000000-0000-4000-8000-000000000102', 'Michelle E. Bonilla', NULL, '14000000-0000-4000-8000-000000000002', 'Town Council Ward 1 member; won the May 4, 2026 election. Term expires 2029.'),
  ('14000000-0000-4000-8000-000000000103', 'Cameron A. Sherr', NULL, '14000000-0000-4000-8000-000000000002', 'Town Council Ward 1 member; elected May 4, 2026. Term expires 2029.'),
  ('14000000-0000-4000-8000-000000000104', 'Monique N. Burton', NULL, '14000000-0000-4000-8000-000000000003', 'Town Council Ward 2 member; elected May 4, 2026. Term expires 2029.'),
  ('14000000-0000-4000-8000-000000000105', 'Walter Doyle', NULL, '14000000-0000-4000-8000-000000000003', 'Town Council Ward 2 member; elected May 4, 2026. Term expires 2029.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('14000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000101', '2026-06-01', 'elected'),
  ('14000000-0000-4000-8000-000000000002', '14000000-0000-4000-8000-000000000102', '2026-06-01', 'elected'),
  ('14000000-0000-4000-8000-000000000002', '14000000-0000-4000-8000-000000000103', '2026-06-01', 'elected'),
  ('14000000-0000-4000-8000-000000000003', '14000000-0000-4000-8000-000000000104', '2026-06-01', 'elected'),
  ('14000000-0000-4000-8000-000000000003', '14000000-0000-4000-8000-000000000105', '2026-06-01', 'elected');
