-- Town of Kensington, MD: third of Montgomery County's remaining
-- municipalities. Confirmed live against the real Census geocoder (3710
-- Mitchell St, Kensington, MD -> Counties layer: Montgomery County 24/031;
-- Incorporated Places layer: "Kensington town"). level='municipal',
-- parent=Montgomery County's own ocd_id. (Note: "North Kensington" and
-- "South Kensington" are nearby unincorporated place names, not separate
-- municipal governments -- no collision risk with the incorporated town.)
--
-- Structure: Mayor (single, at-large) + 4-member Council (at-large), all
-- on STAGGERED 2-year terms with elections held every June (not November)
-- -- genuinely unusual cadence, confirmed by the town's own Mayor & Council
-- page listing each officeholder's full multi-cycle election history.
-- Real officeholders live-verified 2026-08-11 (WebSearch/WebFetch against
-- tok.md.gov): Mayor Tracey C. Furman + Councilmembers Nathan L. "Nate"
-- Engle and Ann M. Lichter all most recently re-elected (running
-- unopposed) at the June 1, 2026 town election, term to 2028;
-- Councilmembers Conor D. Crimmins and Stuart C. Sparker most recently
-- elected at the June 2, 2025 town election, term to 2027. No recall/
-- removal provision was found for Kensington specifically in this pass
-- (the town's own Charter-and-Code page links out to a PDF that could not
-- be read) -- left as an honest unconfirmed gap, same as Rockville/
-- Gaithersburg/Berwyn Heights, rather than assumed absent.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md/place:kensington', 'Town of Kensington', 'municipal', 'ocd-division/country:us/state:md/county:montgomery')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('2b000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/place:kensington', 'Mayor', 'single', 1, 2, FALSE, TRUE, 'municipal'),
  ('2b000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/place:kensington', 'Town Council', 'at_large', 4, 2, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('2b000000-0000-4000-8000-000000000101', 'Tracey C. Furman', NULL, '2b000000-0000-4000-8000-000000000001', 'Mayor of Kensington, re-elected unopposed at the June 1, 2026 town election (term to 2028), first elected 2016.'),
  ('2b000000-0000-4000-8000-000000000102', 'Conor D. Crimmins', NULL, '2b000000-0000-4000-8000-000000000002', 'Town Council member, elected at the June 2, 2025 town election (term to 2027).'),
  ('2b000000-0000-4000-8000-000000000103', 'Stuart C. Sparker', NULL, '2b000000-0000-4000-8000-000000000002', 'Town Council member, elected at the June 2, 2025 town election (term to 2027).'),
  ('2b000000-0000-4000-8000-000000000104', 'Nathan L. "Nate" Engle', NULL, '2b000000-0000-4000-8000-000000000002', 'Town Council member, re-elected unopposed at the June 1, 2026 town election (term to 2028).'),
  ('2b000000-0000-4000-8000-000000000105', 'Ann M. Lichter', NULL, '2b000000-0000-4000-8000-000000000002', 'Town Council member, re-elected unopposed at the June 1, 2026 town election (term to 2028).');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('2b000000-0000-4000-8000-000000000001', '2b000000-0000-4000-8000-000000000101', '2026-06-01', 'elected'),
  ('2b000000-0000-4000-8000-000000000002', '2b000000-0000-4000-8000-000000000102', '2025-06-02', 'elected'),
  ('2b000000-0000-4000-8000-000000000002', '2b000000-0000-4000-8000-000000000103', '2025-06-02', 'elected'),
  ('2b000000-0000-4000-8000-000000000002', '2b000000-0000-4000-8000-000000000104', '2026-06-01', 'elected'),
  ('2b000000-0000-4000-8000-000000000002', '2b000000-0000-4000-8000-000000000105', '2026-06-01', 'elected');
