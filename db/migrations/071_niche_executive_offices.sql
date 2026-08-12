-- D6 state foundation, tier C mop-up: 5 niche elected offices sized up
-- and confirmed this session -- Texas Railroad Commission, New Hampshire
-- Executive Council, Massachusetts Governor's Council, California State
-- Board of Equalization (district seats only), and Arizona State Mine
-- Inspector. Same shape as every migration in this tier -- small
-- hand-verified data, not an ingester.
--
-- These came from Ballotpedia's full state-executive-office taxonomy
-- (fetched via the "State_executive_offices" portal page), which lists
-- several categories beyond the ones already built: State Board of
-- Equalization, Industrial Commission Director, State Mine Inspector,
-- Railroad Commission, Department of Revenue Commissioner, Commissioner
-- of Energy and Environmental Protection, Director of Economic
-- Opportunity, Director of Commerce and Consumer Affairs, Executive
-- Council/Governor's Council, Transportation Commission, Employment
-- Security Commission. Only the 5 in this migration were confirmed
-- popularly elected; the rest all match the "Director/Commissioner of
-- [state agency]" naming pattern that has, without exception across
-- roughly 15 prior checks this session, turned out to be the appointed
-- counterpart (Alaska's Director of Insurance, Minnesota's Commissioner
-- of Management and Budget, etc.) -- not individually re-verified one by
-- one here, since the pattern's hit rate didn't justify the verification
-- cost for offices this obscure, but flagged as a real, if low-
-- probability, gap rather than asserted complete.
--
-- Two more items surfaced but deliberately NOT built here, flagged for a
-- separate decision: "Chief Financial Officer" and "State Examiner" from
-- that same taxonomy are not new offices at all -- they're Florida's real
-- name for its Treasurer-equivalent (already in migration 067) and
-- Indiana's real name for its Auditor-equivalent (already correctly
-- excluded as appointed) respectively. And a genuinely separate, NOT
-- sized-up-yet category turned up while researching Texas's Railroad
-- Commission: "State Board of Education" -- distinct from Board of
-- EQUALIZATION -- exists as a popularly elected multi-member body in at
-- least Texas (15 districts, confirmed partisan) and possibly other
-- states, while New Hampshire's and California's own versions are
-- Nonpartisan-tagged (likely appointed, not independently confirmed
-- either way). This wasn't in the original taxonomy list scanned for
-- this migration's scope and needs its own sizing pass before building.
--
-- Texas Railroad Commission: despite the name, has not regulated
-- railroads since the 1980s -- it's Texas's oil/gas/pipeline-safety
-- regulator. 3 members, at-large (no districts), 6-year terms.
--
-- New Hampshire's Executive Council and Massachusetts's Governor's
-- Council are the same real institution in two states: an elected body
-- that approves the Governor's major appointments/contracts/pardons (NH)
-- or judicial nominations/pardons (MA) -- a genuine elected check on
-- gubernatorial power, not merely advisory. NH: 5 districts, 2-year
-- terms. MA: 8 districts, 2-year terms (confirmed via search, not
-- assumed uniform with MA's other 4-year offices).
--
-- California's State Board of Equalization: 4 elected district seats
-- (this migration); a 5th seat is filled ex officio by the State
-- Controller, already modeled as its own office in migration 067 -- NOT
-- duplicated here. Once a broader tax-policy body before a 2017 reform
-- moved most functions to two new agencies; still real and still
-- elected. 4-year terms.
--
-- Arizona State Mine Inspector: the only state that separately elects a
-- mine-safety regulator -- 1 seat. Term length individually confirmed via
-- Arizona's own page field ("Length of term: 4 years") rather than
-- trusted from an ambiguous search-result summary that conflated current
-- reality with the title of a related, still-pending 2026 ballot measure
-- on the same subject.

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('44000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:tx', 'Railroad Commissioner', 'at_large', 3, 6, TRUE, TRUE, 'state'),
  ('44000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:nh', 'Executive Council — District 1', 'single', 1, 2, TRUE, TRUE, 'state'),
  ('44000000-0000-4000-8000-000000000003', 'ocd-division/country:us/state:nh', 'Executive Council — District 2', 'single', 1, 2, TRUE, TRUE, 'state'),
  ('44000000-0000-4000-8000-000000000004', 'ocd-division/country:us/state:nh', 'Executive Council — District 3', 'single', 1, 2, TRUE, TRUE, 'state'),
  ('44000000-0000-4000-8000-000000000005', 'ocd-division/country:us/state:nh', 'Executive Council — District 4', 'single', 1, 2, TRUE, TRUE, 'state'),
  ('44000000-0000-4000-8000-000000000006', 'ocd-division/country:us/state:nh', 'Executive Council — District 5', 'single', 1, 2, TRUE, TRUE, 'state'),
  ('44000000-0000-4000-8000-000000000007', 'ocd-division/country:us/state:ma', 'Governor''s Council — District 1', 'single', 1, 2, TRUE, TRUE, 'state'),
  ('44000000-0000-4000-8000-000000000008', 'ocd-division/country:us/state:ma', 'Governor''s Council — District 2', 'single', 1, 2, TRUE, TRUE, 'state'),
  ('44000000-0000-4000-8000-000000000009', 'ocd-division/country:us/state:ma', 'Governor''s Council — District 3', 'single', 1, 2, TRUE, TRUE, 'state'),
  ('44000000-0000-4000-8000-000000000010', 'ocd-division/country:us/state:ma', 'Governor''s Council — District 4', 'single', 1, 2, TRUE, TRUE, 'state'),
  ('44000000-0000-4000-8000-000000000011', 'ocd-division/country:us/state:ma', 'Governor''s Council — District 5', 'single', 1, 2, TRUE, TRUE, 'state'),
  ('44000000-0000-4000-8000-000000000012', 'ocd-division/country:us/state:ma', 'Governor''s Council — District 6', 'single', 1, 2, TRUE, TRUE, 'state'),
  ('44000000-0000-4000-8000-000000000013', 'ocd-division/country:us/state:ma', 'Governor''s Council — District 7', 'single', 1, 2, TRUE, TRUE, 'state'),
  ('44000000-0000-4000-8000-000000000014', 'ocd-division/country:us/state:ma', 'Governor''s Council — District 8', 'single', 1, 2, TRUE, TRUE, 'state'),
  ('44000000-0000-4000-8000-000000000015', 'ocd-division/country:us/state:ca', 'State Board of Equalization — District 1', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('44000000-0000-4000-8000-000000000016', 'ocd-division/country:us/state:ca', 'State Board of Equalization — District 2', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('44000000-0000-4000-8000-000000000017', 'ocd-division/country:us/state:ca', 'State Board of Equalization — District 3', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('44000000-0000-4000-8000-000000000018', 'ocd-division/country:us/state:ca', 'State Board of Equalization — District 4', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('44000000-0000-4000-8000-000000000019', 'ocd-division/country:us/state:az', 'State Mine Inspector', 'single', 1, 4, TRUE, TRUE, 'state');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('45000000-0000-4000-8000-000000000001', 'Wayne Christian', 'R', '44000000-0000-4000-8000-000000000001', 'Railroad Commissioner (Texas; real office title in the source: "Texas Railroad Commission"), took office January 1, 2017. Elects a 3-member commission regulating oil, gas, and pipeline safety -- despite the name, it has not regulated railroads since the 1980s. Sourced from Ballotpedia, verified 2026-08-12.'),
  ('45000000-0000-4000-8000-000000000002', 'Christi Craddick', 'R', '44000000-0000-4000-8000-000000000001', 'Railroad Commissioner (Texas; real office title in the source: "Texas Railroad Commission"), took office December 17, 2012. Elects a 3-member commission regulating oil, gas, and pipeline safety -- despite the name, it has not regulated railroads since the 1980s. Sourced from Ballotpedia, verified 2026-08-12.'),
  ('45000000-0000-4000-8000-000000000003', 'James Wright', 'R', '44000000-0000-4000-8000-000000000001', 'Railroad Commissioner (Texas; real office title in the source: "Texas Railroad Commission"), took office January 1, 2021. Elects a 3-member commission regulating oil, gas, and pipeline safety -- despite the name, it has not regulated railroads since the 1980s. Sourced from Ballotpedia, verified 2026-08-12.'),
  ('45000000-0000-4000-8000-000000000004', 'Joseph Kenney', 'R', '44000000-0000-4000-8000-000000000002', 'Executive Council — District 1 (New Hampshire; real office title in the source: "New Hampshire Executive Council District 1"), took office January 6, 2021. Approves the Governor''s major appointments, state contracts, and pardons -- a real elected check on gubernatorial power unique to New Hampshire (and, structurally, Massachusetts). Sourced from Ballotpedia, verified 2026-08-12.'),
  ('45000000-0000-4000-8000-000000000005', 'Karen Liot Hill', 'D', '44000000-0000-4000-8000-000000000003', 'Executive Council — District 2 (New Hampshire; real office title in the source: "New Hampshire Executive Council District 2"), took office January 8, 2025. Approves the Governor''s major appointments, state contracts, and pardons -- a real elected check on gubernatorial power unique to New Hampshire (and, structurally, Massachusetts). Sourced from Ballotpedia, verified 2026-08-12.'),
  ('45000000-0000-4000-8000-000000000006', 'Janet Stevens', 'R', '44000000-0000-4000-8000-000000000004', 'Executive Council — District 3 (New Hampshire; real office title in the source: "New Hampshire Executive Council District 3"), took office January 6, 2021. Approves the Governor''s major appointments, state contracts, and pardons -- a real elected check on gubernatorial power unique to New Hampshire (and, structurally, Massachusetts). Sourced from Ballotpedia, verified 2026-08-12.'),
  ('45000000-0000-4000-8000-000000000007', 'John Stephen', 'R', '44000000-0000-4000-8000-000000000005', 'Executive Council — District 4 (New Hampshire; real office title in the source: "New Hampshire Executive Council District 4"), took office January 8, 2025. Approves the Governor''s major appointments, state contracts, and pardons -- a real elected check on gubernatorial power unique to New Hampshire (and, structurally, Massachusetts). Sourced from Ballotpedia, verified 2026-08-12.'),
  ('45000000-0000-4000-8000-000000000008', 'Dave Wheeler', 'R', '44000000-0000-4000-8000-000000000006', 'Executive Council — District 5 (New Hampshire; real office title in the source: "New Hampshire Executive Council District 5"), took office January 6, 2021. Approves the Governor''s major appointments, state contracts, and pardons -- a real elected check on gubernatorial power unique to New Hampshire (and, structurally, Massachusetts). Sourced from Ballotpedia, verified 2026-08-12.'),
  ('45000000-0000-4000-8000-000000000009', 'Joseph Ferreira', 'D', '44000000-0000-4000-8000-000000000007', 'Governor''s Council — District 1 (Massachusetts; real office title in the source: "Massachusetts Governor''s Council District 1"), took office January 8, 2015. Approves the Governor''s judicial nominations, pardons, and other major acts -- same constitutional-check function as New Hampshire''s Executive Council above. Sourced from Ballotpedia, verified 2026-08-12.'),
  ('45000000-0000-4000-8000-000000000010', 'Tamisha Civil', 'D', '44000000-0000-4000-8000-000000000008', 'Governor''s Council — District 2 (Massachusetts; real office title in the source: "Massachusetts Governor''s Council District 2"), took office January 2, 2025. Approves the Governor''s judicial nominations, pardons, and other major acts -- same constitutional-check function as New Hampshire''s Executive Council above. Sourced from Ballotpedia, verified 2026-08-12.'),
  ('45000000-0000-4000-8000-000000000011', 'Mara Dolan', 'D', '44000000-0000-4000-8000-000000000009', 'Governor''s Council — District 3 (Massachusetts; real office title in the source: "Massachusetts Governor''s Council District 3"), took office January 2, 2025. Approves the Governor''s judicial nominations, pardons, and other major acts -- same constitutional-check function as New Hampshire''s Executive Council above. Sourced from Ballotpedia, verified 2026-08-12.'),
  ('45000000-0000-4000-8000-000000000012', 'Christopher Iannella', 'D', '44000000-0000-4000-8000-000000000010', 'Governor''s Council — District 4 (Massachusetts; real office title in the source: "Massachusetts Governor''s Council District 4"), took office January 7, 1993. Approves the Governor''s judicial nominations, pardons, and other major acts -- same constitutional-check function as New Hampshire''s Executive Council above. Sourced from Ballotpedia, verified 2026-08-12.'),
  ('45000000-0000-4000-8000-000000000013', 'Eunice Zeigler', 'D', '44000000-0000-4000-8000-000000000011', 'Governor''s Council — District 5 (Massachusetts; real office title in the source: "Massachusetts Governor''s Council District 5"), took office January 2, 2025. Approves the Governor''s judicial nominations, pardons, and other major acts -- same constitutional-check function as New Hampshire''s Executive Council above. Sourced from Ballotpedia, verified 2026-08-12.'),
  ('45000000-0000-4000-8000-000000000014', 'Terrence Kennedy', 'D', '44000000-0000-4000-8000-000000000012', 'Governor''s Council — District 6 (Massachusetts; real office title in the source: "Massachusetts Governor''s Council District 6"), took office January 6, 2011. Approves the Governor''s judicial nominations, pardons, and other major acts -- same constitutional-check function as New Hampshire''s Executive Council above. Sourced from Ballotpedia, verified 2026-08-12.'),
  ('45000000-0000-4000-8000-000000000015', 'Paul DePalo', 'D', '44000000-0000-4000-8000-000000000013', 'Governor''s Council — District 7 (Massachusetts; real office title in the source: "Massachusetts Governor''s Council District 7"), took office January 7, 2021. Approves the Governor''s judicial nominations, pardons, and other major acts -- same constitutional-check function as New Hampshire''s Executive Council above. Sourced from Ballotpedia, verified 2026-08-12.'),
  ('45000000-0000-4000-8000-000000000016', 'Tara Jacobs', 'D', '44000000-0000-4000-8000-000000000014', 'Governor''s Council — District 8 (Massachusetts; real office title in the source: "Massachusetts Governor''s Council District 8"), took office January 5, 2023. Approves the Governor''s judicial nominations, pardons, and other major acts -- same constitutional-check function as New Hampshire''s Executive Council above. Sourced from Ballotpedia, verified 2026-08-12.'),
  ('45000000-0000-4000-8000-000000000017', 'Ted Gaines', 'R', '44000000-0000-4000-8000-000000000015', 'State Board of Equalization — District 1 (California; real office title in the source: "California State Board of Equalization District 1"), took office January 7, 2019. Property/sales-tax oversight body (narrowed by a 2017 reform that moved most functions to two new agencies). A 5th seat is filled ex officio by the State Controller, already modeled as its own office in migration 067 -- not duplicated here. Sourced from Ballotpedia, verified 2026-08-12.'),
  ('45000000-0000-4000-8000-000000000018', 'Sally Lieber', 'D', '44000000-0000-4000-8000-000000000016', 'State Board of Equalization — District 2 (California; real office title in the source: "California State Board of Equalization District 2"), took office January 2, 2023. Property/sales-tax oversight body (narrowed by a 2017 reform that moved most functions to two new agencies). A 5th seat is filled ex officio by the State Controller, already modeled as its own office in migration 067 -- not duplicated here. Sourced from Ballotpedia, verified 2026-08-12.'),
  ('45000000-0000-4000-8000-000000000019', 'Tony Vazquez', 'D', '44000000-0000-4000-8000-000000000017', 'State Board of Equalization — District 3 (California; real office title in the source: "California State Board of Equalization District 3"), took office January 12, 2019. Property/sales-tax oversight body (narrowed by a 2017 reform that moved most functions to two new agencies). A 5th seat is filled ex officio by the State Controller, already modeled as its own office in migration 067 -- not duplicated here. Sourced from Ballotpedia, verified 2026-08-12.'),
  ('45000000-0000-4000-8000-000000000020', 'Mike Schaefer', 'D', '44000000-0000-4000-8000-000000000018', 'State Board of Equalization — District 4 (California; real office title in the source: "California State Board of Equalization District 4"), took office January 1, 2019. Property/sales-tax oversight body (narrowed by a 2017 reform that moved most functions to two new agencies). A 5th seat is filled ex officio by the State Controller, already modeled as its own office in migration 067 -- not duplicated here. Sourced from Ballotpedia, verified 2026-08-12.'),
  ('45000000-0000-4000-8000-000000000021', 'Les Presmyk', 'R', '44000000-0000-4000-8000-000000000019', 'State Mine Inspector (Arizona; real office title in the source: "Arizona State Mine Inspector"), took office September 12, 2025. Arizona is the only state that separately elects a mine-safety regulator. Sourced from Ballotpedia, verified 2026-08-12.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('44000000-0000-4000-8000-000000000001', '45000000-0000-4000-8000-000000000001', '2017-01-01', 'elected'),
  ('44000000-0000-4000-8000-000000000001', '45000000-0000-4000-8000-000000000002', '2012-12-17', 'elected'),
  ('44000000-0000-4000-8000-000000000001', '45000000-0000-4000-8000-000000000003', '2021-01-01', 'elected'),
  ('44000000-0000-4000-8000-000000000002', '45000000-0000-4000-8000-000000000004', '2021-01-06', 'elected'),
  ('44000000-0000-4000-8000-000000000003', '45000000-0000-4000-8000-000000000005', '2025-01-08', 'elected'),
  ('44000000-0000-4000-8000-000000000004', '45000000-0000-4000-8000-000000000006', '2021-01-06', 'elected'),
  ('44000000-0000-4000-8000-000000000005', '45000000-0000-4000-8000-000000000007', '2025-01-08', 'elected'),
  ('44000000-0000-4000-8000-000000000006', '45000000-0000-4000-8000-000000000008', '2021-01-06', 'elected'),
  ('44000000-0000-4000-8000-000000000007', '45000000-0000-4000-8000-000000000009', '2015-01-08', 'elected'),
  ('44000000-0000-4000-8000-000000000008', '45000000-0000-4000-8000-000000000010', '2025-01-02', 'elected'),
  ('44000000-0000-4000-8000-000000000009', '45000000-0000-4000-8000-000000000011', '2025-01-02', 'elected'),
  ('44000000-0000-4000-8000-000000000010', '45000000-0000-4000-8000-000000000012', '1993-01-07', 'elected'),
  ('44000000-0000-4000-8000-000000000011', '45000000-0000-4000-8000-000000000013', '2025-01-02', 'elected'),
  ('44000000-0000-4000-8000-000000000012', '45000000-0000-4000-8000-000000000014', '2011-01-06', 'elected'),
  ('44000000-0000-4000-8000-000000000013', '45000000-0000-4000-8000-000000000015', '2021-01-07', 'elected'),
  ('44000000-0000-4000-8000-000000000014', '45000000-0000-4000-8000-000000000016', '2023-01-05', 'elected'),
  ('44000000-0000-4000-8000-000000000015', '45000000-0000-4000-8000-000000000017', '2019-01-07', 'elected'),
  ('44000000-0000-4000-8000-000000000016', '45000000-0000-4000-8000-000000000018', '2023-01-02', 'elected'),
  ('44000000-0000-4000-8000-000000000017', '45000000-0000-4000-8000-000000000019', '2019-01-12', 'elected'),
  ('44000000-0000-4000-8000-000000000018', '45000000-0000-4000-8000-000000000020', '2019-01-01', 'elected'),
  ('44000000-0000-4000-8000-000000000019', '45000000-0000-4000-8000-000000000021', '2025-09-12', 'elected');
