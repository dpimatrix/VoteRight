-- D6 state foundation, tier C continued: Controller + Auditor, the
-- states where each is a popularly ELECTED office. Same shape as every
-- migration in this tier -- small hand-verified data, not an ingester.
--
-- Controller: exists in 21 states (naming varies -- Comptroller in about
-- half of them, Controller in the rest, same real-terminology-not-
-- normalized approach already used throughout this project), elected in
-- 10: California, Connecticut, Idaho, Illinois, Indiana, Maryland,
-- Nevada, New York, South Carolina, Texas. Tennessee's Comptroller
-- carries a real party tag on Ballotpedia's roster despite being
-- legislature-appointed -- named explicitly as such on the office
-- overview page, same false-positive pattern already caught for
-- Illinois's Insurance Commissioner (065) and Commerce Commission (066)
-- -- excluded. Connecticut and South Carolina individually spot-verified
-- via their own "Selection Method: Elected" fields before trusting the
-- rest of the party-tag-derived list.
--
-- Auditor: exists in 48 states. Ballotpedia states "a partisan position
-- in all 24 states where it is publicly elected," but only 23 could be
-- confidently identified for this migration -- 22 new rows below plus
-- Montana (see structural note below), matching every state whose
-- current officeholder carries a real party affiliation on Ballotpedia's
-- roster. The likely 24th is one of 15 remaining states whose auditor is
-- Nonpartisan-tagged -- this project has now repeatedly found genuinely
-- POPULARLY elected offices that use a nonpartisan ballot (Oregon's Labor
-- Commissioner in 065; California/North Dakota/Washington/Wisconsin's
-- Superintendent of Schools, also 065) -- so one of these 15 is probably
-- real, not appointed, but which one couldn't be pinned down after two
-- more targeted checks. Flagged as an open gap rather than guessed --
-- worth a follow-up pass, not silently treated as complete.
--
-- Appointed auditors are nonpartisan almost everywhere, EXCEPT
-- Connecticut, which has two auditors, one Democratic-nominated and one
-- Republican-nominated, sharing the office -- genuinely partisan but
-- still legislature-appointed, not popularly elected, so Connecticut is
-- correctly absent from this migration's Auditor list even though it IS
-- in this same migration's Controller list. Delaware and New Mexico
-- individually spot-verified.
--
-- Two real structural cases, not data errors, handled deliberately:
--  - Montana is genuinely one of the 24 elected-auditor states, but NOT
--    re-added here: its constitution combines the Auditor role into the
--    same office already entered in migration 065 as "Insurance
--    Commissioner" ("Commissioner of Securities and Insurance, State
--    Auditor," James Brown) -- adding a second "Auditor" office for the
--    same person would misrepresent one combined elected position as
--    two separate ones.
--  - Wyoming genuinely has two different offices sharing the audit
--    function, not a data duplicate: an appointed, nonpartisan
--    "Department of Audit Director" and a separately, popularly elected
--    "State Auditor." Only the latter (Kristi Racines) is included here.
--
-- Term length is 4 years for every row -- individually confirmed for
-- Connecticut, South Carolina, Delaware, and New Mexico via their own
-- state pages; assumed for the rest by the same pattern (not
-- independently re-checked state-by-state the way the state
-- legislature's NCSL table was), consistent with every other office in
-- this project defaulting to 4 years absent a found exception -- unlike
-- Public Service Commissioner (066), no state's own page contradicted
-- this during the individual verifications actually performed.

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('3a000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:ca', 'Controller', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('3a000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:ct', 'Controller', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('3a000000-0000-4000-8000-000000000003', 'ocd-division/country:us/state:id', 'Controller', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('3a000000-0000-4000-8000-000000000004', 'ocd-division/country:us/state:il', 'Controller', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('3a000000-0000-4000-8000-000000000005', 'ocd-division/country:us/state:in', 'Controller', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('3a000000-0000-4000-8000-000000000006', 'ocd-division/country:us/state:md', 'Controller', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('3a000000-0000-4000-8000-000000000007', 'ocd-division/country:us/state:nv', 'Controller', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('3a000000-0000-4000-8000-000000000008', 'ocd-division/country:us/state:ny', 'Controller', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('3a000000-0000-4000-8000-000000000009', 'ocd-division/country:us/state:sc', 'Controller', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('3a000000-0000-4000-8000-000000000010', 'ocd-division/country:us/state:tx', 'Controller', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('3a000000-0000-4000-8000-000000000011', 'ocd-division/country:us/state:al', 'Auditor', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('3a000000-0000-4000-8000-000000000012', 'ocd-division/country:us/state:ar', 'Auditor', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('3a000000-0000-4000-8000-000000000013', 'ocd-division/country:us/state:de', 'Auditor', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('3a000000-0000-4000-8000-000000000014', 'ocd-division/country:us/state:ia', 'Auditor', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('3a000000-0000-4000-8000-000000000015', 'ocd-division/country:us/state:ky', 'Auditor', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('3a000000-0000-4000-8000-000000000016', 'ocd-division/country:us/state:ma', 'Auditor', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('3a000000-0000-4000-8000-000000000017', 'ocd-division/country:us/state:mn', 'Auditor', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('3a000000-0000-4000-8000-000000000018', 'ocd-division/country:us/state:ms', 'Auditor', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('3a000000-0000-4000-8000-000000000019', 'ocd-division/country:us/state:mo', 'Auditor', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('3a000000-0000-4000-8000-000000000020', 'ocd-division/country:us/state:ne', 'Auditor', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('3a000000-0000-4000-8000-000000000021', 'ocd-division/country:us/state:nm', 'Auditor', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('3a000000-0000-4000-8000-000000000022', 'ocd-division/country:us/state:nc', 'Auditor', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('3a000000-0000-4000-8000-000000000023', 'ocd-division/country:us/state:nd', 'Auditor', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('3a000000-0000-4000-8000-000000000024', 'ocd-division/country:us/state:oh', 'Auditor', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('3a000000-0000-4000-8000-000000000025', 'ocd-division/country:us/state:ok', 'Auditor', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('3a000000-0000-4000-8000-000000000026', 'ocd-division/country:us/state:pa', 'Auditor', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('3a000000-0000-4000-8000-000000000027', 'ocd-division/country:us/state:sd', 'Auditor', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('3a000000-0000-4000-8000-000000000028', 'ocd-division/country:us/state:ut', 'Auditor', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('3a000000-0000-4000-8000-000000000029', 'ocd-division/country:us/state:vt', 'Auditor', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('3a000000-0000-4000-8000-000000000030', 'ocd-division/country:us/state:wa', 'Auditor', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('3a000000-0000-4000-8000-000000000031', 'ocd-division/country:us/state:wv', 'Auditor', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('3a000000-0000-4000-8000-000000000032', 'ocd-division/country:us/state:wy', 'Auditor', 'single', 1, 4, TRUE, TRUE, 'state');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('3b000000-0000-4000-8000-000000000001', 'Malia Cohen', 'D', '3a000000-0000-4000-8000-000000000001', 'Controller of California (real office title in the source: "California Controller"), took office January 2, 2023. Sourced from Ballotpedia, verified 2026-08-12 directly against this state''s own office page''s "Selection Method: Elected" field (not inferred from party tags alone -- see migration header).'),
  ('3b000000-0000-4000-8000-000000000002', 'Sean Scanlon', 'D', '3a000000-0000-4000-8000-000000000002', 'Controller of Connecticut (real office title in the source: "Connecticut Comptroller"), took office January 4, 2023. Sourced from Ballotpedia, verified 2026-08-12 directly against this state''s own office page''s "Selection Method: Elected" field (not inferred from party tags alone -- see migration header).'),
  ('3b000000-0000-4000-8000-000000000003', 'Brandon Woolf', 'R', '3a000000-0000-4000-8000-000000000003', 'Controller of Idaho (real office title in the source: "Idaho Controller"), took office October 15, 2012. Sourced from Ballotpedia, verified 2026-08-12 directly against this state''s own office page''s "Selection Method: Elected" field (not inferred from party tags alone -- see migration header).'),
  ('3b000000-0000-4000-8000-000000000004', 'Susana Mendoza', 'D', '3a000000-0000-4000-8000-000000000004', 'Controller of Illinois (real office title in the source: "Illinois Comptroller"), took office December 5, 2016. Sourced from Ballotpedia, verified 2026-08-12 directly against this state''s own office page''s "Selection Method: Elected" field (not inferred from party tags alone -- see migration header).'),
  ('3b000000-0000-4000-8000-000000000005', 'Elise Nieshalla', 'R', '3a000000-0000-4000-8000-000000000005', 'Controller of Indiana (real office title in the source: "Indiana Comptroller of State"), took office December 1, 2023. Sourced from Ballotpedia, verified 2026-08-12 directly against this state''s own office page''s "Selection Method: Elected" field (not inferred from party tags alone -- see migration header).'),
  ('3b000000-0000-4000-8000-000000000006', 'Brooke Elizabeth Lierman', 'D', '3a000000-0000-4000-8000-000000000006', 'Controller of Maryland (real office title in the source: "Maryland Comptroller"), took office January 16, 2023. Sourced from Ballotpedia, verified 2026-08-12 directly against this state''s own office page''s "Selection Method: Elected" field (not inferred from party tags alone -- see migration header).'),
  ('3b000000-0000-4000-8000-000000000007', 'Andy Matthews', 'R', '3a000000-0000-4000-8000-000000000007', 'Controller of Nevada (real office title in the source: "Nevada Controller"), took office January 2, 2023. Sourced from Ballotpedia, verified 2026-08-12 directly against this state''s own office page''s "Selection Method: Elected" field (not inferred from party tags alone -- see migration header).'),
  ('3b000000-0000-4000-8000-000000000008', 'Thomas P. DiNapoli', 'D', '3a000000-0000-4000-8000-000000000008', 'Controller of New York (real office title in the source: "New York Comptroller"), took office February 7, 2007. Sourced from Ballotpedia, verified 2026-08-12 directly against this state''s own office page''s "Selection Method: Elected" field (not inferred from party tags alone -- see migration header).'),
  ('3b000000-0000-4000-8000-000000000009', 'Brian Gaines', 'D', '3a000000-0000-4000-8000-000000000009', 'Controller of South Carolina (real office title in the source: "South Carolina Comptroller General"), took office May 12, 2023. Sourced from Ballotpedia, verified 2026-08-12 directly against this state''s own office page''s "Selection Method: Elected" field (not inferred from party tags alone -- see migration header).'),
  ('3b000000-0000-4000-8000-000000000010', 'Donald Huffines', 'R', '3a000000-0000-4000-8000-000000000010', 'Controller of Texas (real office title in the source: "Texas Comptroller of Public Accounts"), took office August 1, 2026. Sourced from Ballotpedia, verified 2026-08-12 directly against this state''s own office page''s "Selection Method: Elected" field (not inferred from party tags alone -- see migration header).'),
  ('3b000000-0000-4000-8000-000000000011', 'Andrew Sorrell', 'R', '3a000000-0000-4000-8000-000000000011', 'Auditor of Alabama (real office title in the source: "Alabama Auditor"), took office January 16, 2023. Sourced from Ballotpedia, verified 2026-08-12 directly against this state''s own office page''s "Selection Method: Elected" field (not inferred from party tags alone -- see migration header).'),
  ('3b000000-0000-4000-8000-000000000012', 'Dennis Milligan', 'R', '3a000000-0000-4000-8000-000000000012', 'Auditor of Arkansas (real office title in the source: "Arkansas Auditor of State"), took office January 10, 2023. Sourced from Ballotpedia, verified 2026-08-12 directly against this state''s own office page''s "Selection Method: Elected" field (not inferred from party tags alone -- see migration header).'),
  ('3b000000-0000-4000-8000-000000000013', 'Lydia York', 'D', '3a000000-0000-4000-8000-000000000013', 'Auditor of Delaware (real office title in the source: "Delaware State Auditor"), took office January 3, 2023. Sourced from Ballotpedia, verified 2026-08-12 directly against this state''s own office page''s "Selection Method: Elected" field (not inferred from party tags alone -- see migration header).'),
  ('3b000000-0000-4000-8000-000000000014', 'Rob Sand', 'D', '3a000000-0000-4000-8000-000000000014', 'Auditor of Iowa (real office title in the source: "Iowa Auditor of State"), took office January 1, 2019. Sourced from Ballotpedia, verified 2026-08-12 directly against this state''s own office page''s "Selection Method: Elected" field (not inferred from party tags alone -- see migration header).'),
  ('3b000000-0000-4000-8000-000000000015', 'Allison Ball', 'R', '3a000000-0000-4000-8000-000000000015', 'Auditor of Kentucky (real office title in the source: "Kentucky Auditor of Public Accounts"), took office January 1, 2024. Sourced from Ballotpedia, verified 2026-08-12 directly against this state''s own office page''s "Selection Method: Elected" field (not inferred from party tags alone -- see migration header).'),
  ('3b000000-0000-4000-8000-000000000016', 'Diana DiZoglio', 'D', '3a000000-0000-4000-8000-000000000016', 'Auditor of Massachusetts (real office title in the source: "Massachusetts Auditor of the Commonwealth"), took office January 4, 2023. Sourced from Ballotpedia, verified 2026-08-12 directly against this state''s own office page''s "Selection Method: Elected" field (not inferred from party tags alone -- see migration header).'),
  ('3b000000-0000-4000-8000-000000000017', 'Julie Blaha', 'D', '3a000000-0000-4000-8000-000000000017', 'Auditor of Minnesota (real office title in the source: "Minnesota State Auditor"), took office January 1, 2019. Sourced from Ballotpedia, verified 2026-08-12 directly against this state''s own office page''s "Selection Method: Elected" field (not inferred from party tags alone -- see migration header).'),
  ('3b000000-0000-4000-8000-000000000018', 'Shad White', 'R', '3a000000-0000-4000-8000-000000000018', 'Auditor of Mississippi (real office title in the source: "Mississippi State Auditor"), took office 2018. Exact day/month not given by the source. Sourced from Ballotpedia, verified 2026-08-12 directly against this state''s own office page''s "Selection Method: Elected" field (not inferred from party tags alone -- see migration header).'),
  ('3b000000-0000-4000-8000-000000000019', 'Scott Fitzpatrick', 'R', '3a000000-0000-4000-8000-000000000019', 'Auditor of Missouri (real office title in the source: "Missouri State Auditor"), took office January 9, 2023. Sourced from Ballotpedia, verified 2026-08-12 directly against this state''s own office page''s "Selection Method: Elected" field (not inferred from party tags alone -- see migration header).'),
  ('3b000000-0000-4000-8000-000000000020', 'Mike Foley', 'R', '3a000000-0000-4000-8000-000000000020', 'Auditor of Nebraska (real office title in the source: "Nebraska Auditor of Public Accounts"), took office January 5, 2023. Sourced from Ballotpedia, verified 2026-08-12 directly against this state''s own office page''s "Selection Method: Elected" field (not inferred from party tags alone -- see migration header).'),
  ('3b000000-0000-4000-8000-000000000021', 'Joseph Maestas', 'D', '3a000000-0000-4000-8000-000000000021', 'Auditor of New Mexico (real office title in the source: "New Mexico State Auditor"), took office January 1, 2023. Sourced from Ballotpedia, verified 2026-08-12 directly against this state''s own office page''s "Selection Method: Elected" field (not inferred from party tags alone -- see migration header).'),
  ('3b000000-0000-4000-8000-000000000022', 'Dave Boliek', 'R', '3a000000-0000-4000-8000-000000000022', 'Auditor of North Carolina (real office title in the source: "North Carolina State Auditor"), took office January 1, 2025. Sourced from Ballotpedia, verified 2026-08-12 directly against this state''s own office page''s "Selection Method: Elected" field (not inferred from party tags alone -- see migration header).'),
  ('3b000000-0000-4000-8000-000000000023', 'Josh Gallion', 'R', '3a000000-0000-4000-8000-000000000023', 'Auditor of North Dakota (real office title in the source: "North Dakota State Auditor"), took office December 15, 2016. Sourced from Ballotpedia, verified 2026-08-12 directly against this state''s own office page''s "Selection Method: Elected" field (not inferred from party tags alone -- see migration header).'),
  ('3b000000-0000-4000-8000-000000000024', 'Keith Faber', 'R', '3a000000-0000-4000-8000-000000000024', 'Auditor of Ohio (real office title in the source: "Ohio Auditor of State"), took office January 11, 2019. Sourced from Ballotpedia, verified 2026-08-12 directly against this state''s own office page''s "Selection Method: Elected" field (not inferred from party tags alone -- see migration header).'),
  ('3b000000-0000-4000-8000-000000000025', 'Cindy Byrd', 'R', '3a000000-0000-4000-8000-000000000025', 'Auditor of Oklahoma (real office title in the source: "Oklahoma State Auditor and Inspector"), took office January 1, 2019. Sourced from Ballotpedia, verified 2026-08-12 directly against this state''s own office page''s "Selection Method: Elected" field (not inferred from party tags alone -- see migration header).'),
  ('3b000000-0000-4000-8000-000000000026', 'Timothy DeFoor', 'R', '3a000000-0000-4000-8000-000000000026', 'Auditor of Pennsylvania (real office title in the source: "Pennsylvania Auditor General"), took office January 19, 2021. Sourced from Ballotpedia, verified 2026-08-12 directly against this state''s own office page''s "Selection Method: Elected" field (not inferred from party tags alone -- see migration header).'),
  ('3b000000-0000-4000-8000-000000000027', 'Richard Sattgast', 'R', '3a000000-0000-4000-8000-000000000027', 'Auditor of South Dakota (real office title in the source: "South Dakota State Auditor"), took office January 7, 2019. Sourced from Ballotpedia, verified 2026-08-12 directly against this state''s own office page''s "Selection Method: Elected" field (not inferred from party tags alone -- see migration header).'),
  ('3b000000-0000-4000-8000-000000000028', 'Tina Cannon', 'R', '3a000000-0000-4000-8000-000000000028', 'Auditor of Utah (real office title in the source: "Utah State Auditor"), took office January 6, 2025. Sourced from Ballotpedia, verified 2026-08-12 directly against this state''s own office page''s "Selection Method: Elected" field (not inferred from party tags alone -- see migration header).'),
  ('3b000000-0000-4000-8000-000000000029', 'Doug Hoffer', 'D', '3a000000-0000-4000-8000-000000000029', 'Auditor of Vermont (real office title in the source: "Vermont State Auditor"), took office January 10, 2013. Sourced from Ballotpedia, verified 2026-08-12 directly against this state''s own office page''s "Selection Method: Elected" field (not inferred from party tags alone -- see migration header).'),
  ('3b000000-0000-4000-8000-000000000030', 'Pat McCarthy', 'D', '3a000000-0000-4000-8000-000000000030', 'Auditor of Washington (real office title in the source: "Washington State Auditor"), took office January 11, 2017. Sourced from Ballotpedia, verified 2026-08-12 directly against this state''s own office page''s "Selection Method: Elected" field (not inferred from party tags alone -- see migration header).'),
  ('3b000000-0000-4000-8000-000000000031', 'Mark Hunt', 'R', '3a000000-0000-4000-8000-000000000031', 'Auditor of West Virginia (real office title in the source: "West Virginia State Auditor"), took office January 13, 2025. Sourced from Ballotpedia, verified 2026-08-12 directly against this state''s own office page''s "Selection Method: Elected" field (not inferred from party tags alone -- see migration header).'),
  ('3b000000-0000-4000-8000-000000000032', 'Kristi Racines', 'R', '3a000000-0000-4000-8000-000000000032', 'Auditor of Wyoming (real office title in the source: "Wyoming State Auditor"), took office January 1, 2019. Sourced from Ballotpedia, verified 2026-08-12 directly against this state''s own office page''s "Selection Method: Elected" field (not inferred from party tags alone -- see migration header).');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('3a000000-0000-4000-8000-000000000001', '3b000000-0000-4000-8000-000000000001', '2023-01-02', 'elected'),
  ('3a000000-0000-4000-8000-000000000002', '3b000000-0000-4000-8000-000000000002', '2023-01-04', 'elected'),
  ('3a000000-0000-4000-8000-000000000003', '3b000000-0000-4000-8000-000000000003', '2012-10-15', 'elected'),
  ('3a000000-0000-4000-8000-000000000004', '3b000000-0000-4000-8000-000000000004', '2016-12-05', 'elected'),
  ('3a000000-0000-4000-8000-000000000005', '3b000000-0000-4000-8000-000000000005', '2023-12-01', 'elected'),
  ('3a000000-0000-4000-8000-000000000006', '3b000000-0000-4000-8000-000000000006', '2023-01-16', 'elected'),
  ('3a000000-0000-4000-8000-000000000007', '3b000000-0000-4000-8000-000000000007', '2023-01-02', 'elected'),
  ('3a000000-0000-4000-8000-000000000008', '3b000000-0000-4000-8000-000000000008', '2007-02-07', 'elected'),
  ('3a000000-0000-4000-8000-000000000009', '3b000000-0000-4000-8000-000000000009', '2023-05-12', 'elected'),
  ('3a000000-0000-4000-8000-000000000010', '3b000000-0000-4000-8000-000000000010', '2026-08-01', 'elected'),
  ('3a000000-0000-4000-8000-000000000011', '3b000000-0000-4000-8000-000000000011', '2023-01-16', 'elected'),
  ('3a000000-0000-4000-8000-000000000012', '3b000000-0000-4000-8000-000000000012', '2023-01-10', 'elected'),
  ('3a000000-0000-4000-8000-000000000013', '3b000000-0000-4000-8000-000000000013', '2023-01-03', 'elected'),
  ('3a000000-0000-4000-8000-000000000014', '3b000000-0000-4000-8000-000000000014', '2019-01-01', 'elected'),
  ('3a000000-0000-4000-8000-000000000015', '3b000000-0000-4000-8000-000000000015', '2024-01-01', 'elected'),
  ('3a000000-0000-4000-8000-000000000016', '3b000000-0000-4000-8000-000000000016', '2023-01-04', 'elected'),
  ('3a000000-0000-4000-8000-000000000017', '3b000000-0000-4000-8000-000000000017', '2019-01-01', 'elected'),
  ('3a000000-0000-4000-8000-000000000018', '3b000000-0000-4000-8000-000000000018', '2018-01-01', 'elected'),
  ('3a000000-0000-4000-8000-000000000019', '3b000000-0000-4000-8000-000000000019', '2023-01-09', 'elected'),
  ('3a000000-0000-4000-8000-000000000020', '3b000000-0000-4000-8000-000000000020', '2023-01-05', 'elected'),
  ('3a000000-0000-4000-8000-000000000021', '3b000000-0000-4000-8000-000000000021', '2023-01-01', 'elected'),
  ('3a000000-0000-4000-8000-000000000022', '3b000000-0000-4000-8000-000000000022', '2025-01-01', 'elected'),
  ('3a000000-0000-4000-8000-000000000023', '3b000000-0000-4000-8000-000000000023', '2016-12-15', 'elected'),
  ('3a000000-0000-4000-8000-000000000024', '3b000000-0000-4000-8000-000000000024', '2019-01-11', 'elected'),
  ('3a000000-0000-4000-8000-000000000025', '3b000000-0000-4000-8000-000000000025', '2019-01-01', 'elected'),
  ('3a000000-0000-4000-8000-000000000026', '3b000000-0000-4000-8000-000000000026', '2021-01-19', 'elected'),
  ('3a000000-0000-4000-8000-000000000027', '3b000000-0000-4000-8000-000000000027', '2019-01-07', 'elected'),
  ('3a000000-0000-4000-8000-000000000028', '3b000000-0000-4000-8000-000000000028', '2025-01-06', 'elected'),
  ('3a000000-0000-4000-8000-000000000029', '3b000000-0000-4000-8000-000000000029', '2013-01-10', 'elected'),
  ('3a000000-0000-4000-8000-000000000030', '3b000000-0000-4000-8000-000000000030', '2017-01-11', 'elected'),
  ('3a000000-0000-4000-8000-000000000031', '3b000000-0000-4000-8000-000000000031', '2025-01-13', 'elected'),
  ('3a000000-0000-4000-8000-000000000032', '3b000000-0000-4000-8000-000000000032', '2019-01-01', 'elected');
