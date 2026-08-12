-- D6 state foundation, tier C: closes out the "niche executive office"
-- punch list from migration 071. Two genuinely new elected offices found
-- while individually verifying the ~7 remaining unconfirmed titles from
-- that migration's taxonomy scan -- Mississippi Transportation
-- Commission and Hawaii's Office of Hawaiian Affairs -- plus a full
-- resolution of the other 5 titles and the 1 previously-unconfirmed
-- Auditor state (see below, no new data needed for that one).
--
-- Punch-list resolution, one by one:
--  - Industrial Commission Director (North Dakota): not a separate
--    elected office at all -- the Industrial Commission is composed of
--    the Governor, Attorney General, and Agriculture Commissioner, all
--    three already modeled as their own offices. No new row.
--  - Department of Revenue Commissioner (Alaska): an alias for a title
--    already resolved and excluded in migration 065 (Alaska's Treasurer-
--    equivalent, confirmed appointed).
--  - Commissioner of Energy and Environmental Protection (Connecticut):
--    confirmed appointed by the governor.
--  - Director of Economic Opportunity (Florida): confirmed appointed by
--    the governor, Senate-confirmed.
--  - Director of Commerce and Consumer Affairs (Hawaii): confirmed
--    appointed by the governor, Senate-confirmed.
--  - Employment Security Commission (North Carolina): a stale category --
--    the agency was folded into the Department of Commerce's Division of
--    Employment Security years ago; not a current standalone office.
--  - Transportation Commission: genuinely elected in Mississippi (this
--    migration) -- 3 districted seats, 4-year terms, confirmed via the
--    commission's own "Selection Method: Elected" field. (Washington's
--    "Utilities and Transportation Commission," which also surfaced in
--    this search, is the same office already modeled as Washington's
--    Public Service/Utility Commission in migration 066, not a
--    duplicate.)
--
-- Also fully resolved without any new data: the 1 previously-unconfirmed
-- Auditor state from migration 067. Exhaustively checked all 13
-- remaining Nonpartisan-tagged Auditor-equivalent candidates (Arizona,
-- Georgia, Hawaii, Illinois, Indiana, Maine, Michigan, Oregon, Rhode
-- Island, South Carolina, Texas, Wisconsin, and California) directly
-- against each one's own "Selection Method" field -- every single one is
-- appointed or legislature-selected (Maine: "elected biennially by
-- secret ballot of the state legislature," same not-popularly-elected
-- exclusion already applied throughout this project). None is a hidden
-- 24th state. Conclusion: Ballotpedia's own summary text ("a partisan
-- position in all 24 states where it is publicly elected") was simply
-- imprecise -- the true count is 23, exactly matching migration 067's
-- existing data. No SQL change needed for this item.
--
-- Hawaii's Office of Hawaiian Affairs (9 elected trustees, Hawaii State
-- Constitution Article XII, Section 6) is a genuinely separate discovery
-- from this same verification pass, not part of the original punch list
-- -- surfaced while researching Hawaii's (confirmed-appointed) Director
-- of Commerce and Consumer Affairs. 4 seats are at-large (one pooled
-- office, seat_count=4); 5 are tied to a specific island/residency
-- district, each its own single-seat office. All 9 are Nonpartisan-
-- tagged in the source despite being genuinely popularly elected --
-- confirmed via the office's own Selection Method field, same
-- nonpartisan-ballot pattern already seen multiple times this session.

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('48000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:ms', 'Transportation Commissioner — Central District', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('48000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:ms', 'Transportation Commissioner — Northern District', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('48000000-0000-4000-8000-000000000003', 'ocd-division/country:us/state:ms', 'Transportation Commissioner — Southern District', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('48000000-0000-4000-8000-000000000004', 'ocd-division/country:us/state:hi', 'Office of Hawaiian Affairs Trustee — At-Large', 'at_large', 4, 4, TRUE, TRUE, 'state'),
  ('48000000-0000-4000-8000-000000000005', 'ocd-division/country:us/state:hi', 'Office of Hawaiian Affairs Trustee — Hawaii Island Resident Trustee', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('48000000-0000-4000-8000-000000000006', 'ocd-division/country:us/state:hi', 'Office of Hawaiian Affairs Trustee — Kauai and Niihau Resident Trustee', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('48000000-0000-4000-8000-000000000007', 'ocd-division/country:us/state:hi', 'Office of Hawaiian Affairs Trustee — Maui Resident Trustee', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('48000000-0000-4000-8000-000000000008', 'ocd-division/country:us/state:hi', 'Office of Hawaiian Affairs Trustee — Molokai and Lanai Resident Trustee', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('48000000-0000-4000-8000-000000000009', 'ocd-division/country:us/state:hi', 'Office of Hawaiian Affairs Trustee — Oahu Resident Trustee', 'single', 1, 4, TRUE, TRUE, 'state');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('49000000-0000-4000-8000-000000000001', 'Willie Simmons', 'D', '48000000-0000-4000-8000-000000000001', 'Transportation Commissioner — Central District, took office January 7, 2020.  Sourced from Ballotpedia, verified 2026-08-12 against the office''s own "Selection Method: Elected" field.'),
  ('49000000-0000-4000-8000-000000000002', 'John Caldwell', 'R', '48000000-0000-4000-8000-000000000002', 'Transportation Commissioner — Northern District, took office January 7, 2020.  Sourced from Ballotpedia, verified 2026-08-12 against the office''s own "Selection Method: Elected" field.'),
  ('49000000-0000-4000-8000-000000000003', 'Charles Busby', 'R', '48000000-0000-4000-8000-000000000003', 'Transportation Commissioner — Southern District, took office January 4, 2024.  Sourced from Ballotpedia, verified 2026-08-12 against the office''s own "Selection Method: Elected" field.'),
  ('49000000-0000-4000-8000-000000000004', 'Keli''i Akina', NULL, '48000000-0000-4000-8000-000000000004', 'Office of Hawaiian Affairs Trustee — At-Large, took office 2016. Exact day/month not given by the source. Trustee of the Hawaii Office of Hawaiian Affairs, a constitutional body administering programs for Native Hawaiians. Nonpartisan-tagged in the source despite being genuinely popularly elected -- confirmed via the office''s own "Selection Method: Elected" field, same nonpartisan-ballot pattern seen elsewhere in this project. Sourced from Ballotpedia, verified 2026-08-12 against the office''s own "Selection Method: Elected" field.'),
  ('49000000-0000-4000-8000-000000000005', 'Brickwood Galuteria', NULL, '48000000-0000-4000-8000-000000000004', 'Office of Hawaiian Affairs Trustee — At-Large, took office November 8, 2022. Trustee of the Hawaii Office of Hawaiian Affairs, a constitutional body administering programs for Native Hawaiians. Nonpartisan-tagged in the source despite being genuinely popularly elected -- confirmed via the office''s own "Selection Method: Elected" field, same nonpartisan-ballot pattern seen elsewhere in this project. Sourced from Ballotpedia, verified 2026-08-12 against the office''s own "Selection Method: Elected" field.'),
  ('49000000-0000-4000-8000-000000000006', 'Keoni Souza', NULL, '48000000-0000-4000-8000-000000000004', 'Office of Hawaiian Affairs Trustee — At-Large, took office November 8, 2022. Trustee of the Hawaii Office of Hawaiian Affairs, a constitutional body administering programs for Native Hawaiians. Nonpartisan-tagged in the source despite being genuinely popularly elected -- confirmed via the office''s own "Selection Method: Elected" field, same nonpartisan-ballot pattern seen elsewhere in this project. Sourced from Ballotpedia, verified 2026-08-12 against the office''s own "Selection Method: Elected" field.'),
  ('49000000-0000-4000-8000-000000000007', 'John Waihee IV', NULL, '48000000-0000-4000-8000-000000000004', 'Office of Hawaiian Affairs Trustee — At-Large, took office 2000. Exact day/month not given by the source. Trustee of the Hawaii Office of Hawaiian Affairs, a constitutional body administering programs for Native Hawaiians. Nonpartisan-tagged in the source despite being genuinely popularly elected -- confirmed via the office''s own "Selection Method: Elected" field, same nonpartisan-ballot pattern seen elsewhere in this project. Sourced from Ballotpedia, verified 2026-08-12 against the office''s own "Selection Method: Elected" field.'),
  ('49000000-0000-4000-8000-000000000008', 'Kaiali''i Kahele', NULL, '48000000-0000-4000-8000-000000000005', 'Office of Hawaiian Affairs Trustee — Hawaii Island Resident Trustee, took office November 5, 2024. Trustee of the Hawaii Office of Hawaiian Affairs, a constitutional body administering programs for Native Hawaiians. Nonpartisan-tagged in the source despite being genuinely popularly elected -- confirmed via the office''s own "Selection Method: Elected" field, same nonpartisan-ballot pattern seen elsewhere in this project. Sourced from Ballotpedia, verified 2026-08-12 against the office''s own "Selection Method: Elected" field.'),
  ('49000000-0000-4000-8000-000000000009', 'Dan Ahuna', NULL, '48000000-0000-4000-8000-000000000006', 'Office of Hawaiian Affairs Trustee — Kauai and Niihau Resident Trustee, took office 2012. Exact day/month not given by the source. Trustee of the Hawaii Office of Hawaiian Affairs, a constitutional body administering programs for Native Hawaiians. Nonpartisan-tagged in the source despite being genuinely popularly elected -- confirmed via the office''s own "Selection Method: Elected" field, same nonpartisan-ballot pattern seen elsewhere in this project. Sourced from Ballotpedia, verified 2026-08-12 against the office''s own "Selection Method: Elected" field.'),
  ('49000000-0000-4000-8000-000000000010', 'Carmen Hulu Lindsey', NULL, '48000000-0000-4000-8000-000000000007', 'Office of Hawaiian Affairs Trustee — Maui Resident Trustee, took office 2012. Exact day/month not given by the source. Trustee of the Hawaii Office of Hawaiian Affairs, a constitutional body administering programs for Native Hawaiians. Nonpartisan-tagged in the source despite being genuinely popularly elected -- confirmed via the office''s own "Selection Method: Elected" field, same nonpartisan-ballot pattern seen elsewhere in this project. Sourced from Ballotpedia, verified 2026-08-12 against the office''s own "Selection Method: Elected" field.'),
  ('49000000-0000-4000-8000-000000000011', 'Luana Alapa', NULL, '48000000-0000-4000-8000-000000000008', 'Office of Hawaiian Affairs Trustee — Molokai and Lanai Resident Trustee, took office November 3, 2020. Trustee of the Hawaii Office of Hawaiian Affairs, a constitutional body administering programs for Native Hawaiians. Nonpartisan-tagged in the source despite being genuinely popularly elected -- confirmed via the office''s own "Selection Method: Elected" field, same nonpartisan-ballot pattern seen elsewhere in this project. Sourced from Ballotpedia, verified 2026-08-12 against the office''s own "Selection Method: Elected" field.'),
  ('49000000-0000-4000-8000-000000000012', 'Kalei Akaka', NULL, '48000000-0000-4000-8000-000000000009', 'Office of Hawaiian Affairs Trustee — Oahu Resident Trustee, took office 2019. Exact day/month not given by the source. Trustee of the Hawaii Office of Hawaiian Affairs, a constitutional body administering programs for Native Hawaiians. Nonpartisan-tagged in the source despite being genuinely popularly elected -- confirmed via the office''s own "Selection Method: Elected" field, same nonpartisan-ballot pattern seen elsewhere in this project. Sourced from Ballotpedia, verified 2026-08-12 against the office''s own "Selection Method: Elected" field.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('48000000-0000-4000-8000-000000000001', '49000000-0000-4000-8000-000000000001', '2020-01-07', 'elected'),
  ('48000000-0000-4000-8000-000000000002', '49000000-0000-4000-8000-000000000002', '2020-01-07', 'elected'),
  ('48000000-0000-4000-8000-000000000003', '49000000-0000-4000-8000-000000000003', '2024-01-04', 'elected'),
  ('48000000-0000-4000-8000-000000000004', '49000000-0000-4000-8000-000000000004', '2016-01-01', 'elected'),
  ('48000000-0000-4000-8000-000000000004', '49000000-0000-4000-8000-000000000005', '2022-11-08', 'elected'),
  ('48000000-0000-4000-8000-000000000004', '49000000-0000-4000-8000-000000000006', '2022-11-08', 'elected'),
  ('48000000-0000-4000-8000-000000000004', '49000000-0000-4000-8000-000000000007', '2000-01-01', 'elected'),
  ('48000000-0000-4000-8000-000000000005', '49000000-0000-4000-8000-000000000008', '2024-11-05', 'elected'),
  ('48000000-0000-4000-8000-000000000006', '49000000-0000-4000-8000-000000000009', '2012-01-01', 'elected'),
  ('48000000-0000-4000-8000-000000000007', '49000000-0000-4000-8000-000000000010', '2012-01-01', 'elected'),
  ('48000000-0000-4000-8000-000000000008', '49000000-0000-4000-8000-000000000011', '2020-11-03', 'elected'),
  ('48000000-0000-4000-8000-000000000009', '49000000-0000-4000-8000-000000000012', '2019-01-01', 'elected');
