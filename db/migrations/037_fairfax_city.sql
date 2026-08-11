-- City of Fairfax, VA: an independent city, and -- despite sharing a name --
-- a COMPLETELY SEPARATE jurisdiction from Fairfax County (migration 004/005).
-- Confirmed live against the real Census geocoder (10455 Armstrong St,
-- Fairfax, VA -> Counties layer: STATE=51, COUNTY=600, NAME="Fairfax city")
-- -- a distinct FIPS pair from Fairfax County's 51/059, so the two can never
-- be confused by the app's geocoder-driven resolver. Same independent-city
-- tier as Alexandria (migration 036): level='county', parented directly to
-- the Virginia state row, own ocd_id 'place:fairfax' (deliberately distinct
-- from Fairfax County's 'county:fairfax').
--
-- Structure: Mayor (single, at-large) + 6-member City Council (at-large),
-- all elected TOGETHER every 2 years (no staggering, unlike Gaithersburg),
-- officially nonpartisan ballot (same VA-wide convention). Current
-- officeholders live-verified 2026-08-11 (WebSearch against the Nov 5, 2024
-- general election results, Connection Newspapers' swearing-in coverage,
-- and Mayor Read's own bio) -- fairfaxva.gov itself 403'd on every fetch
-- attempt (WebFetch), same access pattern already seen at Berwyn Heights.
-- Party affiliation only recorded where independently confirmed (Read is a
-- named Democratic Party activist); the 6 Council members' affiliations
-- were not found in this pass and are left NULL rather than guessed --
-- same discipline as Fairfax County's own Sizemore Heizer/Bierman/Jimenez.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id, state_fips, county_fips) VALUES
  ('ocd-division/country:us/state:va/place:fairfax', 'City of Fairfax', 'county', 'ocd-division/country:us/state:va', '51', '600')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('24000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:va/place:fairfax', 'Mayor', 'single', 1, 2, FALSE, TRUE, 'county'),
  ('24000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:va/place:fairfax', 'City Council', 'at_large', 6, 2, FALSE, TRUE, 'county');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('24000000-0000-4000-8000-000000000101', 'Catherine S. Read', 'D', '24000000-0000-4000-8000-000000000001', 'Mayor of the City of Fairfax; first woman elected Mayor (2022), re-elected Nov 5, 2024 to a second 2-year term. Has said she will not seek a third term in the Nov 2026 election.'),
  ('24000000-0000-4000-8000-000000000102', 'Stacy R. Hall', NULL, '24000000-0000-4000-8000-000000000002', 'City Council member, elected Nov 5, 2024.'),
  ('24000000-0000-4000-8000-000000000103', 'Thomas D. "Tom" Peterson', NULL, '24000000-0000-4000-8000-000000000002', 'City Council member, elected Nov 5, 2024.'),
  ('24000000-0000-4000-8000-000000000104', 'Billy M. Bates', NULL, '24000000-0000-4000-8000-000000000002', 'City Council member; the one incumbent returning from the prior council.'),
  ('24000000-0000-4000-8000-000000000105', 'Stacey D. Hardy-Chandler', NULL, '24000000-0000-4000-8000-000000000002', 'City Council member, elected Nov 5, 2024; first African American woman to serve on the Fairfax City Council.'),
  ('24000000-0000-4000-8000-000000000106', 'Anthony T. Amos', NULL, '24000000-0000-4000-8000-000000000002', 'City Council member, elected Nov 5, 2024.'),
  ('24000000-0000-4000-8000-000000000107', 'Rachel M. McQuillen', NULL, '24000000-0000-4000-8000-000000000002', 'City Council member, elected Nov 5, 2024.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('24000000-0000-4000-8000-000000000001', '24000000-0000-4000-8000-000000000101', '2025-01-14', 'elected'),
  ('24000000-0000-4000-8000-000000000002', '24000000-0000-4000-8000-000000000102', '2025-01-14', 'elected'),
  ('24000000-0000-4000-8000-000000000002', '24000000-0000-4000-8000-000000000103', '2025-01-14', 'elected'),
  ('24000000-0000-4000-8000-000000000002', '24000000-0000-4000-8000-000000000104', '2025-01-14', 'elected'),
  ('24000000-0000-4000-8000-000000000002', '24000000-0000-4000-8000-000000000105', '2025-01-14', 'elected'),
  ('24000000-0000-4000-8000-000000000002', '24000000-0000-4000-8000-000000000106', '2025-01-14', 'elected'),
  ('24000000-0000-4000-8000-000000000002', '24000000-0000-4000-8000-000000000107', '2025-01-14', 'elected');

-- Same Virginia judicial-removal statute already used for Fairfax County/
-- Arlington/Alexandria (state law, applies identically to every VA locality).
INSERT INTO accountability_pathways (jurisdiction_id, office_id, mechanism_type, is_binding, legal_citation, signature_requirement_note, description)
SELECT 'ocd-division/country:us/state:va/place:fairfax', id, 'municipal_recall', TRUE,
  'Va. Code Ann. § 24.2-230 et seq. (Removal of Public Officers from Office), esp. § 24.2-233',
  '10% of the votes cast in the officer''s last election',
  'Not a ballot-box recall: registered voters petition the Circuit Court for removal on specific statutory grounds (neglect of duty, misuse of office, or certain criminal convictions). A judge, not the electorate, decides whether to remove the officer.'
FROM offices WHERE jurisdiction_id = 'ocd-division/country:us/state:va/place:fairfax';
