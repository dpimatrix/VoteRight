-- Second jurisdiction build-out sourced via the AI-research draft step
-- (migration 110) -- see migration 111's header for the full rationale
-- and disclosure. This one is DELIBERATELY PARTIAL: Beaver County, PA
-- has more elected "row offices" than are seeded here (standard
-- Pennsylvania county government has Treasurer, Prothonotary, Clerk of
-- Courts, Register of Wills, Recorder of Deeds, and a Coroner, plus
-- Jury Commissioners if the county hasn't eliminated that office by
-- ordinance -- PA has allowed that since 2015) -- two research passes on
-- those specifically hit the research tool's own search-budget/timeout
-- limit before confirming any of their current officeholders with a
-- real, citable source. Only the 4 offices below were confirmed to this
-- project's own bar (a specific, checkable primary source per person) --
-- the rest are a disclosed, deliberate gap, not an oversight, same
-- "never guess a real person's office" discipline as every other
-- migration here. Follow-up pending.
--
-- Pennsylvania elects county row offices on a PARTISAN basis (confirmed
-- directly: local news described the current DA as "newly elected
-- Democratic district attorney"), unlike the Santa Clara County/CA
-- migration just before this one -- is_partisan = TRUE throughout,
-- correctly the opposite of that migration's choice for the same reason
-- (a real, confirmed structural difference between the two states' own
-- election law, not an inconsistency).
--
-- Term-start dates: Pennsylvania county row offices are elected in the
-- November municipal (odd-year) election and take office the following
-- January. The County Government Directory's own term table lists the
-- Commissioners' current terms as expiring in 2027, consistent with a
-- 4-year term that began January 2024 (following the November 2023
-- election) -- backed out from that confirmed end point, not an exact
-- swearing-in date independently sourced for each person, so every
-- term_start below is marked term_start_precise = FALSE, same posture
-- as every date in migration 111.

-- Real bug found live 2026-10-03, after this migration had already run on
-- production: county_fips below was '005' (Armstrong County's real FIPS)
-- instead of '007' (Beaver County's actual FIPS, confirmed directly
-- against the Census geocoder) -- not a cosmetic error. Because
-- jurisdictionForGeography matches on (state_fips, county_fips), not
-- name, this silently made every real Armstrong County, PA address
-- resolve to THIS row instead -- Armstrong residents were being served
-- Beaver County's real offices/officeholders as if those were their own
-- local government. Fixed here; production corrected via a direct
-- UPDATE (this INSERT is idempotent-irrelevant for an already-migrated
-- database, but must be right for any fresh one built from scratch).
INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id, state_fips, county_fips) VALUES
 ('ocd-division/country:us/state:pa/county:beaver', 'Beaver County', 'county', 'ocd-division/country:us/state:pa', '42', '007');

-- Board of Commissioners -- 3 seats, elected at-large per Pennsylvania's
-- standard county-commissioner model (not by district); confirmed
-- current members and their terms (expiring 2027) directly from the
-- county's own 2024/2026 Government Directory.
WITH oc AS (
  INSERT INTO offices (jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level)
  VALUES ('ocd-division/country:us/state:pa/county:beaver', 'Board of Commissioners', 'at_large', 3, 4, TRUE, TRUE, 'county')
  RETURNING id
), pc1 AS (
  INSERT INTO politicians (full_name, party, current_office_id, bio)
  SELECT 'Daniel C. Camp III', NULL, oc.id,
    'Beaver County Commissioner, Chairman of the Board. Per the county''s own Government Directory (2024/2026 editions) and Board of Commissioners webpage, current term expires 2027. term_start below (January 2024) is backed out from that confirmed end date, not independently sourced for its own exact day, so term_start_precise = FALSE. Sourced via AI-research draft step (migration 110), cross-checked 2026-10-02.'
  FROM oc RETURNING id
), pc2 AS (
  INSERT INTO politicians (full_name, party, current_office_id, bio)
  SELECT 'Jack Manning', NULL, oc.id,
    'Beaver County Commissioner. Per the county''s own Government Directory (2024/2026 editions), current term expires 2027. Same term_start approximation and term_start_precise = FALSE as this migration''s other two Commissioners. Sourced via AI-research draft step (migration 110), cross-checked 2026-10-02.'
  FROM oc RETURNING id
), pc3 AS (
  INSERT INTO politicians (full_name, party, current_office_id, bio)
  SELECT 'Tony Amadio', NULL, oc.id,
    'Beaver County Commissioner. Per the county''s own Government Directory (2024/2026 editions), current term expires 2027. Same term_start approximation and term_start_precise = FALSE as this migration''s other two Commissioners. Sourced via AI-research draft step (migration 110), cross-checked 2026-10-02.'
  FROM oc RETURNING id
)
INSERT INTO office_terms (office_id, politician_id, term_start, term_start_precise, how_obtained)
SELECT oc.id, pid, '2024-01-02', FALSE, 'elected' FROM oc, (SELECT id AS pid FROM pc1 UNION ALL SELECT id FROM pc2 UNION ALL SELECT id FROM pc3) AS pids;

WITH oda AS (
  INSERT INTO offices (jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level)
  VALUES ('ocd-division/country:us/state:pa/county:beaver', 'District Attorney', 'single', 1, 4, TRUE, TRUE, 'county')
  RETURNING id
), pda AS (
  INSERT INTO politicians (full_name, party, current_office_id, bio)
  SELECT 'Nathan L. "Nate" Bible', 'D', oda.id,
    'Beaver County District Attorney, succeeding David J. Lozier. Took office January 2024 (elected in the November 2023 municipal election), per the county''s own directory and multiple local-news reports describing him as the "newly elected Democratic district attorney" (party confirmed directly from that quote, not guessed). Exact swearing-in day not independently confirmed, so term_start_precise = FALSE. Sourced via AI-research draft step (migration 110), cross-checked 2026-10-02.'
  FROM oda RETURNING id
)
INSERT INTO office_terms (office_id, politician_id, term_start, term_start_precise, how_obtained)
SELECT oda.id, pda.id, '2024-01-02', FALSE, 'elected' FROM oda, pda;

WITH octl AS (
  INSERT INTO offices (jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level)
  VALUES ('ocd-division/country:us/state:pa/county:beaver', 'Controller', 'single', 1, 4, TRUE, TRUE, 'county')
  RETURNING id
), pctl AS (
  INSERT INTO politicians (full_name, party, current_office_id, bio)
  SELECT 'Maria Longo', NULL, octl.id,
    'Beaver County Controller. Identified as the signing officeholder on the county''s 2024 and 2025 Annual Comprehensive Financial Reports. term_start below is an approximation (the ACFR''s own "6th annual report" framing describes continuous production, not necessarily a current term start, the same ambiguity this project has already disclosed for Congress.gov data) -- term_start_precise = FALSE. Sourced via AI-research draft step (migration 110), cross-checked 2026-10-02.'
  FROM octl RETURNING id
)
INSERT INTO office_terms (office_id, politician_id, term_start, term_start_precise, how_obtained)
SELECT octl.id, pctl.id, '2024-01-02', FALSE, 'elected' FROM octl, pctl;

WITH osh AS (
  INSERT INTO offices (jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level)
  VALUES ('ocd-division/country:us/state:pa/county:beaver', 'Sheriff', 'single', 1, 4, TRUE, TRUE, 'county')
  RETURNING id
), psh AS (
  INSERT INTO politicians (full_name, party, current_office_id, bio)
  SELECT 'Tony Guy', NULL, osh.id,
    'Beaver County Sheriff, per the county''s own Sheriff''s Office pages. No exact swearing-in date was found in this research pass -- term_start below follows the same standard PA Nov-election/Jan-inauguration cycle confirmed for this county''s other row offices, not independently confirmed for this specific person, so term_start_precise = FALSE. Sourced via AI-research draft step (migration 110), cross-checked 2026-10-02.'
  FROM osh RETURNING id
)
INSERT INTO office_terms (office_id, politician_id, term_start, term_start_precise, how_obtained)
SELECT osh.id, psh.id, '2024-01-02', FALSE, 'elected' FROM osh, psh;
