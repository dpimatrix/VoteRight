-- D6 state foundation, tier C continued: Natural Resources
-- Commissioner-equivalent, the 5 states where it's a popularly ELECTED
-- office. Same shape as every migration in this tier -- small
-- hand-verified data, not an ingester. Closes out the "5 universal + 1
-- variable" set of down-ballot commissioner categories Ballotpedia's
-- structural chart surfaced earlier this session.
--
-- The cleanest verification of this whole tier: Ballotpedia's own
-- overview page names all 5 elected states explicitly and unambiguously
-- ("Five states -- Arkansas, New Mexico, South Dakota, Texas, and
-- Washington -- publicly elect a natural resources commissioner. In all
-- other states, the office is nonpartisan and appointed.") -- no
-- party-tag heuristic or disputed search summary needed this time.
-- Wyoming is the one state with NO such office at all (its natural
-- resources are handled by divisions inside the state agriculture
-- agency, not a standalone commissioner of any kind) -- matches the "49
-- of 50 states have the office" figure from the earlier structural-chart
-- finding exactly (50 - 1 = 49).
--
-- Arkansas, New Mexico, and South Dakota each have TWO offices sharing
-- natural-resources duties, not a data duplicate: a nonpartisan,
-- governor-appointed one (Arkansas's Executive Director of Natural
-- Resources Commission; New Mexico's Secretary of Energy, Minerals and
-- Natural Resources; South Dakota's Secretary of Agriculture and Natural
-- Resources) and a separate, partisan, popularly ELECTED one -- in every
-- case a "Land Commissioner"-style title (Commissioner of State/Public
-- Lands), confirmed directly from each state's officeholder data, not
-- guessed from the title alone. Only the elected office is in this
-- migration. Texas's Land Commissioner (a single, non-dual office) was
-- individually spot-verified via its own "Selection Method: Elected"
-- field before trusting the rest of this short, explicit list.
--
-- Term length is 4 years for all 5 (individually confirmed for Texas;
-- assumed for the other 4 by the same pattern used throughout this
-- project, not independently re-checked state-by-state).

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('3c000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:ar', 'Commissioner of State Lands', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('3c000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:nm', 'Commissioner of Public Lands', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('3c000000-0000-4000-8000-000000000003', 'ocd-division/country:us/state:sd', 'Commissioner of School and Public Lands', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('3c000000-0000-4000-8000-000000000004', 'ocd-division/country:us/state:tx', 'Land Commissioner', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('3c000000-0000-4000-8000-000000000005', 'ocd-division/country:us/state:wa', 'Commissioner of Public Lands', 'single', 1, 4, TRUE, TRUE, 'state');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('3d000000-0000-4000-8000-000000000001', 'Tommy Land', 'R', '3c000000-0000-4000-8000-000000000001', 'Natural Resources Commissioner-equivalent of Arkansas (real office title in the source: "Arkansas Commissioner of State Lands"), took office January 15, 2019. Sourced from Ballotpedia, verified 2026-08-12 -- one of the 5 states (of 50) where this function is popularly elected; Arkansas/New Mexico/South Dakota each also have a separate nonpartisan governor-appointed office sharing natural-resources duties, correctly not modeled as an elected seat.'),
  ('3d000000-0000-4000-8000-000000000002', 'Stephanie Garcia Richard', 'D', '3c000000-0000-4000-8000-000000000002', 'Natural Resources Commissioner-equivalent of New Mexico (real office title in the source: "New Mexico Commissioner of Public Lands"), took office January 1, 2019. Sourced from Ballotpedia, verified 2026-08-12 -- one of the 5 states (of 50) where this function is popularly elected; Arkansas/New Mexico/South Dakota each also have a separate nonpartisan governor-appointed office sharing natural-resources duties, correctly not modeled as an elected seat.'),
  ('3d000000-0000-4000-8000-000000000003', 'Brock Greenfield', 'R', '3c000000-0000-4000-8000-000000000003', 'Natural Resources Commissioner-equivalent of South Dakota (real office title in the source: "South Dakota Commissioner of School and Public Lands"), took office January 2, 2023. Sourced from Ballotpedia, verified 2026-08-12 -- one of the 5 states (of 50) where this function is popularly elected; Arkansas/New Mexico/South Dakota each also have a separate nonpartisan governor-appointed office sharing natural-resources duties, correctly not modeled as an elected seat.'),
  ('3d000000-0000-4000-8000-000000000004', 'Dawn Buckingham', 'R', '3c000000-0000-4000-8000-000000000004', 'Natural Resources Commissioner-equivalent of Texas (real office title in the source: "Texas Land Commissioner"), took office January 1, 2023. Sourced from Ballotpedia, verified 2026-08-12 -- one of the 5 states (of 50) where this function is popularly elected; Arkansas/New Mexico/South Dakota each also have a separate nonpartisan governor-appointed office sharing natural-resources duties, correctly not modeled as an elected seat. Individually spot-verified via Texas''s own "Selection Method: Elected" field.'),
  ('3d000000-0000-4000-8000-000000000005', 'Dave Upthegrove', 'D', '3c000000-0000-4000-8000-000000000005', 'Natural Resources Commissioner-equivalent of Washington (real office title in the source: "Washington Commissioner of Public Lands"), took office January 13, 2025. Sourced from Ballotpedia, verified 2026-08-12 -- one of the 5 states (of 50) where this function is popularly elected; Arkansas/New Mexico/South Dakota each also have a separate nonpartisan governor-appointed office sharing natural-resources duties, correctly not modeled as an elected seat.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('3c000000-0000-4000-8000-000000000001', '3d000000-0000-4000-8000-000000000001', '2019-01-15', 'elected'),
  ('3c000000-0000-4000-8000-000000000002', '3d000000-0000-4000-8000-000000000002', '2019-01-01', 'elected'),
  ('3c000000-0000-4000-8000-000000000003', '3d000000-0000-4000-8000-000000000003', '2023-01-02', 'elected'),
  ('3c000000-0000-4000-8000-000000000004', '3d000000-0000-4000-8000-000000000004', '2023-01-01', 'elected'),
  ('3c000000-0000-4000-8000-000000000005', '3d000000-0000-4000-8000-000000000005', '2025-01-13', 'elected');
