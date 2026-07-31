-- Nationwide expansion Part 2: real structural data (jurisdictions, offices,
-- current officeholders, accountability pathways) for the DMV jurisdictions
-- added in migration 004. Structural identity facts only, each independently
-- researched (WebSearch, live, July 2026) against official government sites,
-- Wikipedia, Ballotpedia, and local news -- never guessed from training memory.
-- Deliberately NOT included: voting_records / politician_positions / promises
-- for these politicians. That requires the same citation-by-citation ingestion
-- rigor Montgomery County's real data took; without it, candidates here
-- correctly show "not enough data" per the scoring engine's coverageGate
-- (app/src/lib/scoring/engine.ts) -- an honest state, not a bug.
--
-- Confidence note on term_start dates: for long-tenured officials, some dates
-- reflect when they first took the seat continuously (per the cited source),
-- not necessarily their most recent re-election date -- both are defensible
-- readings of "term_start" for this structural-only pass, but the latter would
-- need per-person verification this pass didn't do. Maureen Coffey's exact
-- Arlington election date could not be independently confirmed; 2024-01-01 is
-- a reasonable estimate pending a firmer source.

-- ═══════════════════ WASHINGTON, D.C. ═══════════════════
-- Consolidated city-county-state government: Mayor, elected Attorney General,
-- 13-member Council (Chairman + 4 at-large + 8 wards). All partisan, 4-year
-- terms. (Non-voting Congressional Delegate is a federal office, out of scope
-- here -- same as Congress isn't modeled for Montgomery County.)
INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('10000000-0000-4000-8000-000000000001', 'ocd-division/country:us/district:dc', 'Mayor', 'single', 1, 4, TRUE, TRUE, 'county'),
  ('10000000-0000-4000-8000-000000000002', 'ocd-division/country:us/district:dc', 'Attorney General', 'single', 1, 4, TRUE, TRUE, 'county'),
  ('10000000-0000-4000-8000-000000000003', 'ocd-division/country:us/district:dc', 'Council Chairman', 'single', 1, 4, TRUE, TRUE, 'county'),
  ('10000000-0000-4000-8000-000000000004', 'ocd-division/country:us/district:dc', 'Council — At-Large', 'at_large', 4, 4, TRUE, TRUE, 'county'),
  ('10000000-0000-4000-8000-000000000005', 'ocd-division/country:us/district:dc', 'Council — Ward 1', 'district', 1, 4, TRUE, TRUE, 'county'),
  ('10000000-0000-4000-8000-000000000006', 'ocd-division/country:us/district:dc', 'Council — Ward 2', 'district', 1, 4, TRUE, TRUE, 'county'),
  ('10000000-0000-4000-8000-000000000007', 'ocd-division/country:us/district:dc', 'Council — Ward 3', 'district', 1, 4, TRUE, TRUE, 'county'),
  ('10000000-0000-4000-8000-000000000008', 'ocd-division/country:us/district:dc', 'Council — Ward 4', 'district', 1, 4, TRUE, TRUE, 'county'),
  ('10000000-0000-4000-8000-000000000009', 'ocd-division/country:us/district:dc', 'Council — Ward 5', 'district', 1, 4, TRUE, TRUE, 'county'),
  ('10000000-0000-4000-8000-00000000000a', 'ocd-division/country:us/district:dc', 'Council — Ward 6', 'district', 1, 4, TRUE, TRUE, 'county'),
  ('10000000-0000-4000-8000-00000000000b', 'ocd-division/country:us/district:dc', 'Council — Ward 7', 'district', 1, 4, TRUE, TRUE, 'county'),
  ('10000000-0000-4000-8000-00000000000c', 'ocd-division/country:us/district:dc', 'Council — Ward 8', 'district', 1, 4, TRUE, TRUE, 'county');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('10000000-0000-4000-8000-000000000101', 'Muriel Bowser', 'D', '10000000-0000-4000-8000-000000000001', 'Mayor of the District of Columbia since January 2015; not seeking a fourth term in 2026.'),
  ('10000000-0000-4000-8000-000000000102', 'Brian Schwalb', 'D', '10000000-0000-4000-8000-000000000002', 'Attorney General for the District of Columbia.'),
  ('10000000-0000-4000-8000-000000000103', 'Phil Mendelson', 'D', '10000000-0000-4000-8000-000000000003', 'Chairman of the Council of the District of Columbia.'),
  ('10000000-0000-4000-8000-000000000104', 'Anita Bonds', 'D', '10000000-0000-4000-8000-000000000004', 'At-large Councilmember; not seeking re-election in 2026.'),
  ('10000000-0000-4000-8000-000000000105', 'Robert C. White Jr.', 'D', '10000000-0000-4000-8000-000000000004', 'At-large Councilmember.'),
  ('10000000-0000-4000-8000-000000000106', 'Christina Henderson', 'I', '10000000-0000-4000-8000-000000000004', 'At-large Councilmember.'),
  ('10000000-0000-4000-8000-000000000107', 'Elissa Silverman', 'I', '10000000-0000-4000-8000-000000000004', 'At-large Councilmember, won the June 2026 special election to succeed Kenyan McDuffie (who resigned to run for Mayor).'),
  ('10000000-0000-4000-8000-000000000108', 'Brianne Nadeau', 'D', '10000000-0000-4000-8000-000000000005', 'Ward 1 Councilmember.'),
  ('10000000-0000-4000-8000-000000000109', 'Brooke Pinto', 'D', '10000000-0000-4000-8000-000000000006', 'Ward 2 Councilmember.'),
  ('10000000-0000-4000-8000-00000000010a', 'Matthew Frumin', 'D', '10000000-0000-4000-8000-000000000007', 'Ward 3 Councilmember.'),
  ('10000000-0000-4000-8000-00000000010b', 'Janeese Lewis George', 'D', '10000000-0000-4000-8000-000000000008', 'Ward 4 Councilmember.'),
  ('10000000-0000-4000-8000-00000000010c', 'Zachary Parker', 'D', '10000000-0000-4000-8000-000000000009', 'Ward 5 Councilmember.'),
  ('10000000-0000-4000-8000-00000000010d', 'Charles Allen', 'D', '10000000-0000-4000-8000-00000000000a', 'Ward 6 Councilmember.'),
  ('10000000-0000-4000-8000-00000000010e', 'Wendell Felder', 'D', '10000000-0000-4000-8000-00000000000b', 'Ward 7 Councilmember.'),
  ('10000000-0000-4000-8000-00000000010f', 'Trayon White Sr.', 'D', '10000000-0000-4000-8000-00000000000c', 'Ward 8 Councilmember.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000101', '2023-01-02', 'elected'),
  ('10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000102', '2023-01-02', 'elected'),
  ('10000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000103', '2012-06-13', 'elected'),
  ('10000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000104', '2012-12-11', 'elected'),
  ('10000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000105', '2016-09-16', 'elected'),
  ('10000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000106', '2021-01-02', 'elected'),
  ('10000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000107', '2026-07-17', 'elected'),
  ('10000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000108', '2015-01-02', 'elected'),
  ('10000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000109', '2020-06-27', 'elected'),
  ('10000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-00000000010a', '2023-01-02', 'elected'),
  ('10000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-00000000010b', '2021-01-02', 'elected'),
  ('10000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-00000000010c', '2023-01-02', 'elected'),
  ('10000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-00000000010d', '2015-01-02', 'elected'),
  ('10000000-0000-4000-8000-00000000000b', '10000000-0000-4000-8000-00000000010e', '2025-01-02', 'elected'),
  ('10000000-0000-4000-8000-00000000000c', '10000000-0000-4000-8000-00000000010f', '2025-08-08', 'elected');

-- D.C.'s recall (Initiative, Referendum, and Recall Procedures Act of 1979) is a
-- real, binding, citizen-initiated ballot recall -- genuinely different from
-- Maryland's charter-petition and Virginia's judicial-removal mechanisms below.
-- Applies to every elected D.C. officer except the non-voting Delegate.
INSERT INTO accountability_pathways (jurisdiction_id, office_id, mechanism_type, is_binding, legal_citation, signature_requirement_note, description)
SELECT 'ocd-division/country:us/district:dc', id, 'municipal_recall', TRUE,
  'D.C. Official Code §§ 1-204.112, 1-1001.17; Initiative, Referendum, and Recall Procedures Act of 1979',
  '10% of registered voters in the officer''s election district (ward-wide for ward seats, citywide for Mayor/Attorney General/Chairman/at-large seats)',
  'Any D.C. elected officer except the non-voting Congressional Delegate may be recalled. A certified petition triggers a special election within 114 days of certification; if more voters choose removal than retention, the officer is removed.'
FROM offices WHERE jurisdiction_id = 'ocd-division/country:us/district:dc';

-- ═══════════════════ FAIRFAX COUNTY, VIRGINIA ═══════════════════
-- Board of Supervisors: an at-large Chairman + 9 district Supervisors.
-- Virginia local elections are officially nonpartisan (no party label on the
-- ballot), even though candidates commonly have known party affiliation/
-- endorsement -- is_partisan = FALSE reflects the ballot, not the politician's
-- actual affiliation (still recorded in `party` below).
INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('20000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:va/county:fairfax', 'Board of Supervisors — Chairman', 'single', 1, 4, FALSE, TRUE, 'county'),
  ('20000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:va/county:fairfax', 'Board of Supervisors — Braddock District', 'district', 1, 4, FALSE, TRUE, 'county'),
  ('20000000-0000-4000-8000-000000000003', 'ocd-division/country:us/state:va/county:fairfax', 'Board of Supervisors — Dranesville District', 'district', 1, 4, FALSE, TRUE, 'county'),
  ('20000000-0000-4000-8000-000000000004', 'ocd-division/country:us/state:va/county:fairfax', 'Board of Supervisors — Hunter Mill District', 'district', 1, 4, FALSE, TRUE, 'county'),
  ('20000000-0000-4000-8000-000000000005', 'ocd-division/country:us/state:va/county:fairfax', 'Board of Supervisors — Franconia District', 'district', 1, 4, FALSE, TRUE, 'county'),
  ('20000000-0000-4000-8000-000000000006', 'ocd-division/country:us/state:va/county:fairfax', 'Board of Supervisors — Mason District', 'district', 1, 4, FALSE, TRUE, 'county'),
  ('20000000-0000-4000-8000-000000000007', 'ocd-division/country:us/state:va/county:fairfax', 'Board of Supervisors — Mount Vernon District', 'district', 1, 4, FALSE, TRUE, 'county'),
  ('20000000-0000-4000-8000-000000000008', 'ocd-division/country:us/state:va/county:fairfax', 'Board of Supervisors — Providence District', 'district', 1, 4, FALSE, TRUE, 'county'),
  ('20000000-0000-4000-8000-000000000009', 'ocd-division/country:us/state:va/county:fairfax', 'Board of Supervisors — Springfield District', 'district', 1, 4, FALSE, TRUE, 'county'),
  ('20000000-0000-4000-8000-00000000000a', 'ocd-division/country:us/state:va/county:fairfax', 'Board of Supervisors — Sully District', 'district', 1, 4, FALSE, TRUE, 'county');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('20000000-0000-4000-8000-000000000101', 'Jeffrey C. McKay', 'D', '20000000-0000-4000-8000-000000000001', 'Chairman, Fairfax County Board of Supervisors.'),
  ('20000000-0000-4000-8000-000000000102', 'Rachna Sizemore Heizer', NULL, '20000000-0000-4000-8000-000000000002', 'Braddock District Supervisor.'),
  ('20000000-0000-4000-8000-000000000103', 'James N. Bierman Jr.', NULL, '20000000-0000-4000-8000-000000000003', 'Dranesville District Supervisor.'),
  ('20000000-0000-4000-8000-000000000104', 'Walter L. Alcorn', 'D', '20000000-0000-4000-8000-000000000004', 'Hunter Mill District Supervisor.'),
  ('20000000-0000-4000-8000-000000000105', 'Rodney L. Lusk', 'D', '20000000-0000-4000-8000-000000000005', 'Franconia District Supervisor.'),
  ('20000000-0000-4000-8000-000000000106', 'Andres Jimenez', NULL, '20000000-0000-4000-8000-000000000006', 'Mason District Supervisor.'),
  ('20000000-0000-4000-8000-000000000107', 'Daniel G. Storck', 'D', '20000000-0000-4000-8000-000000000007', 'Mount Vernon District Supervisor.'),
  ('20000000-0000-4000-8000-000000000108', 'Dalia A. Palchik', 'D', '20000000-0000-4000-8000-000000000008', 'Providence District Supervisor.'),
  ('20000000-0000-4000-8000-000000000109', 'Pat Herrity', 'R', '20000000-0000-4000-8000-000000000009', 'Springfield District Supervisor.'),
  ('20000000-0000-4000-8000-00000000010a', 'Kathy L. Smith', 'D', '20000000-0000-4000-8000-00000000000a', 'Sully District Supervisor; Vice Chairman.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('20000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000101', '2020-01-01', 'elected'),
  ('20000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000102', '2025-01-01', 'elected'),
  ('20000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000103', '2024-01-01', 'elected'),
  ('20000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000104', '2020-01-01', 'elected'),
  ('20000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000105', '2020-01-01', 'elected'),
  ('20000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000106', '2024-01-01', 'elected'),
  ('20000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000107', '2016-01-01', 'elected'),
  ('20000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000108', '2020-01-01', 'elected'),
  ('20000000-0000-4000-8000-000000000009', '20000000-0000-4000-8000-000000000109', '2008-01-01', 'elected'),
  ('20000000-0000-4000-8000-00000000000a', '20000000-0000-4000-8000-00000000010a', '2016-01-01', 'elected');

-- ═══════════════════ ARLINGTON COUNTY, VIRGINIA ═══════════════════
-- All 5 County Board members are elected at-large from one countywide pool;
-- there is no separate "Chairman" office -- the Chair/Vice-Chair are internal
-- roles the Board elects among itself each year, not a distinct ballot line
-- (unlike D.C.'s and Fairfax's separately-elected chairs).
INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('30000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:va/county:arlington', 'County Board', 'at_large', 5, 4, FALSE, TRUE, 'county');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('30000000-0000-4000-8000-000000000101', 'Matt de Ferranti', 'D', '30000000-0000-4000-8000-000000000001', 'County Board member since 2019; Chair for 2026.'),
  ('30000000-0000-4000-8000-000000000102', 'Maureen Coffey', 'D', '30000000-0000-4000-8000-000000000001', 'County Board member; Vice-Chair for 2026.'),
  ('30000000-0000-4000-8000-000000000103', 'Takis Karantonis', 'D', '30000000-0000-4000-8000-000000000001', 'County Board member since a 2020 special election, won a full term in 2021.'),
  ('30000000-0000-4000-8000-000000000104', 'Susan Cunningham', 'D', '30000000-0000-4000-8000-000000000001', 'County Board member, elected 2023.'),
  ('30000000-0000-4000-8000-000000000105', 'JD Spain Sr.', 'D', '30000000-0000-4000-8000-000000000001', 'County Board member, elected November 2024, succeeding Libby Garvey.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('30000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000101', '2019-01-01', 'elected'),
  ('30000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000102', '2024-01-01', 'elected'),
  ('30000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000103', '2022-01-01', 'elected'),
  ('30000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000104', '2024-01-01', 'elected'),
  ('30000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000105', '2025-01-01', 'elected');

-- Virginia's removal statute (applies identically to Fairfax and Arlington --
-- it's state law, not county-specific): NOT a ballot-box recall election.
-- Registered voters petition the Circuit Court; a judge decides on specific
-- statutory grounds. Genuinely different in kind from D.C.'s voter recall.
INSERT INTO accountability_pathways (jurisdiction_id, office_id, mechanism_type, is_binding, legal_citation, signature_requirement_note, description)
SELECT 'ocd-division/country:us/state:va/county:fairfax', id, 'municipal_recall', TRUE,
  'Va. Code Ann. § 24.2-230 et seq. (Removal of Public Officers from Office), esp. § 24.2-233',
  '10% of the votes cast in the officer''s last election',
  'Not a ballot-box recall: registered voters in the officer''s district petition the Circuit Court for removal on specific statutory grounds (neglect of duty, misuse of office, or certain criminal convictions). A judge, not the electorate, decides whether to remove the officer.'
FROM offices WHERE jurisdiction_id = 'ocd-division/country:us/state:va/county:fairfax';

INSERT INTO accountability_pathways (jurisdiction_id, office_id, mechanism_type, is_binding, legal_citation, signature_requirement_note, description)
SELECT 'ocd-division/country:us/state:va/county:arlington', id, 'municipal_recall', TRUE,
  'Va. Code Ann. § 24.2-230 et seq. (Removal of Public Officers from Office), esp. § 24.2-233',
  '10% of the votes cast in the officer''s last election',
  'Not a ballot-box recall: registered voters petition the Circuit Court for removal on specific statutory grounds (neglect of duty, misuse of office, or certain criminal convictions). A judge, not the electorate, decides whether to remove the officer.'
FROM offices WHERE jurisdiction_id = 'ocd-division/country:us/state:va/county:arlington';

-- ═══════════════════ PRINCE GEORGE'S COUNTY, MARYLAND ═══════════════════
-- Same charter-county structure as Montgomery: County Executive + 11-member
-- Council (9 districts + 2 at-large).
INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('40000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/county:prince_georges', 'County Executive', 'single', 1, 4, TRUE, TRUE, 'county'),
  ('40000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/county:prince_georges', 'County Council — At-Large', 'at_large', 2, 4, TRUE, TRUE, 'county'),
  ('40000000-0000-4000-8000-000000000003', 'ocd-division/country:us/state:md/county:prince_georges', 'County Council — District 1', 'district', 1, 4, TRUE, TRUE, 'county'),
  ('40000000-0000-4000-8000-000000000004', 'ocd-division/country:us/state:md/county:prince_georges', 'County Council — District 2', 'district', 1, 4, TRUE, TRUE, 'county'),
  ('40000000-0000-4000-8000-000000000005', 'ocd-division/country:us/state:md/county:prince_georges', 'County Council — District 3', 'district', 1, 4, TRUE, TRUE, 'county'),
  ('40000000-0000-4000-8000-000000000006', 'ocd-division/country:us/state:md/county:prince_georges', 'County Council — District 4', 'district', 1, 4, TRUE, TRUE, 'county'),
  ('40000000-0000-4000-8000-000000000007', 'ocd-division/country:us/state:md/county:prince_georges', 'County Council — District 5', 'district', 1, 4, TRUE, TRUE, 'county'),
  ('40000000-0000-4000-8000-000000000008', 'ocd-division/country:us/state:md/county:prince_georges', 'County Council — District 6', 'district', 1, 4, TRUE, TRUE, 'county'),
  ('40000000-0000-4000-8000-000000000009', 'ocd-division/country:us/state:md/county:prince_georges', 'County Council — District 7', 'district', 1, 4, TRUE, TRUE, 'county'),
  ('40000000-0000-4000-8000-00000000000a', 'ocd-division/country:us/state:md/county:prince_georges', 'County Council — District 8', 'district', 1, 4, TRUE, TRUE, 'county'),
  ('40000000-0000-4000-8000-00000000000b', 'ocd-division/country:us/state:md/county:prince_georges', 'County Council — District 9', 'district', 1, 4, TRUE, TRUE, 'county');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('40000000-0000-4000-8000-000000000101', 'Aisha Braveboy', 'D', '40000000-0000-4000-8000-000000000001', '9th County Executive of Prince George''s County, took office June 18, 2025 (special election).'),
  ('40000000-0000-4000-8000-000000000102', 'Wala Blegay', 'D', '40000000-0000-4000-8000-000000000002', 'At-large Council member, appointed January 5, 2026.'),
  ('40000000-0000-4000-8000-000000000103', 'Jolene Ivey', 'D', '40000000-0000-4000-8000-000000000002', 'At-large Council member.'),
  ('40000000-0000-4000-8000-000000000104', 'Thomas E. Dernoga', 'D', '40000000-0000-4000-8000-000000000003', 'District 1 Council member.'),
  ('40000000-0000-4000-8000-000000000105', 'Wanika B. Fisher', 'D', '40000000-0000-4000-8000-000000000004', 'District 2 Council member.'),
  ('40000000-0000-4000-8000-000000000106', 'Eric C. Olson', 'D', '40000000-0000-4000-8000-000000000005', 'District 3 Council member; Vice Chair for 2026.'),
  ('40000000-0000-4000-8000-000000000107', 'Timothy J. Adams', 'D', '40000000-0000-4000-8000-000000000006', 'District 4 Council member.'),
  ('40000000-0000-4000-8000-000000000108', 'Shayla Adams-Stafford', 'D', '40000000-0000-4000-8000-000000000007', 'District 5 Council member.'),
  ('40000000-0000-4000-8000-000000000109', 'Danielle I. Hunter', 'D', '40000000-0000-4000-8000-000000000008', 'District 6 Council member.'),
  ('40000000-0000-4000-8000-00000000010a', 'Krystal Oriadha', 'D', '40000000-0000-4000-8000-000000000009', 'District 7 Council member; Chair for 2026.'),
  ('40000000-0000-4000-8000-00000000010b', 'Edward P. Burroughs III', 'D', '40000000-0000-4000-8000-00000000000a', 'District 8 Council member.'),
  ('40000000-0000-4000-8000-00000000010c', 'Sydney J. Harrison', 'D', '40000000-0000-4000-8000-00000000000b', 'District 9 Council member.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('40000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000101', '2025-06-18', 'elected'),
  ('40000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000102', '2026-01-05', 'appointed'),
  ('40000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000103', '2024-12-02', 'elected'),
  ('40000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000104', '2018-12-03', 'elected'),
  ('40000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000105', '2018-12-03', 'elected'),
  ('40000000-0000-4000-8000-000000000005', '40000000-0000-4000-8000-000000000106', '2018-12-03', 'elected'),
  ('40000000-0000-4000-8000-000000000006', '40000000-0000-4000-8000-000000000107', '2022-12-05', 'elected'),
  ('40000000-0000-4000-8000-000000000007', '40000000-0000-4000-8000-000000000108', '2022-12-05', 'elected'),
  ('40000000-0000-4000-8000-000000000008', '40000000-0000-4000-8000-000000000109', '2022-12-05', 'elected'),
  ('40000000-0000-4000-8000-000000000009', '40000000-0000-4000-8000-00000000010a', '2022-12-05', 'elected'),
  ('40000000-0000-4000-8000-00000000000a', '40000000-0000-4000-8000-00000000010b', '2018-12-03', 'elected'),
  ('40000000-0000-4000-8000-00000000000b', '40000000-0000-4000-8000-00000000010c', '2018-12-03', 'elected');

-- Same Maryland constitutional charter-petition mechanism already used for
-- Montgomery County (Prince George's is also a charter county) -- jurisdiction-
-- wide, not tied to one office.
INSERT INTO accountability_pathways (jurisdiction_id, office_id, mechanism_type, is_binding, legal_citation, signature_requirement_note, description)
VALUES ('ocd-division/country:us/state:md/county:prince_georges', NULL, 'charter_amendment_petition', TRUE,
  'Md. Const. Art. XI-A, Sec. 5; Local Government Article',
  '20% of registered voters, or 10,000 signatures, whichever is fewer',
  'Voters can amend the County Charter directly by petition -- the binding path that could, for example, create removal provisions that don''t currently exist.');

-- Prince George's own charter provision (§307B) is narrower than it might sound:
-- it only allows removal for physical or mental disability preventing the
-- member from performing their duties -- not general misconduct or malfeasance.
-- Applies to Council members only (the charter's §307B targets Council seats).
INSERT INTO accountability_pathways (jurisdiction_id, office_id, mechanism_type, is_binding, legal_citation, signature_requirement_note, description)
SELECT jurisdiction_id, id, 'supermajority_council_removal', TRUE,
  'Prince George''s County Charter §307B',
  NULL,
  'A Council member may be removed only upon a finding -- by a two-thirds vote of the full Council after a public hearing -- that the member is unable, by reason of physical or mental disability, to perform the duties of office. This does not cover general misconduct. The member may appeal to Circuit Court within 10 days.'
FROM offices
 WHERE jurisdiction_id = 'ocd-division/country:us/state:md/county:prince_georges'
   AND title LIKE 'County Council%';
