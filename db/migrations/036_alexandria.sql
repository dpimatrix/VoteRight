-- City of Alexandria, VA: an independent city -- under Virginia's independent-
-- city system it is NOT part of any county (unlike a Virginia "town", which
-- stays inside its county). It is its own county-equivalent, structurally the
-- same tier as Fairfax County, Arlington County, or D.C. in this schema:
-- level='county', parented directly to the Virginia state row, with its own
-- Census FIPS pair. Confirmed LIVE against the real Census geocoder
-- (301 King St, Alexandria, VA -> Counties layer: STATE=51, COUNTY=510,
-- NAME="Alexandria city") -- not looked up from a static table.
--
-- Structure: Mayor (single, at-large) + 6-member City Council (at-large),
-- both officially nonpartisan on the ballot (same VA-wide convention already
-- used for Fairfax/Arlington), 3-year terms. All current officeholders
-- live-verified 2026-08-11 (WebSearch/WebFetch against alexandriava.gov,
-- Virginia's historical elections database, ALXnow, and the Zebra) against
-- the Nov 5, 2024 general (6 Council seats + separately-elected Mayor) plus
-- an April 21, 2026 special election.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id, state_fips, county_fips) VALUES
  ('ocd-division/country:us/state:va/place:alexandria', 'City of Alexandria', 'county', 'ocd-division/country:us/state:va', '51', '510')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('23000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:va/place:alexandria', 'Mayor', 'single', 1, 3, FALSE, TRUE, 'county'),
  ('23000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:va/place:alexandria', 'City Council', 'at_large', 6, 3, FALSE, TRUE, 'county');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('23000000-0000-4000-8000-000000000101', 'Alyia Gaskins', 'D', '23000000-0000-4000-8000-000000000001', 'Mayor of Alexandria, elected unopposed Nov 5, 2024; first Black woman elected Mayor of Alexandria. Served on City Council 2021-2024.'),
  ('23000000-0000-4000-8000-000000000102', 'Sarah R. Bagley', 'D', '23000000-0000-4000-8000-000000000002', 'Vice Mayor -- the Council seat with the most votes becomes Vice Mayor. On Council since 2021.'),
  ('23000000-0000-4000-8000-000000000103', 'Canek Aguirre', 'D', '23000000-0000-4000-8000-000000000002', 'Council member since 2018; first Latino elected to Alexandria City Council.'),
  ('23000000-0000-4000-8000-000000000104', 'John Taylor Chapman', 'D', '23000000-0000-4000-8000-000000000002', 'Council member since 2012.'),
  ('23000000-0000-4000-8000-000000000105', 'Abdel-Rahman Elnoubi', 'D', '23000000-0000-4000-8000-000000000002', 'Council member, elected Nov 5, 2024; previously an Alexandria School Board member.'),
  ('23000000-0000-4000-8000-000000000106', 'Jacinta E. Greene', 'D', '23000000-0000-4000-8000-000000000002', 'Council member, elected Nov 5, 2024; previously an Alexandria School Board member.'),
  ('23000000-0000-4000-8000-000000000107', 'Sandy O. Marks', 'D', '23000000-0000-4000-8000-000000000002', 'Council member, won an April 21, 2026 special election to fill the remainder of R. Kirk McPike''s term after he resigned to run for the Virginia House of Delegates (District 5); her win gave Alexandria its first-ever female-majority City Council. Serves through Dec 31, 2027, same as the rest of the 2024 cohort.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('23000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000101', '2025-01-02', 'elected'),
  ('23000000-0000-4000-8000-000000000002', '23000000-0000-4000-8000-000000000102', '2025-01-02', 'elected'),
  ('23000000-0000-4000-8000-000000000002', '23000000-0000-4000-8000-000000000103', '2025-01-02', 'elected'),
  ('23000000-0000-4000-8000-000000000002', '23000000-0000-4000-8000-000000000104', '2025-01-02', 'elected'),
  ('23000000-0000-4000-8000-000000000002', '23000000-0000-4000-8000-000000000105', '2025-01-02', 'elected'),
  ('23000000-0000-4000-8000-000000000002', '23000000-0000-4000-8000-000000000106', '2025-01-02', 'elected'),
  ('23000000-0000-4000-8000-000000000002', '23000000-0000-4000-8000-000000000107', '2026-05-12', 'elected');

-- Same Virginia judicial-removal statute already used for Fairfax/Arlington
-- (it's state law, applying identically to every VA locality including
-- independent cities) -- NOT a ballot-box recall.
INSERT INTO accountability_pathways (jurisdiction_id, office_id, mechanism_type, is_binding, legal_citation, signature_requirement_note, description)
SELECT 'ocd-division/country:us/state:va/place:alexandria', id, 'municipal_recall', TRUE,
  'Va. Code Ann. § 24.2-230 et seq. (Removal of Public Officers from Office), esp. § 24.2-233',
  '10% of the votes cast in the officer''s last election',
  'Not a ballot-box recall: registered voters petition the Circuit Court for removal on specific statutory grounds (neglect of duty, misuse of office, or certain criminal convictions). A judge, not the electorate, decides whether to remove the officer.'
FROM offices WHERE jurisdiction_id = 'ocd-division/country:us/state:va/place:alexandria';
