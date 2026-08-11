-- Town of Vienna, VA: the first of three incorporated TOWNS still inside
-- Fairfax County (unlike Alexandria/City of Fairfax/Falls Church, which are
-- independent cities and were pulled OUT of any county entirely under
-- Virginia law). Confirmed live against the real Census geocoder (127
-- Center St S, Vienna, VA -> Counties layer resolves to Fairfax County,
-- 51/059; Incorporated Places layer separately returns "Vienna town") --
-- same nested-municipality pattern as Rockville/Gaithersburg inside
-- Montgomery County. level='municipal', parent=Fairfax County's own ocd_id.
--
-- STRUCTURE, GENUINELY DIFFERENT FROM VIENNA'S OWN RECENT PAST: Mayor
-- (single, at-large) + 6-member Town Council (at-large), 2-year terms,
-- nonpartisan ballot. Council terms used to be staggered, but a Virginia
-- law change moved town elections from May to November and Vienna's own
-- cycle has since synchronized -- all 7 seats (Mayor + 6 Council) are now
-- on the same ballot together every 2 years, confirmed by the Nov 2025
-- election electing the whole slate at once (Mayor Colbert unopposed + 6
-- Council winners). Real officeholders live-verified 2026-08-11
-- (WebSearch against Patch's live 2025 election-night coverage and the
-- town's own Jan 2, 2026 swearing-in notice): Mayor Linda Colbert
-- (re-elected unopposed) + returning Councilmembers Chuck Anderson, Roy
-- Baldwin, Jessica Ramakis, Howard Springsteen + new members Doug Francis
-- and Dann Nash, all sworn in Jan 2, 2026. Party affiliation not confirmed
-- for any of the 7 in this pass (nonpartisan ballot, no clean source
-- found) -- left NULL rather than guessed.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:va/place:vienna', 'Town of Vienna', 'municipal', 'ocd-division/country:us/state:va/county:fairfax')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('26000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:va/place:vienna', 'Mayor', 'single', 1, 2, FALSE, TRUE, 'municipal'),
  ('26000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:va/place:vienna', 'Town Council', 'at_large', 6, 2, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('26000000-0000-4000-8000-000000000101', 'Linda Colbert', NULL, '26000000-0000-4000-8000-000000000001', 'Mayor of Vienna, re-elected unopposed Nov 2025.'),
  ('26000000-0000-4000-8000-000000000102', 'Chuck Anderson', NULL, '26000000-0000-4000-8000-000000000002', 'Town Council member, re-elected Nov 2025.'),
  ('26000000-0000-4000-8000-000000000103', 'Roy Baldwin', NULL, '26000000-0000-4000-8000-000000000002', 'Town Council member, re-elected Nov 2025.'),
  ('26000000-0000-4000-8000-000000000104', 'Jessica Ramakis', NULL, '26000000-0000-4000-8000-000000000002', 'Town Council member, re-elected Nov 2025.'),
  ('26000000-0000-4000-8000-000000000105', 'Howard Springsteen', NULL, '26000000-0000-4000-8000-000000000002', 'Town Council member, re-elected Nov 2025.'),
  ('26000000-0000-4000-8000-000000000106', 'Doug Francis', NULL, '26000000-0000-4000-8000-000000000002', 'Town Council member, elected Nov 2025.'),
  ('26000000-0000-4000-8000-000000000107', 'Dann Nash', NULL, '26000000-0000-4000-8000-000000000002', 'Town Council member, elected Nov 2025.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('26000000-0000-4000-8000-000000000001', '26000000-0000-4000-8000-000000000101', '2026-01-02', 'elected'),
  ('26000000-0000-4000-8000-000000000002', '26000000-0000-4000-8000-000000000102', '2026-01-02', 'elected'),
  ('26000000-0000-4000-8000-000000000002', '26000000-0000-4000-8000-000000000103', '2026-01-02', 'elected'),
  ('26000000-0000-4000-8000-000000000002', '26000000-0000-4000-8000-000000000104', '2026-01-02', 'elected'),
  ('26000000-0000-4000-8000-000000000002', '26000000-0000-4000-8000-000000000105', '2026-01-02', 'elected'),
  ('26000000-0000-4000-8000-000000000002', '26000000-0000-4000-8000-000000000106', '2026-01-02', 'elected'),
  ('26000000-0000-4000-8000-000000000002', '26000000-0000-4000-8000-000000000107', '2026-01-02', 'elected');

-- Same Virginia judicial-removal statute already used throughout this
-- project -- Title 24.2's removal-of-officers article applies to any
-- officer elected by the people statewide, towns included.
INSERT INTO accountability_pathways (jurisdiction_id, office_id, mechanism_type, is_binding, legal_citation, signature_requirement_note, description)
SELECT 'ocd-division/country:us/state:va/place:vienna', id, 'municipal_recall', TRUE,
  'Va. Code Ann. § 24.2-230 et seq. (Removal of Public Officers from Office), esp. § 24.2-233',
  '10% of the votes cast in the officer''s last election',
  'Not a ballot-box recall: registered voters petition the Circuit Court for removal on specific statutory grounds (neglect of duty, misuse of office, or certain criminal convictions). A judge, not the electorate, decides whether to remove the officer.'
FROM offices WHERE jurisdiction_id = 'ocd-division/country:us/state:va/place:vienna';
