-- City of Gaithersburg, MD: a second incorporated municipality inside
-- Montgomery County, alongside the existing City of Rockville. Real
-- officeholders live-verified 2026-07-31 (WebSearch against
-- gaithersburgmd.gov, msa.maryland.gov Maryland Manual, and local news
-- covering the Nov 2025 and Nov 2023 municipal elections).
--
-- Structure: Mayor (single, at-large) + 5-member City Council (at-large),
-- both nonpartisan, 4-year staggered terms -- Mayor + 2 Council seats one
-- cycle (last: Nov 4, 2025), the other 3 Council seats the next (last:
-- Nov 7, 2023; next: Nov 2, 2027, unconfirmed against a primary source).
-- No accountability_pathways row added: no verified charter recall/removal
-- citation was found for Gaithersburg specifically (the city's own charter
-- pages 403'd on fetch) -- same already-honest gap that exists for
-- Rockville today, not fabricated here. Revisit if/when that's confirmed.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md/place:gaithersburg', 'City of Gaithersburg', 'municipal', 'ocd-division/country:us/state:md/county:montgomery')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('50000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/place:gaithersburg', 'Mayor', 'single', 1, 4, FALSE, TRUE, 'municipal'),
  ('50000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/place:gaithersburg', 'City Council', 'at_large', 5, 4, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('50000000-0000-4000-8000-000000000101', 'Jud B. Ashman', NULL, '50000000-0000-4000-8000-000000000001', 'Mayor of Gaithersburg; re-elected to a fourth term Nov 4, 2025 (sources disagree whether this is his fourth or third full term -- flagged, not resolved).'),
  ('50000000-0000-4000-8000-000000000102', 'Lisa E. Henderson', NULL, '50000000-0000-4000-8000-000000000002', 'City Council Member, elected Nov 4, 2025.'),
  ('50000000-0000-4000-8000-000000000103', 'James F. McNulty', NULL, '50000000-0000-4000-8000-000000000002', 'City Council Member, elected Nov 4, 2025.'),
  ('50000000-0000-4000-8000-000000000104', 'Neil H. Harris', NULL, '50000000-0000-4000-8000-000000000002', 'City Council Member (Vice-President); elected Nov 7, 2023.'),
  ('50000000-0000-4000-8000-000000000105', 'Yamil O. Hernández', NULL, '50000000-0000-4000-8000-000000000002', 'City Council Member, elected Nov 7, 2023.'),
  ('50000000-0000-4000-8000-000000000106', 'Robert T. Wu', NULL, '50000000-0000-4000-8000-000000000002', 'City Council Member, elected Nov 7, 2023.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('50000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000101', '2025-11-17', 'elected'),
  ('50000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000102', '2025-11-17', 'elected'),
  ('50000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000103', '2025-11-17', 'elected'),
  ('50000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000104', '2023-11-20', 'elected'),
  ('50000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000105', '2023-11-20', 'elected'),
  ('50000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000106', '2023-11-20', 'elected');
