-- Third jurisdiction build-out sourced via the AI-research draft step
-- (migration 110) -- see migration 111's header for the full rationale
-- and disclosure. This is the ACTUAL county tied to the original
-- jurisdiction_demand gap this whole thread started from (FIPS 42005) --
-- migration 112 built Beaver County for it by mistake (that migration's
-- own county_fips was wrong, '005' instead of Beaver's real '007', fixed
-- in a follow-up commit + a direct production UPDATE). Before writing
-- anything here, state_fips='42'/county_fips='005' was re-verified
-- directly against the Census geocoder for a real Armstrong County
-- address (Kittanning, the county seat) -- confirmed NAME: "Armstrong
-- County", matching the demand queue's own FIPS exactly.
--
-- Armstrong is a 6th-class PA county under the general County Code (no
-- home-rule charter) -- confirmed directly from the Code's own text that
-- county row officers are elected at the November municipal (odd-year)
-- election and take office "the first Monday of January" after, for
-- 4-year terms. is_partisan = TRUE throughout, same confirmed PA
-- structural fact as migration 112 (Beaver County). No party affiliation
-- is stated for any of these 9 people in the sourced pages -- left NULL
-- rather than guessed, unlike migration 112's Bible (whose party a news
-- quote stated directly).
--
-- Two REAL structural differences from migration 112's Beaver County
-- worth disclosing (not a copy-paste template -- each county's own
-- officeholder page was read directly): Armstrong COMBINES what are
-- separate offices elsewhere in Pennsylvania -- Prothonotary and Clerk of
-- Courts are one single elected office here (one person, Annette
-- Bowser), and likewise Register of Wills + Recorder of Deeds + Clerk of
-- the Orphans' Court are one single elected office (Lori Hirst). And
-- Armstrong's Jury Commissioner office was actually ABOLISHED in 2018
-- (PA's 2013 County Code amendment allows this by county ordinance;
-- confirmed via contemporary local news coverage of the vote) --
-- deliberately NOT created as an is_elected office here; the function is
-- now handled by an appointed clerical staff position, not a public
-- elected seat this project tracks.
--
-- Exact swearing-in dates for these 9 people were not found -- the
-- county's own officer pages list only names and contact info, no
-- election history. term_start below (January 2024) follows the same
-- disclosed PA Nov-election/Jan-inauguration odd-year cycle already used
-- for migration 112's Beaver County row -- the most recently completed
-- cycle (November 2023) before this migration's own date -- not an
-- independently confirmed date for any specific person, so
-- term_start_precise = FALSE throughout, same posture as every date in
-- migrations 111/112.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id, state_fips, county_fips) VALUES
 ('ocd-division/country:us/state:pa/county:armstrong', 'Armstrong County', 'county', 'ocd-division/country:us/state:pa', '42', '005');

-- Board of Commissioners -- 3 seats, at-large (same PA-standard model as
-- Beaver's), confirmed current board directly from the county's own
-- Commissioners page.
WITH oc AS (
  INSERT INTO offices (jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level)
  VALUES ('ocd-division/country:us/state:pa/county:armstrong', 'Board of Commissioners', 'at_large', 3, 4, TRUE, TRUE, 'county')
  RETURNING id
), pc1 AS (
  INSERT INTO politicians (full_name, party, current_office_id, bio)
  SELECT 'John Strate', NULL, oc.id,
    'Armstrong County Commissioner, Chairman. Per the county''s own Commissioners page. Term dates not independently confirmed (term_start_precise = FALSE); see this migration''s header for the approximation method. Sourced via AI-research draft step (migration 110), cross-checked 2026-10-03.'
  FROM oc RETURNING id
), pc2 AS (
  INSERT INTO politicians (full_name, party, current_office_id, bio)
  SELECT 'Anthony Shea', NULL, oc.id,
    'Armstrong County Commissioner, Vice-Chairman. Per the county''s own Commissioners page. Same term-date approximation and term_start_precise = FALSE as this migration''s other two Commissioners. Sourced via AI-research draft step (migration 110), cross-checked 2026-10-03.'
  FROM oc RETURNING id
), pc3 AS (
  INSERT INTO politicians (full_name, party, current_office_id, bio)
  SELECT 'Pat Fabian', NULL, oc.id,
    'Armstrong County Commissioner, Secretary. Per the county''s own Commissioners page. Same term-date approximation and term_start_precise = FALSE as this migration''s other two Commissioners. Sourced via AI-research draft step (migration 110), cross-checked 2026-10-03.'
  FROM oc RETURNING id
)
INSERT INTO office_terms (office_id, politician_id, term_start, term_start_precise, how_obtained)
SELECT oc.id, pid, '2024-01-02', FALSE, 'elected' FROM oc, (SELECT id AS pid FROM pc1 UNION ALL SELECT id FROM pc2 UNION ALL SELECT id FROM pc3) AS pids;

WITH osh AS (
  INSERT INTO offices (jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level)
  VALUES ('ocd-division/country:us/state:pa/county:armstrong', 'Sheriff', 'single', 1, 4, TRUE, TRUE, 'county')
  RETURNING id
), psh AS (
  INSERT INTO politicians (full_name, party, current_office_id, bio)
  SELECT 'Frank Pitzer', NULL, osh.id,
    'Armstrong County Sheriff, per the county''s own Sheriff''s Office page. Term dates not independently confirmed (term_start_precise = FALSE). Sourced via AI-research draft step (migration 110), cross-checked 2026-10-03.'
  FROM osh RETURNING id
)
INSERT INTO office_terms (office_id, politician_id, term_start, term_start_precise, how_obtained)
SELECT osh.id, psh.id, '2024-01-02', FALSE, 'elected' FROM osh, psh;

WITH oda AS (
  INSERT INTO offices (jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level)
  VALUES ('ocd-division/country:us/state:pa/county:armstrong', 'District Attorney', 'single', 1, 4, TRUE, TRUE, 'county')
  RETURNING id
), pda AS (
  INSERT INTO politicians (full_name, party, current_office_id, bio)
  SELECT 'Katie M. Charlton', NULL, oda.id,
    'Armstrong County District Attorney, per the county''s own District Attorney page. Term dates not independently confirmed (term_start_precise = FALSE). Sourced via AI-research draft step (migration 110), cross-checked 2026-10-03.'
  FROM oda RETURNING id
)
INSERT INTO office_terms (office_id, politician_id, term_start, term_start_precise, how_obtained)
SELECT oda.id, pda.id, '2024-01-02', FALSE, 'elected' FROM oda, pda;

WITH octl AS (
  INSERT INTO offices (jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level)
  VALUES ('ocd-division/country:us/state:pa/county:armstrong', 'Controller', 'single', 1, 4, TRUE, TRUE, 'county')
  RETURNING id
), pctl AS (
  INSERT INTO politicians (full_name, party, current_office_id, bio)
  SELECT 'Tammie Gaff', NULL, octl.id,
    'Armstrong County Controller, per the county''s own Controller page and the county Prison Board listing (which identifies her, as Controller, as the Prison Board''s Secretary -- cross-confirming the name independently of the Controller page alone). A Wikipedia county-government summary lists a different name ("Myra ''Tammy'' Miller") for this office -- the county''s own official, current site was relied on instead as the more authoritative source, and the discrepancy is disclosed here rather than silently resolved. Sourced via AI-research draft step (migration 110), cross-checked 2026-10-03.'
  FROM octl RETURNING id
)
INSERT INTO office_terms (office_id, politician_id, term_start, term_start_precise, how_obtained)
SELECT octl.id, pctl.id, '2024-01-02', FALSE, 'elected' FROM octl, pctl;

WITH otr AS (
  INSERT INTO offices (jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level)
  VALUES ('ocd-division/country:us/state:pa/county:armstrong', 'Treasurer', 'single', 1, 4, TRUE, TRUE, 'county')
  RETURNING id
), ptr AS (
  INSERT INTO politicians (full_name, party, current_office_id, bio)
  SELECT 'Amanda C. Hiles', NULL, otr.id,
    'Armstrong County Treasurer, per the county''s own Treasurer page. Term dates not independently confirmed (term_start_precise = FALSE). Sourced via AI-research draft step (migration 110), cross-checked 2026-10-03.'
  FROM otr RETURNING id
)
INSERT INTO office_terms (office_id, politician_id, term_start, term_start_precise, how_obtained)
SELECT otr.id, ptr.id, '2024-01-02', FALSE, 'elected' FROM otr, ptr;

-- Prothonotary & Clerk of Courts -- ONE combined elected office in
-- Armstrong County (confirmed directly: both duties held by the same
-- officeholder), not two separate row offices as in some other PA
-- counties.
WITH opc AS (
  INSERT INTO offices (jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level)
  VALUES ('ocd-division/country:us/state:pa/county:armstrong', 'Prothonotary & Clerk of Courts', 'single', 1, 4, TRUE, TRUE, 'county')
  RETURNING id
), ppc AS (
  INSERT INTO politicians (full_name, party, current_office_id, bio)
  SELECT 'Annette Bowser', NULL, opc.id,
    'Armstrong County Prothonotary & Clerk of Courts (one combined elected office in this county), per the county''s own Prothonotary & Clerk of Courts page. Term dates not independently confirmed (term_start_precise = FALSE). Sourced via AI-research draft step (migration 110), cross-checked 2026-10-03.'
  FROM opc RETURNING id
)
INSERT INTO office_terms (office_id, politician_id, term_start, term_start_precise, how_obtained)
SELECT opc.id, ppc.id, '2024-01-02', FALSE, 'elected' FROM opc, ppc;

-- Register of Wills & Recorder of Deeds -- ONE combined elected office in
-- Armstrong County, also covering Clerk of the Orphans' Court duties
-- (confirmed directly: "this office consists of three individual
-- offices... all held by" the same person).
WITH orw AS (
  INSERT INTO offices (jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level)
  VALUES ('ocd-division/country:us/state:pa/county:armstrong', 'Register of Wills & Recorder of Deeds', 'single', 1, 4, TRUE, TRUE, 'county')
  RETURNING id
), prw AS (
  INSERT INTO politicians (full_name, party, current_office_id, bio)
  SELECT 'Lori Hirst', NULL, orw.id,
    'Armstrong County Register of Wills & Recorder of Deeds (one combined elected office in this county, also covering Clerk of the Orphans'' Court duties), per the county''s own Register & Recorder page and independently confirmed via the Pennsylvania Recorders of Deeds Association''s own county-officials list. Term dates not independently confirmed (term_start_precise = FALSE). Sourced via AI-research draft step (migration 110), cross-checked 2026-10-03.'
  FROM orw RETURNING id
)
INSERT INTO office_terms (office_id, politician_id, term_start, term_start_precise, how_obtained)
SELECT orw.id, prw.id, '2024-01-02', FALSE, 'elected' FROM orw, prw;

WITH oco AS (
  INSERT INTO offices (jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level)
  VALUES ('ocd-division/country:us/state:pa/county:armstrong', 'Coroner', 'single', 1, 4, TRUE, TRUE, 'county')
  RETURNING id
), pco AS (
  INSERT INTO politicians (full_name, party, current_office_id, bio)
  SELECT 'Brian K. Myers', NULL, oco.id,
    'Armstrong County Coroner, per the county''s own Coroner page. Term dates not independently confirmed (term_start_precise = FALSE). Sourced via AI-research draft step (migration 110), cross-checked 2026-10-03.'
  FROM oco RETURNING id
)
INSERT INTO office_terms (office_id, politician_id, term_start, term_start_precise, how_obtained)
SELECT oco.id, pco.id, '2024-01-02', FALSE, 'elected' FROM oco, pco;

-- Jury Commissioner: deliberately NOT created. Confirmed abolished as an
-- elected office effective 2018 (Armstrong County commissioners' own
-- vote, enabled by a 2013 PA County Code amendment letting counties
-- eliminate this office by ordinance) -- the function is now handled by
-- an appointed clerical staff position (a "Jury Commissioner Clerk"),
-- not a public elected seat this project tracks.
