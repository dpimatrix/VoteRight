-- Town of Clifton, VA: third and last of the incorporated VA towns nested
-- inside Fairfax County in this pass (see Vienna #039, Herndon #040).
-- Confirmed live against the real Census geocoder (12641 Chapel Rd,
-- Clifton, VA -> Counties layer resolves to Fairfax County 51/059;
-- Incorporated Places layer separately returns "Clifton town").
-- level='municipal', parent=Fairfax County's own ocd_id.
--
-- STALE-CHARTER CATCH, same pattern already seen at Glenarden/Bladensburg/
-- Forest Heights: the Code of Virginia's own charter reprint
-- (law.lis.virginia.gov/charters/clifton) still describes a July 1
-- take-office date following a first-Tuesday-in-May election. The town's
-- OWN current site instead states the outgoing 2024-2025 council's term
-- ran "1/01/2024-12/31/2025... pursuant to Sec. 2-24 of the Clifton Town
-- Code" -- a calendar-year cycle that has since superseded the charter's
-- July 1 language, and matches the town's real Nov 4, 2025 general
-- election (administered by Fairfax County, same November-cycle shift
-- already seen at Vienna). Trusted the town's own Sec. 2-24 code citation
-- and the actual 2025 election date over the older charter reprint.
--
-- Structure: Mayor (single, at-large) + 5-member Town Council (at-large,
-- charter text: "a mayor and five councilmen"), 2-year terms, nonpartisan.
-- REAL, NOT SMOOTHED OVER: Clifton is a very small town where write-in
-- campaigns regularly decide elections (mirrors a 2014 precedent found in
-- passing, and the town's own outgoing mayor, Tom Peterson, first won the
-- office in Nov 2023 as a write-in candidate against a six-term
-- incumbent). In the Nov 4, 2025 general, Council candidates John L.
-- "Jay" Davis III, Stephen R. "Steve" Effros, and Darrell D. Poe were on
-- the printed ballot; the other two Council seats were won by WRITE-IN
-- candidates Amanda Hencken and John Paul "JP" Hess. Lynn Screen, then a
-- sitting Councilmember, won the Mayor's race outright -- directly
-- confirmed by the town's own Nov 5, 2025 council meeting minutes
-- ("Mayor Peterson congratulated CM Screen as mayor elect"), read via
-- pdftotext after WebFetch returned the PDF as unparsed binary (same
-- technique already used at Cheverly/Bladensburg/Edmonston). Davis is
-- also the Council's chosen Vice Mayor. Term began Jan 1, 2026 per the
-- town's own Sec. 2-24 calendar-year convention; the March 3, 2026
-- meeting minutes independently confirm this same six-person roster still
-- serving. Party affiliation not confirmed for any of the 6 (nonpartisan
-- ballot) -- left NULL rather than guessed.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:va/place:clifton', 'Town of Clifton', 'municipal', 'ocd-division/country:us/state:va/county:fairfax')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('28000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:va/place:clifton', 'Mayor', 'single', 1, 2, FALSE, TRUE, 'municipal'),
  ('28000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:va/place:clifton', 'Town Council', 'at_large', 5, 2, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('28000000-0000-4000-8000-000000000101', 'Lynn Screen', NULL, '28000000-0000-4000-8000-000000000001', 'Mayor of Clifton, elected Nov 4, 2025 while a sitting Councilmember, succeeding Tom Peterson (who did not seek re-election).'),
  ('28000000-0000-4000-8000-000000000102', 'John L. "Jay" Davis III', NULL, '28000000-0000-4000-8000-000000000002', 'Vice Mayor -- chosen by fellow Councilmembers. Town Council member, elected Nov 4, 2025.'),
  ('28000000-0000-4000-8000-000000000103', 'Stephen R. "Steve" Effros', NULL, '28000000-0000-4000-8000-000000000002', 'Town Council member, elected Nov 4, 2025.'),
  ('28000000-0000-4000-8000-000000000104', 'Darrell D. Poe', NULL, '28000000-0000-4000-8000-000000000002', 'Town Council member, elected Nov 4, 2025.'),
  ('28000000-0000-4000-8000-000000000105', 'Amanda Hencken', NULL, '28000000-0000-4000-8000-000000000002', 'Town Council member, won a write-in campaign in the Nov 4, 2025 general -- not on the printed ballot.'),
  ('28000000-0000-4000-8000-000000000106', 'John Paul "JP" Hess', NULL, '28000000-0000-4000-8000-000000000002', 'Town Council member, won a write-in campaign in the Nov 4, 2025 general -- not on the printed ballot.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('28000000-0000-4000-8000-000000000001', '28000000-0000-4000-8000-000000000101', '2026-01-01', 'elected'),
  ('28000000-0000-4000-8000-000000000002', '28000000-0000-4000-8000-000000000102', '2026-01-01', 'elected'),
  ('28000000-0000-4000-8000-000000000002', '28000000-0000-4000-8000-000000000103', '2026-01-01', 'elected'),
  ('28000000-0000-4000-8000-000000000002', '28000000-0000-4000-8000-000000000104', '2026-01-01', 'elected'),
  ('28000000-0000-4000-8000-000000000002', '28000000-0000-4000-8000-000000000105', '2026-01-01', 'elected'),
  ('28000000-0000-4000-8000-000000000002', '28000000-0000-4000-8000-000000000106', '2026-01-01', 'elected');

-- Same Virginia judicial-removal statute used throughout this project.
INSERT INTO accountability_pathways (jurisdiction_id, office_id, mechanism_type, is_binding, legal_citation, signature_requirement_note, description)
SELECT 'ocd-division/country:us/state:va/place:clifton', id, 'municipal_recall', TRUE,
  'Va. Code Ann. § 24.2-230 et seq. (Removal of Public Officers from Office), esp. § 24.2-233',
  '10% of the votes cast in the officer''s last election',
  'Not a ballot-box recall: registered voters petition the Circuit Court for removal on specific statutory grounds (neglect of duty, misuse of office, or certain criminal convictions). A judge, not the electorate, decides whether to remove the officer.'
FROM offices WHERE jurisdiction_id = 'ocd-division/country:us/state:va/place:clifton';
