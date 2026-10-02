-- First jurisdiction build-out sourced via the new AI-research draft step
-- (migration 110, /admin/jurisdiction-demand) rather than a hand-pulled
-- Wikipedia/Ballotpedia table like migrations 063/067/etc. -- disclosed
-- here for the same reason this project discloses AI provenance
-- everywhere else (priority axes' created_by_admin, etc.).
--
-- SOURCING METHOD: ran the exact researchJurisdiction() prompt logic
-- (Claude + the Messages API's live web-search tool) against Santa Clara
-- County, CA and its named place Mountain View, confirmed by the owner's
-- own demand-signal data (2026-10-01, FIPS 06085, "Mountain View city").
-- Every fact below was cross-checked against the specific primary source
-- the research cited (the county's/city's own official site, or a
-- specific current news article), not trusted as a bare AI claim -- same
-- bar as every hand-verified migration in this project, just using a
-- different research tool to get there. Unlike most of those, several of
-- these dates were only sourced as "has served since <date>" rather than
-- an unambiguous CURRENT-term start -- this project has already found
-- that exact "continuous tenure vs. current term" ambiguity in
-- Congress.gov data (see office_terms.term_start_precise's own comment),
-- so every term_start below is marked term_start_precise = FALSE (the
-- safe default) even where the sourced date is likely exactly right.
--
-- Santa Clara County is a CHARTER county: confirmed directly from the
-- county's own official quick-reference guide that only 4 offices are
-- elected county-wide (Board of Supervisors, District Attorney, Sheriff,
-- Assessor) -- the County Executive, Clerk-Recorder, Auditor-Controller,
-- and Tax Collector are all Board-appointed, so deliberately NOT created
-- as is_elected offices here.
--
-- Mountain View is a council-manager charter city: confirmed its Mayor is
-- NOT directly elected (the 7-member Council picks one of its own each
-- January, a 1-year ceremonial/presiding role) -- deliberately no "Mayor"
-- office created, only the real elected body (the 7-seat at-large
-- Council). No current councilmembers' names are seeded here -- that
-- research pass covered the city's STRUCTURE, not who currently holds
-- each seat, and this project never guesses a real person's office.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id, state_fips, county_fips) VALUES
 ('ocd-division/country:us/state:ca/county:santa_clara', 'Santa Clara County', 'county', 'ocd-division/country:us/state:ca', '06', '085'),
 ('ocd-division/country:us/state:ca/place:mountain_view', 'City of Mountain View', 'municipal', 'ocd-division/country:us/state:ca/county:santa_clara', '06', '085');

-- Board of Supervisors (5 districts, 4-year terms, 3-consecutive-term
-- limit) -- same per-district office-row pattern already used for
-- Montgomery County's own multi-seat Council.
WITH o1 AS (
  INSERT INTO offices (jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level)
  VALUES ('ocd-division/country:us/state:ca/county:santa_clara', 'Board of Supervisors — District 1', 'district', 1, 4, FALSE, TRUE, 'county')
  RETURNING id
), p1 AS (
  INSERT INTO politicians (full_name, party, current_office_id, bio)
  SELECT 'Sylvia Arenas', NULL, o1.id,
    'Santa Clara County Board of Supervisors, District 1. In office since January 2, 2023, per Ballotpedia and the county''s own official site (santaclaracounty.gov/home) -- sourced via AI-research draft step (migration 110), cross-checked against those specific primary sources 2026-10-02. Party not independently confirmed from a source this project trusts for that fact; left blank rather than guessed.'
  FROM o1 RETURNING id
)
INSERT INTO office_terms (office_id, politician_id, term_start, term_start_precise, how_obtained)
SELECT o1.id, p1.id, '2023-01-02', FALSE, 'elected' FROM o1, p1;

WITH o2 AS (
  INSERT INTO offices (jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level)
  VALUES ('ocd-division/country:us/state:ca/county:santa_clara', 'Board of Supervisors — District 2', 'district', 1, 4, FALSE, TRUE, 'county')
  RETURNING id
), p2 AS (
  INSERT INTO politicians (full_name, party, current_office_id, bio)
  SELECT 'Betty Duong', NULL, o2.id,
    'Santa Clara County Board of Supervisors, District 2. Took office January 6, 2025, succeeding term-limited Cindy Chavez, per the county''s official site and Ballotpedia. Sourced via AI-research draft step (migration 110), cross-checked 2026-10-02.'
  FROM o2 RETURNING id
)
INSERT INTO office_terms (office_id, politician_id, term_start, term_start_precise, how_obtained)
SELECT o2.id, p2.id, '2025-01-06', FALSE, 'elected' FROM o2, p2;

WITH o3 AS (
  INSERT INTO offices (jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level)
  VALUES ('ocd-division/country:us/state:ca/county:santa_clara', 'Board of Supervisors — District 3', 'district', 1, 4, FALSE, TRUE, 'county')
  RETURNING id
), p3 AS (
  INSERT INTO politicians (full_name, party, current_office_id, bio)
  SELECT 'Otto Lee', NULL, o3.id,
    'Santa Clara County Board of Supervisors, District 3; currently Board President. In office since January 4, 2021 per the county''s official site -- that date reflects continuous tenure, not necessarily this seat''s current term start (term_start_precise = FALSE accordingly). Sourced via AI-research draft step (migration 110), cross-checked 2026-10-02.'
  FROM o3 RETURNING id
)
INSERT INTO office_terms (office_id, politician_id, term_start, term_start_precise, how_obtained)
SELECT o3.id, p3.id, '2021-01-04', FALSE, 'elected' FROM o3, p3;

WITH o4 AS (
  INSERT INTO offices (jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level)
  VALUES ('ocd-division/country:us/state:ca/county:santa_clara', 'Board of Supervisors — District 4', 'district', 1, 4, FALSE, TRUE, 'county')
  RETURNING id
), p4 AS (
  INSERT INTO politicians (full_name, party, current_office_id, bio)
  SELECT 'Susan Ellenberg', NULL, o4.id,
    'Santa Clara County Board of Supervisors, District 4. In office since January 1, 2019 per the county''s official site -- same continuous-tenure caveat as this migration''s other Supervisor rows (term_start_precise = FALSE). Sourced via AI-research draft step (migration 110), cross-checked 2026-10-02.'
  FROM o4 RETURNING id
)
INSERT INTO office_terms (office_id, politician_id, term_start, term_start_precise, how_obtained)
SELECT o4.id, p4.id, '2019-01-01', FALSE, 'elected' FROM o4, p4;

WITH o5 AS (
  INSERT INTO offices (jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level)
  VALUES ('ocd-division/country:us/state:ca/county:santa_clara', 'Board of Supervisors — District 5', 'district', 1, 4, FALSE, TRUE, 'county')
  RETURNING id
), p5 AS (
  INSERT INTO politicians (full_name, party, current_office_id, bio)
  SELECT 'Margaret Abe-Koga', NULL, o5.id,
    'Santa Clara County Board of Supervisors, District 5. Took office January 6, 2025, succeeding Joe Simitian, whose term ended December 31, 2024, per the county''s official site. Sourced via AI-research draft step (migration 110), cross-checked 2026-10-02.'
  FROM o5 RETURNING id
)
INSERT INTO office_terms (office_id, politician_id, term_start, term_start_precise, how_obtained)
SELECT o5.id, p5.id, '2025-01-06', FALSE, 'elected' FROM o5, p5;

-- District Attorney, Sheriff, Assessor -- the other 3 countywide elected
-- offices (4-year terms, same cycle as the Board).
WITH oda AS (
  INSERT INTO offices (jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level)
  VALUES ('ocd-division/country:us/state:ca/county:santa_clara', 'District Attorney', 'single', 1, 4, FALSE, TRUE, 'county')
  RETURNING id
), pda AS (
  INSERT INTO politicians (full_name, party, current_office_id, bio)
  SELECT 'Jeff Rosen', NULL, oda.id,
    'Santa Clara County District Attorney since 2011. Current term confirmed to end January 4, 2027 per Ballotpedia; term_start below (January 4, 2023) is backed out from that confirmed end date, not independently sourced for its own exact day, so term_start_precise = FALSE. Sourced via AI-research draft step (migration 110), cross-checked 2026-10-02.'
  FROM oda RETURNING id
)
INSERT INTO office_terms (office_id, politician_id, term_start, term_start_precise, how_obtained)
SELECT oda.id, pda.id, '2023-01-04', FALSE, 'elected' FROM oda, pda;

WITH osh AS (
  INSERT INTO offices (jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level)
  VALUES ('ocd-division/country:us/state:ca/county:santa_clara', 'Sheriff', 'single', 1, 4, FALSE, TRUE, 'county')
  RETURNING id
), psh AS (
  INSERT INTO politicians (full_name, party, current_office_id, bio)
  SELECT 'Robert "Bob" Jonsen', NULL, osh.id,
    'Santa Clara County Sheriff (the 29th). Took office in 2022 per his own office''s published biography, which did not state an exact day -- term_start below (January 3, 2023) is an approximation following the same Nov-election/Jan-inauguration pattern confirmed for the Board/DA/Assessor, not independently confirmed for this exact date, so term_start_precise = FALSE. Sourced via AI-research draft step (migration 110), cross-checked 2026-10-02.'
  FROM osh RETURNING id
)
INSERT INTO office_terms (office_id, politician_id, term_start, term_start_precise, how_obtained)
SELECT osh.id, psh.id, '2023-01-03', FALSE, 'elected' FROM osh, psh;

WITH oas AS (
  INSERT INTO offices (jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level)
  VALUES ('ocd-division/country:us/state:ca/county:santa_clara', 'Assessor', 'single', 1, 4, FALSE, TRUE, 'county')
  RETURNING id
), pas AS (
  INSERT INTO politicians (full_name, party, current_office_id, bio)
  SELECT 'Neysa Fligor', NULL, oas.id,
    'Santa Clara County Assessor. Won a December 30, 2025 special-election runoff for the seat (vacated mid-term by Larry Stone), certified by the Board of Supervisors January 26, 2026, per the Assessor''s own office page -- also reported unopposed for the regular 4-year term on the June 2, 2026 primary ballot. term_start below reflects the special-election certification date, not any later regular-term start, so term_start_precise = FALSE. Sourced via AI-research draft step (migration 110), cross-checked 2026-10-02.'
  FROM oas RETURNING id
)
INSERT INTO office_terms (office_id, politician_id, term_start, term_start_precise, how_obtained)
SELECT oas.id, pas.id, '2026-01-26', FALSE, 'elected' FROM oas, pas;

-- Mountain View City Council -- 7 seats, at-large, 4-year staggered
-- terms, 2-consecutive-term limit. No current officeholders seeded (this
-- research pass confirmed the city's STRUCTURE, not who currently holds
-- each seat) and deliberately no separate "Mayor" office, since Mountain
-- View's own Charter does not provide for one being directly elected.
INSERT INTO offices (jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
 ('ocd-division/country:us/state:ca/place:mountain_view', 'City Council', 'at_large', 7, 4, FALSE, TRUE, 'municipal');
