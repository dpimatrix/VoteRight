-- D6 gap #6 (owner decision 2026-08-12: just the 6 federal delegates, not
-- full territorial governments): the District of Columbia and the 5 U.S.
-- territories -- Puerto Rico, Guam, American Samoa, the Northern Mariana
-- Islands, and the U.S. Virgin Islands -- each elect a real, popularly
-- elected non-voting member of the U.S. House. This completes federal
-- representation the same way the 50 states are already complete (D6
-- federal tier, migration 908b3ff/2d68153 era) -- these 6 people were the
-- only piece explicitly deferred at the time ("D.C./territories'
-- non-voting delegates are naturally skipped for now since they have no
-- jurisdiction row yet to attach to").
--
-- Sourced directly from the Congress.gov API (same primary source, same
-- 119th Congress, same live-verified discipline as the original 531
-- members in migration 2d68153) rather than memory or search -- confirmed
-- live 2026-08-12: Eleanor Holmes Norton (DC), Pablo Jose Hernández (PR),
-- James C. Moylan (Guam), Kimberlyn King-Hinds (Northern Mariana
-- Islands), Aumua Amata Coleman Radewagen (American Samoa), Stacey E.
-- Plaskett (Virgin Islands).
--
-- Puerto Rico's seat is genuinely a different office, not a data
-- inconsistency: it's titled "Resident Commissioner," not "Delegate,"
-- and serves a 4-year term (aligned with presidential elections) instead
-- of the 2-year term every other non-voting House member serves --
-- modeled with term_length_years=4 for that one office, 2 for the other
-- five.
--
-- New jurisdiction rows for the 5 territories (D.C.'s jurisdiction row
-- already exists from earlier work) -- FIPS codes cross-checked against
-- the same www2.census.gov/geo/docs/reference/state.txt reference used
-- for the original 50-state seed (migration 059): American Samoa 60,
-- Guam 66, Northern Mariana Islands 69, Puerto Rico 72, U.S. Virgin
-- Islands 78. Modeled at level='county' with no parent, same as D.C.'s
-- existing row -- this schema's jurisdictions.level CHECK constraint has
-- no dedicated 'territory' value, and 'county' is the closest existing
-- fit for "top-level self-governing jurisdiction with no state parent."
--
-- Deliberately NOT included, per the owner's explicit scope decision:
-- territorial governors, legislatures, or any other local territorial
-- government -- a separate, much larger body of work (a mini state-level
-- build repeated 5 times), not part of this pre-deploy pass.
--
-- term_start uses the same convention as the original Congress ingester
-- (January 3 of the member's most recent listed term-start year, the
-- constitutionally mandated day a new Congress convenes) -- exact for
-- members newly elected in 2025 (PR, MP), a disclosed approximation for
-- longer-serving members (DC: 1991, VI: 2015, AS: 2015, Guam: 2023) whose
-- CURRENT term technically began January 2025 with the 119th Congress,
-- not their first-ever election -- same imprecision already disclosed
-- and accepted for the original 531-member ingestion.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id, state_fips, county_fips) VALUES
  ('ocd-division/country:us/territory:pr', 'Puerto Rico', 'county', NULL, '72', '000'),
  ('ocd-division/country:us/territory:gu', 'Guam', 'county', NULL, '66', '000'),
  ('ocd-division/country:us/territory:as', 'American Samoa', 'county', NULL, '60', '000'),
  ('ocd-division/country:us/territory:mp', 'Northern Mariana Islands', 'county', NULL, '69', '000'),
  ('ocd-division/country:us/territory:vi', 'U.S. Virgin Islands', 'county', NULL, '78', '000');

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('4c000000-0000-4000-8000-000000000001', 'ocd-division/country:us/district:dc', 'Delegate to the U.S. House', 'single', 1, 2, TRUE, TRUE, 'federal'),
  ('4c000000-0000-4000-8000-000000000002', 'ocd-division/country:us/territory:pr', 'Resident Commissioner', 'single', 1, 4, TRUE, TRUE, 'federal'),
  ('4c000000-0000-4000-8000-000000000003', 'ocd-division/country:us/territory:gu', 'Delegate to the U.S. House', 'single', 1, 2, TRUE, TRUE, 'federal'),
  ('4c000000-0000-4000-8000-000000000004', 'ocd-division/country:us/territory:as', 'Delegate to the U.S. House', 'single', 1, 2, TRUE, TRUE, 'federal'),
  ('4c000000-0000-4000-8000-000000000005', 'ocd-division/country:us/territory:mp', 'Delegate to the U.S. House', 'single', 1, 2, TRUE, TRUE, 'federal'),
  ('4c000000-0000-4000-8000-000000000006', 'ocd-division/country:us/territory:vi', 'Delegate to the U.S. House', 'single', 1, 2, TRUE, TRUE, 'federal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio, bioguide_id) VALUES
  ('4d000000-0000-4000-8000-000000000001', 'Eleanor Holmes Norton', 'D', '4c000000-0000-4000-8000-000000000001', 'Delegate to the U.S. House for the District of Columbia. Non-voting member (can vote in committee, not on the House floor). Congress.gov bioguideId: N000147.', 'N000147'),
  ('4d000000-0000-4000-8000-000000000002', 'Pablo Jose Hernández', 'D', '4c000000-0000-4000-8000-000000000002', 'Resident Commissioner for Puerto Rico -- a distinct title from the other 5 offices in this migration, serving a 4-year term aligned with presidential elections rather than the usual 2-year House term. Non-voting (can vote in committee, not on the House floor). Congress.gov bioguideId: H001103.', 'H001103'),
  ('4d000000-0000-4000-8000-000000000003', 'James C. Moylan', 'R', '4c000000-0000-4000-8000-000000000003', 'Delegate to the U.S. House for Guam. Non-voting member (can vote in committee, not on the House floor). Congress.gov bioguideId: M001219.', 'M001219'),
  ('4d000000-0000-4000-8000-000000000004', 'Aumua Amata Coleman Radewagen', 'R', '4c000000-0000-4000-8000-000000000004', 'Delegate to the U.S. House for American Samoa. Non-voting member (can vote in committee, not on the House floor). Congress.gov bioguideId: R000600.', 'R000600'),
  ('4d000000-0000-4000-8000-000000000005', 'Kimberlyn King-Hinds', 'R', '4c000000-0000-4000-8000-000000000005', 'Delegate to the U.S. House for the Northern Mariana Islands. Non-voting member (can vote in committee, not on the House floor). Congress.gov bioguideId: K000404.', 'K000404'),
  ('4d000000-0000-4000-8000-000000000006', 'Stacey E. Plaskett', 'D', '4c000000-0000-4000-8000-000000000006', 'Delegate to the U.S. House for the U.S. Virgin Islands. Non-voting member (can vote in committee, not on the House floor). Congress.gov bioguideId: P000610.', 'P000610');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('4c000000-0000-4000-8000-000000000001', '4d000000-0000-4000-8000-000000000001', '1991-01-03', 'elected'),
  ('4c000000-0000-4000-8000-000000000002', '4d000000-0000-4000-8000-000000000002', '2025-01-03', 'elected'),
  ('4c000000-0000-4000-8000-000000000003', '4d000000-0000-4000-8000-000000000003', '2023-01-03', 'elected'),
  ('4c000000-0000-4000-8000-000000000004', '4d000000-0000-4000-8000-000000000004', '2015-01-03', 'elected'),
  ('4c000000-0000-4000-8000-000000000005', '4d000000-0000-4000-8000-000000000005', '2025-01-03', 'elected'),
  ('4c000000-0000-4000-8000-000000000006', '4d000000-0000-4000-8000-000000000006', '2015-01-03', 'elected');
